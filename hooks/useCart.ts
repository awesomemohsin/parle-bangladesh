"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

export interface CartItem {
  productId: string;
  productSlug: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
  weight?: string;
  flavor?: string;
  stock?: number;
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
  if (!item) return null;

  // Resilience: Try all possible ID and Slug fields
  const productId = String(
    item.productId || 
    item._id || 
    item.id || 
    item.productSlug || 
    item.slug || 
    ""
  ).trim();

  const productSlug = String(
    item.productSlug || 
    item.slug || 
    productId || 
    ""
  ).trim();

  const productName = String(
    item.productName || 
    item.name || 
    "Product"
  ).trim();

  const price = Number(item.price);
  const quantity = Number(item.quantity || 1);

  if (
    !productId ||
    Number.isNaN(price) ||
    Number.isNaN(quantity) ||
    quantity < 0
  ) {
    console.error("Cart item normalization failed block:", { productId, price, quantity, item });
    return null;
  }

  return {
    productId,
    productSlug,
    productName,
    price,
    quantity,
    image: item.image || "",
    weight: item.weight || "",
    flavor: item.flavor || "",
    stock: item.stock !== undefined ? Number(item.stock) : undefined,
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

let isFetchingDB = false;

export function useCart() {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0, itemCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initCart = async () => {
      // 1. Load from LocalStorage immediately for instant UI
      const savedCart = typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null;
      let initialCart: Cart = { items: [], total: 0, itemCount: 0 };
      
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
          initialCart.items = rawItems
            .map((item: any) => normalizeItem(item))
            .filter((item: CartItem | null): item is CartItem => item !== null);
          initialCart = { ...initialCart, ...calculateTotals(initialCart.items), promoCode: parsed.promoCode, discountAmount: parsed.discountAmount };
          setCart(initialCart);
        } catch (error) {
          console.error("Failed to parse cart:", error);
        }
      }

      // 2. If logged in and haven't synced with DB in this session, fetch and merge
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const alreadySynced = typeof window !== "undefined" ? sessionStorage.getItem("cart_synced") === "true" : false;

      if (token && !alreadySynced && !isFetchingDB) {
        isFetchingDB = true;
        try {
          const res = await fetch("/api/cart", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const dbItems = (data.items || []).map((i: any) => normalizeItem(i)).filter((i: any): i is CartItem => i !== null);
            
            // Merge logic: Keep local items, add DB items that don't exist locally
            setCart(prev => {
              const localKeys = new Set(prev.items.map(i => getItemKey(i)));
              const uniqueDBItems = dbItems.filter((i: CartItem) => !localKeys.has(getItemKey(i)));
              
              if (uniqueDBItems.length === 0 && !data.promoCode) return prev; // No changes
              
              const mergedItems = [...prev.items, ...uniqueDBItems];
              const mergedPromo = prev.promoCode || data.promoCode;
              const mergedDiscount = prev.discountAmount || data.discountAmount;
              
              sessionStorage.setItem("cart_synced", "true");
              return { 
                ...calculateTotals(mergedItems), 
                promoCode: mergedPromo, 
                discountAmount: mergedDiscount 
              };
            });
          }
        } catch (e) {
          console.error("DB Cart fetch failed:", e);
        } finally {
          isFetchingDB = false;
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
      
      if (prevStr !== newStr) {
        localStorage.setItem(CART_STORAGE_KEY, newStr);
        // Only notify others if we actually changed something meaningful
        notifyGlobalListeners(cart);
      }
      
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token && prevStr !== newStr) {
        // Debounce or at least delay slightly to avoid spamming
        const timer = setTimeout(() => {
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
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [cart, isLoading]);

  // Optimized: Use memoization for heavy calculations
  const total = useMemo(() => cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart.items]);
  const subtotal = useMemo(() => cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart.items]);
  const itemCount = useMemo(() => cart.items.reduce((sum, item) => sum + item.quantity, 0), [cart.items]);
  const finalTotal = useMemo(() => Math.max(0, subtotal - (cart.discountAmount || 0)), [subtotal, cart.discountAmount]);

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
      console.log("addItem triggered with:", { item, quantity });
      setCart((prevCart) => {
        const normalized = normalizeItem({
          ...item,
          quantity: item.quantity ?? quantity,
        });

        if (!normalized) {
          console.error("Item normalization failed - check price and ID");
          return prevCart;
        }

        const itemKey = getItemKey(normalized);
        const existingIdx = prevCart.items.findIndex((i) => itemMatchesKey(i, itemKey));
        
        let newItems = [...prevCart.items];
  
        if (existingIdx > -1) {
          const existing = newItems[existingIdx];
          let nextQty = existing.quantity + normalized.quantity;
          
          // Use normalized stock if available
          const stockCap = normalized.stock !== undefined ? normalized.stock : 999;
          if (nextQty > stockCap) {
            nextQty = stockCap;
          }
          
          newItems[existingIdx] = { ...existing, quantity: nextQty };
        } else {
          const stockCap = normalized.stock !== undefined ? normalized.stock : 999;
          if (normalized.quantity > stockCap) {
            normalized.quantity = stockCap;
          }
          if (normalized.quantity > 0) {
            newItems.push(normalized);
          }
        }

        const updated = { ...prevCart, ...calculateTotals(newItems) };
        console.log("Cart updated. New count:", updated.itemCount);
        return updated;
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

        const newItems = prevCart.items.map((i) => {
          if (itemMatchesKey(i, key)) {
            let nextQuantity = quantity;
            if (i.stock !== undefined && nextQuantity > i.stock) {
                nextQuantity = i.stock;
            }
            return { ...i, quantity: nextQuantity };
          }
          return i;
        });
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
    total: finalTotal, // Use memoized final total
    itemCount,
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
