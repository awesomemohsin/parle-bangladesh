"use client";

import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  productId: string;
  productSlug: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface AddCartItemInput {
  productId?: string;
  id?: string;
  productSlug?: string;
  slug?: string;
  productName?: string;
  name?: string;
  price: number;
  image?: string;
  quantity?: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
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
  };
}

function itemMatchesKey(item: CartItem, key: string): boolean {
  return item.productSlug === key || item.productId === key;
}

export function useCart() {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0, itemCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
        const items = rawItems
          .map((item: any) => normalizeItem(item))
          .filter((item: CartItem | null): item is CartItem => item !== null);
        setCart(calculateTotals(items));
      } catch (error) {
        console.error("Failed to parse cart:", error);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
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

        const existingItem = prevCart.items.find((i) =>
          itemMatchesKey(i, normalized.productSlug),
        );
        let newItems: CartItem[];

        if (existingItem) {
          newItems = prevCart.items.map((i) =>
            itemMatchesKey(i, normalized.productSlug)
              ? { ...i, quantity: i.quantity + normalized.quantity }
              : i,
          );
        } else {
          newItems = [...prevCart.items, normalized];
        }

        return calculateTotals(newItems);
      });
    },
    [calculateTotals],
  );

  const removeItem = useCallback(
    (productId: string) => {
      setCart((prevCart) => {
        const newItems = prevCart.items.filter(
          (i) => !itemMatchesKey(i, productId),
        );
        return calculateTotals(newItems);
      });
    },
    [calculateTotals],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      setCart((prevCart) => {
        if (quantity <= 0) {
          const newItems = prevCart.items.filter(
            (i) => !itemMatchesKey(i, productId),
          );
          return calculateTotals(newItems);
        }

        const newItems = prevCart.items.map((i) =>
          itemMatchesKey(i, productId) ? { ...i, quantity } : i,
        );
        return calculateTotals(newItems);
      });
    },
    [calculateTotals],
  );

  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0, itemCount: 0 });
  }, []);

  return {
    cart,
    items: cart.items,
    total: cart.total,
    itemCount: cart.itemCount,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}
