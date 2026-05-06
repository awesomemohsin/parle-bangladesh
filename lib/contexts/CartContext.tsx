"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

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

interface CartContextType {
  cart: Cart;
  items: CartItem[];
  total: number;
  itemCount: number;
  promoCode?: string;
  discountAmount?: number;
  isLoading: boolean;
  addItem: (item: AddCartItemInput, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  applyPromo: (promoCode: string, discountAmount: number) => void;
  removePromo: () => void;
  clearCart: () => void;
}

const CART_STORAGE_KEY = "parle-cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper functions moved outside for cleaner code
function calculateTotals(items: CartItem[]): { total: number; itemCount: number } {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { total, itemCount };
}

function normalizeItem(item: any): CartItem | null {
  if (!item) return null;
  const productId = String(item.productId || item._id || item.id || "").trim();
  const productSlug = String(item.productSlug || item.slug || "").trim();
  const productName = String(item.productName || item.name || "Product").trim();
  const price = Number(item.price);
  const quantity = Number(item.quantity || 1);

  if (!productId || Number.isNaN(price) || Number.isNaN(quantity) || quantity < 0) {
    console.error("Cart item normalization failed:", { productId, price, quantity, item });
    return null;
  }

  return {
    productId, productSlug, productName, price, quantity,
    image: item.image || "",
    weight: item.weight || "",
    flavor: item.flavor || "",
    stock: item.stock !== undefined ? Number(item.stock) : undefined,
  };
}

export function getItemKey(item: any): string {
  if (typeof item === "string") return item;
  const id = item.productId || item.id;
  const weight = item.weight || "";
  const flavor = item.flavor || "";
  const priceSuffix = (!weight && !flavor && item.price) ? `-${item.price}` : "";
  return `${id}-${weight}-${flavor}${priceSuffix}`;
}

function itemMatchesKey(item: CartItem, key: string): boolean {
  return getItemKey(item) === key;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Initialize state with a function to try and get data immediately on client
  const [cart, setCart] = useState<Cart>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
          const normalizedItems = rawItems
            .map((item: any) => normalizeItem(item))
            .filter((item: CartItem | null): item is CartItem => item !== null);
          
          return {
            items: normalizedItems,
            ...calculateTotals(normalizedItems),
            promoCode: parsed.promoCode,
            discountAmount: parsed.discountAmount
          };
        } catch (e) {
          console.error("Cart initial parse failed:", e);
        }
      }
    }
    return { items: [], total: 0, itemCount: 0 };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 1. Handle Mounting & PageShow
  const syncFromStorage = useCallback(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
        const normalizedItems = rawItems
          .map((item: any) => normalizeItem(item))
          .filter((item: CartItem | null): item is CartItem => item !== null);
        
        setCart({
          items: normalizedItems,
          ...calculateTotals(normalizedItems),
          promoCode: parsed.promoCode,
          discountAmount: parsed.discountAmount
        });
      } catch (e) {
        console.error("Cart sync parse failed:", e);
      }
    }
    setIsInitialized(true);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    syncFromStorage();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) syncFromStorage();
    };

    const handlePageShow = () => syncFromStorage();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncFromStorage();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("visibilitychange", handleVisibility);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncFromStorage]);

  // 2. Sync with DB ONLY after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const syncDB = async () => {
      const token = localStorage.getItem("token");
      const alreadySynced = sessionStorage.getItem("cart_synced") === "true";

      if (token && !alreadySynced) {
        try {
          const res = await fetch("/api/cart", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const dbItems = (data.items || []).map((i: any) => normalizeItem(i)).filter((i: any): i is CartItem => i !== null);
            
            setCart(prev => {
              const dbItemMap = new Map(dbItems.map(i => [getItemKey(i), i]));
              const localKeys = new Set(prev.items.map(i => getItemKey(i)));
              
              // Update local items with DB prices/stock if they exist in DB
              const updatedLocalItems = prev.items.map(item => {
                const key = getItemKey(item);
                const dbItem = dbItemMap.get(key);
                if (dbItem) {
                  return { ...item, price: dbItem.price, stock: dbItem.stock };
                }
                return item;
              });

              // Add items from DB that aren't in local cart
              const uniqueDBItems = dbItems.filter((i: CartItem) => !localKeys.has(getItemKey(i)));
              
              const mergedItems = [...updatedLocalItems, ...uniqueDBItems];
              sessionStorage.setItem("cart_synced", "true");
              return { 
                items: mergedItems,
                ...calculateTotals(mergedItems), 
                promoCode: prev.promoCode || data.promoCode, 
                discountAmount: prev.discountAmount || data.discountAmount 
              };
            });
          }
        } catch (e) {
          console.error("DB Sync failed:", e);
        }
      }
    };

    syncDB();
  }, [isInitialized, user?.customerType]);

  // Trigger re-sync on auth change
  useEffect(() => {
    if (user?.id) {
      sessionStorage.removeItem("cart_synced");
    }
  }, [user?.id, user?.customerType]);

  // 3. Persist to LocalStorage & DB on changes
  useEffect(() => {
    if (!isInitialized) return;

    const newStr = JSON.stringify(cart);
    localStorage.setItem(CART_STORAGE_KEY, newStr);

    const token = localStorage.getItem("token");
    if (token) {
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
        }).catch(err => console.error("DB Save failed:", err));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cart, isInitialized]);

  const addItem = useCallback((item: AddCartItemInput, quantity: number = 1) => {
    setCart(prev => {
      const normalized = normalizeItem({ ...item, quantity: item.quantity ?? quantity });
      if (!normalized) return prev;

      const itemKey = getItemKey(normalized);
      const existingIdx = prev.items.findIndex(i => itemMatchesKey(i, itemKey));
      let newItems = [...prev.items];

      if (existingIdx > -1) {
        const existing = newItems[existingIdx];
        const nextQty = Math.min(normalized.stock || 999, existing.quantity + normalized.quantity);
        newItems[existingIdx] = { ...existing, quantity: nextQty };
      } else {
        const nextQty = Math.min(normalized.stock || 999, normalized.quantity);
        if (nextQty > 0) newItems.push({ ...normalized, quantity: nextQty });
      }

      return { ...prev, items: newItems, ...calculateTotals(newItems) };
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(i => !itemMatchesKey(i, key));
      return { ...prev, items: newItems, ...calculateTotals(newItems) };
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setCart(prev => {
      if (quantity <= 0) {
        const newItems = prev.items.filter(i => !itemMatchesKey(i, key));
        return { ...prev, items: newItems, ...calculateTotals(newItems) };
      }
      const newItems = prev.items.map(i => {
        if (itemMatchesKey(i, key)) {
          return { ...i, quantity: Math.min(i.stock || 999, quantity) };
        }
        return i;
      });
      return { ...prev, items: newItems, ...calculateTotals(newItems) };
    });
  }, []);

  const applyPromo = useCallback((promoCode: string, discountAmount: number) => {
    setCart(prev => ({ ...prev, promoCode, discountAmount }));
  }, []);

  const removePromo = useCallback(() => {
    setCart(prev => ({ ...prev, promoCode: undefined, discountAmount: undefined }));
  }, []);

  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0, itemCount: 0 });
  }, []);

  const subtotal = useMemo(() => cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart.items]);
  const finalTotal = useMemo(() => Math.max(0, subtotal - (cart.discountAmount || 0)), [subtotal, cart.discountAmount]);

  const value = {
    cart,
    items: isMounted ? cart.items : [],
    total: isMounted ? finalTotal : 0,
    itemCount: isMounted ? cart.itemCount : 0,
    promoCode: isMounted ? cart.promoCode : undefined,
    discountAmount: isMounted ? cart.discountAmount : undefined,
    isLoading: !isMounted || isLoading,
    addItem,
    removeItem,
    updateQuantity,
    applyPromo,
    removePromo,
    clearCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
