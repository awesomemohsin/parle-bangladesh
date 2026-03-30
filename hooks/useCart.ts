"use client";

import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  productId: string;
  productSlug: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
  weight?: string;
  flavor?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
  promoCode?: string;
  discountAmount?: number;
}

export type AddCartItemInput = Partial<CartItem> & { 
  price: number; 
  productSlug?: string;
  productId?: string;
}

const CART_STORAGE_KEY = "parle-cart";

function normalizeItem(item: any): CartItem | null {
  const productSlug = String(
    item.productSlug || item.slug || item.productId || item.id || "",
  ).trim();
  const productId = String(item.productId || item.id || productSlug).trim();
  const productName = String(item.productName || item.name || "Product").trim();
  const price = Number(item.price);
  const quantity = Number(item.quantity);

  if (
    !productSlug ||
    !productId ||
    Number.isNaN(price) ||
    Number.isNaN(quantity) ||
    quantity <= 0
  ) {
    return null;
  }

  return {
    productId,
    productSlug,
    productName,
    price,
    quantity,
    image: item.image,
    weight: item.weight,
    flavor: item.flavor,
  };
}

export function getItemKey(item: { productId: string; weight?: string; flavor?: string; price?: number } | string | any): string {
  if (typeof item === "string") return item;
  const id = item.productId || item.id || item.productSlug;
  const weight = item.weight || "";
  const flavor = item.flavor || "";
  const priceSuffix = (!weight && !flavor && item.price) ? `-${item.price}` : "";
  return `${id}-${weight}-${flavor}${priceSuffix}`;
}

function itemMatchesKey(item: CartItem, key: string): boolean {
  return getItemKey(item) === key;
}

let globalListeners: Array<(c: Cart) => void> = [];
function notifyGlobalListeners(cart: Cart) {
  globalListeners.forEach((listener) => listener(cart));
}

export function useCart() {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0, itemCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initCart = async () => {
      let dbItems: CartItem[] | null = null;
      let dbPromo: string | undefined;
      let dbDiscount: number | undefined;

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      
      if (token) {
        try {
          const res = await fetch("/api/cart", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              dbItems = data.items;
              dbPromo = data.promoCode;
              dbDiscount = data.discountAmount;
            }
          }
        } catch (error) {
          console.error("Failed to parse DB cart:", error);
        }
      }

      if (dbItems) {
        const items = dbItems
          .map((item: any) => normalizeItem(item))
          .filter((item: CartItem | null): item is CartItem => item !== null);
        setCart({ ...calculateTotals(items), promoCode: dbPromo, discountAmount: dbDiscount });
      } else {
        const savedCart = typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null;
        if (savedCart) {
          try {
            const parsed = JSON.parse(savedCart);
            const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
            const items = rawItems
              .map((item: any) => normalizeItem(item))
              .filter((item: CartItem | null): item is CartItem => item !== null);
            setCart({ ...calculateTotals(items), promoCode: parsed.promoCode, discountAmount: parsed.discountAmount });
          } catch (error) {
            console.error("Failed to parse cart:", error);
          }
        }
      }
      setIsLoading(false);
    };

    initCart();

    const listener = (c: Cart) => setCart(c);
    globalListeners.push(listener);
    return () => {
      globalListeners = globalListeners.filter((l) => l !== listener);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const newStr = JSON.stringify(cart);
      const prevStr = localStorage.getItem(CART_STORAGE_KEY);
      
      if (prevStr === newStr) return; 
      
      localStorage.setItem(CART_STORAGE_KEY, newStr);
      notifyGlobalListeners(cart);
      
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        fetch("/api/cart", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ 
            items: cart.items,
            promoCode: cart.promoCode,
            discountAmount: cart.discountAmount
          })
        }).catch(err => console.error("Failed syncing cart to DB:", err));
      }
    }
  }, [cart, isLoading]);

  const calculateTotals = useCallback((items: CartItem[]): Cart => {
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    return { items, total, itemCount };
  }, []);

  const addItem = useCallback(
    (item: AddCartItemInput, quantity: number = 1) => {
      setCart((prevCart) => {
        const normalized = normalizeItem({
          ...item,
          quantity: item.quantity ?? quantity,
        });

        if (!normalized) return prevCart;

        const itemKey = getItemKey(normalized);
        const existingItem = prevCart.items.find((i) =>
          itemMatchesKey(i, itemKey),
        );
        let newItems: CartItem[];
 
        if (existingItem) {
          newItems = prevCart.items.map((i) =>
            itemMatchesKey(i, itemKey)
              ? { ...i, quantity: i.quantity + normalized.quantity }
              : i,
          );
        } else {
          newItems = [...prevCart.items, normalized];
        }

        return { ...prevCart, ...calculateTotals(newItems) };
      });
    },
    [calculateTotals],
  );

  const removeItem = useCallback(
    (key: string) => {
      setCart((prevCart) => {
        const newItems = prevCart.items.filter(
          (i) => !itemMatchesKey(i, key),
        );
        return { ...prevCart, ...calculateTotals(newItems) };
      });
    },
    [calculateTotals],
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      setCart((prevCart) => {
        if (quantity <= 0) {
          const newItems = prevCart.items.filter(
            (i) => !itemMatchesKey(i, key),
          );
          return { ...prevCart, ...calculateTotals(newItems) };
        }

        const newItems = prevCart.items.map((i) =>
          itemMatchesKey(i, key) ? { ...i, quantity } : i,
        );
        return { ...prevCart, ...calculateTotals(newItems) };
      });
    },
    [calculateTotals],
  );

  const applyPromo = useCallback((promoCode: string, discountAmount: number) => {
    setCart(prev => ({ ...prev, promoCode, discountAmount }));
  }, []);

  const removePromo = useCallback(() => {
    setCart(prev => ({ ...prev, promoCode: undefined, discountAmount: undefined }));
  }, []);

  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0, itemCount: 0 });
  }, []);

  return {
    cart,
    items: cart.items,
    total: cart.total,
    itemCount: cart.itemCount,
    promoCode: cart.promoCode,
    discountAmount: cart.discountAmount,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    applyPromo,
    removePromo,
    clearCart,
  };
}
