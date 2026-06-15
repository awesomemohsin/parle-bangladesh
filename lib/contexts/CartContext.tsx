"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  discountAmount?: number;
  discountedPrice?: number;
  discountedTotal?: number;
  variationDiscountPrice?: number;
}

export interface PromoDetails {
  code?: string;
  type: 'promo' | 'flat';
  discountType: 'fixed' | 'percentage';
  discountAmount: number;
  maxDiscountAmount?: number;
  allProducts: boolean;
  applicableProducts: string[];
  applicableVariations?: string[];
  minOrderAmount?: number;
  freeShipping?: boolean;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  promoCode?: string;
  discountAmount?: number;
  subtotal: number;
  total: number;
  promoDetails?: PromoDetails;
  promoDiscount?: number;
  ruleDiscount?: number;
  isRestricted?: boolean;
  applicableSubtotal?: number;
  freeShippingGranted?: boolean;
  campaignNotices?: Array<{ offer: string; action: string }>;
  flatRules?: any[];
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
  subtotal: number;
  itemCount: number;
  promoCode?: string;
  discountAmount?: number;
  promoDiscount?: number;
  ruleDiscount?: number;
  promoDetails?: PromoDetails;
  isRestricted?: boolean;
  applicableSubtotal?: number;
  freeShippingGranted?: boolean;
  campaignNotices: Array<{ offer: string; action: string }>;
  isLoading: boolean;
  isSyncing: boolean;
  addItem: (item: AddCartItemInput, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  applyPromo: (details: PromoDetails) => void;
  removePromo: () => void;
  clearCart: () => void;
  getItemDiscount: (item: CartItem) => number;
}

const CART_STORAGE_KEY = "parle-cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

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
    discountAmount: item.discountAmount !== undefined ? Number(item.discountAmount) : undefined,
    discountedPrice: item.discountedPrice !== undefined ? Number(item.discountedPrice) : undefined,
    discountedTotal: item.discountedTotal !== undefined ? Number(item.discountedTotal) : undefined,
    variationDiscountPrice: item.variationDiscountPrice !== undefined ? Number(item.variationDiscountPrice) : undefined,
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

export function itemMatchesKey(item: CartItem, key: string): boolean {
  return getItemKey(item) === key;
}

function calculateClientSideTotals(
  items: CartItem[],
  promoCode?: string,
  promoDetails?: PromoDetails,
  flatRules: any[] = [],
  user: any = null
) {
  const isDealer = user && (user.role === 'owner' || (user.role === 'customer' && user.customerType === 'dealer'));
  const isRetailer = user && user.role === 'customer' && user.customerType === 'retailer';
  const isPrivilegedCustomer = isDealer || isRetailer;

  // 1. Fetch user discount if applicable
  let userDiscount: { percent: number; expiresAt: Date } | undefined = undefined;
  if (!isPrivilegedCustomer && user && user.flatDiscountPercent && user.flatDiscountExpiresAt) {
    const expiresAt = new Date(user.flatDiscountExpiresAt);
    if (expiresAt > new Date()) {
      userDiscount = {
        percent: user.flatDiscountPercent,
        expiresAt
      };
    }
  }

  // 2. Subtotal of items (using item.price)
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price || 0) * (item.quantity || 0);
  }, 0);

  let freeShippingGranted = false;
  let flatDiscountTotal = 0;
  const ruleUsage = new Map<string, number>();

  // Pre-calculate subtotal of targeted products for each flat discount rule
  const ruleSubtotals = new Map<string, number>();
  
  // Filter active flat rules if user is not a dealer or retailer
  const activeFlatRules = isPrivilegedCustomer ? [] : (flatRules || []);

  activeFlatRules.forEach(rule => {
    let ruleSubtotal = 0;
    items.forEach(item => {
      const pId = item.productId;
      const itemVarKey = `${pId}:${(item.weight || '').toString().trim().toLowerCase()}:${(item.flavor || '').toString().trim().toLowerCase()}`;
      
      const applies = rule.allProducts || (
        rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === pId) && (
          !rule.applicableVariations ||
          rule.applicableVariations.length === 0 ||
          rule.applicableVariations.map((v: string) => v.trim().toLowerCase()).includes(itemVarKey.trim().toLowerCase())
        )
      );
      
      if (applies) {
        ruleSubtotal += (item.price || 0) * (item.quantity || 0);
      }
    });
    ruleSubtotals.set(rule._id ? rule._id.toString() : String(rule.id || ''), ruleSubtotal);
  });

  // Calculate Best Flat Discount per item (variation vs user vs campaign flat)
  const updatedItems = items.map(item => {
    const productId = item.productId;
    const itemPrice = Number(item.price) || 0;
    const itemQuantity = Number(item.quantity) || 0;
    const originalItemSubtotal = itemPrice * itemQuantity;

    // 1. Candidate A: Variation Discount
    const variationDiscountAmount = (!isPrivilegedCustomer && item.variationDiscountPrice && item.variationDiscountPrice > 0 && item.variationDiscountPrice < itemPrice)
      ? (itemPrice - item.variationDiscountPrice) * itemQuantity
      : 0;

    // 2. Candidate B: User Discount
    let userDiscountAmount = 0;
    if (userDiscount && userDiscount.percent > 0) {
      userDiscountAmount = (originalItemSubtotal * userDiscount.percent) / 100;
      userDiscountAmount = Math.min(originalItemSubtotal, userDiscountAmount);
    }

    let bestRuleId = null;
    let bestDiscountForItem = 0;

    // Initialize with Variation Discount
    if (variationDiscountAmount > 0) {
      bestDiscountForItem = variationDiscountAmount;
      bestRuleId = 'variation-discount';
    }

    // Compare with User Discount
    if (userDiscount && userDiscountAmount > bestDiscountForItem) {
      bestDiscountForItem = userDiscountAmount;
      bestRuleId = `user-flat-${userDiscount.percent}`;
    }

    // Compare with Campaign-based Flat Discounts
    activeFlatRules.forEach(rule => {
      const itemVarKey = `${productId}:${(item.weight || '').toString().trim().toLowerCase()}:${(item.flavor || '').toString().trim().toLowerCase()}`;
      const appliesToProduct = rule.allProducts || (
        rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === productId) && (
          !rule.applicableVariations ||
          rule.applicableVariations.length === 0 ||
          rule.applicableVariations.map((v: string) => v.trim().toLowerCase()).includes(itemVarKey.trim().toLowerCase())
        )
      );
      const ruleKey = rule._id ? rule._id.toString() : String(rule.id || '');
      const applicableSubtotal = ruleSubtotals.get(ruleKey) || 0;
      const minOrderMet = applicableSubtotal >= (Number(rule.minOrderAmount) || 0);

      if (appliesToProduct && minOrderMet) {
        let currentDiscount = 0;
        const amount = Number(rule.discountAmount || 0);

        if (rule.discountType === 'percentage') {
          currentDiscount = (originalItemSubtotal * amount) / 100;
        } else {
          currentDiscount = amount * itemQuantity;
        }
        
        currentDiscount = Math.min(originalItemSubtotal, currentDiscount);

        if (currentDiscount > bestDiscountForItem) {
          bestDiscountForItem = currentDiscount;
          bestRuleId = ruleKey;
        }

        // Track free shipping granted by active, qualified flat rules
        if (rule.freeShipping) {
          freeShippingGranted = true;
        }
      }
    });

    const updatedItem = { ...item };
    
    if (bestRuleId && bestDiscountForItem > 0) {
      if (bestRuleId === 'variation-discount' || bestRuleId.startsWith('user-flat-')) {
        flatDiscountTotal += bestDiscountForItem;
      } else {
        const currentRuleTotal = ruleUsage.get(bestRuleId) || 0;
        ruleUsage.set(bestRuleId, currentRuleTotal + bestDiscountForItem);
        (updatedItem as any)._appliedRuleId = bestRuleId;
      }
    }

    // Attach calculated discount info
    updatedItem.discountAmount = bestDiscountForItem;
    updatedItem.discountedPrice = itemQuantity > 0 ? Math.round((originalItemSubtotal - bestDiscountForItem) / itemQuantity) : itemPrice;
    updatedItem.discountedTotal = Math.round(originalItemSubtotal - bestDiscountForItem);

    return updatedItem;
  });

  // Apply max caps to each rule's total discount and prepare scaling factors
  const capScalingFactors = new Map<string, number>();

  activeFlatRules.forEach(rule => {
    const ruleId = rule._id ? rule._id.toString() : String(rule.id || '');
    const usedAmount = ruleUsage.get(ruleId) || 0;
    const maxCap = Number(rule.maxDiscountAmount || 0);
    
    if (maxCap > 0 && usedAmount > maxCap) {
      flatDiscountTotal += maxCap;
      capScalingFactors.set(ruleId, maxCap / usedAmount);
    } else {
      flatDiscountTotal += usedAmount;
    }
  });

  // Scale down item-level discounts if the rule cap was exceeded
  const finalItems = updatedItems.map(item => {
    const ruleId = (item as any)._appliedRuleId;
    if (ruleId && capScalingFactors.has(ruleId)) {
      const scale = capScalingFactors.get(ruleId)!;
      item.discountAmount = (item.discountAmount || 0) * scale;

      const itemPrice = Number(item.price) || 0;
      const itemQuantity = Number(item.quantity) || 0;
      const originalItemSubtotal = itemPrice * itemQuantity;

      item.discountedPrice = itemQuantity > 0 ? Math.round((originalItemSubtotal - item.discountAmount) / itemQuantity) : itemPrice;
      item.discountedTotal = Math.round(originalItemSubtotal - item.discountAmount);
    }
    delete (item as any)._appliedRuleId;
    return item;
  });

  // Calculate Promo Discount (stacks on top of remaining total)
  let promoDiscount = 0;
  let applicableSubtotal = 0;

  if (promoDetails && !isDealer) {
    const remainingTotal = subtotal - flatDiscountTotal;
    
    // Check if minimum order amount is met
    const currentMinOrder = Number(promoDetails.minOrderAmount || 0);
    if (currentMinOrder > 0 && remainingTotal < currentMinOrder) {
      applicableSubtotal = 0;
    } else if (promoDetails.allProducts === true) {
      applicableSubtotal = subtotal;
    } else {
      const restrictedIds = (promoDetails.applicableProducts || [])
        .map((id: any) => id?.toString()?.trim()?.toLowerCase())
        .filter(Boolean);
      
      const applicableVariations = promoDetails.applicableVariations || [];
      
      if (restrictedIds.length > 0) {
        finalItems.forEach(item => {
          const possibleIds = [
            item.productId,
            item.productSlug
          ].map(id => id?.toString()?.trim()?.toLowerCase()).filter(Boolean);
          
          const isMatch = possibleIds.some(id => restrictedIds.includes(id));
          if (isMatch) {
             const itemVarKey = `${item.productId}:${(item.weight || '').toString().trim().toLowerCase()}:${(item.flavor || '').toString().trim().toLowerCase()}`;
             const isVarMatch = applicableVariations.length === 0 || 
               applicableVariations.map((v: string) => v.trim().toLowerCase()).includes(itemVarKey.trim().toLowerCase());
               
             if (isVarMatch) {
               const itemPrice = Number(item.price) || 0;
               const itemDiscountedPrice = item.discountedPrice !== undefined ? item.discountedPrice : itemPrice;
               applicableSubtotal += itemDiscountedPrice * (Number(item.quantity) || 0);
             }
          }
        });
      } else {
        applicableSubtotal = 0;
      }
    }

    if (applicableSubtotal > 0) {
      const amount = Number(promoDetails.discountAmount || 0);
      if (amount > 0) {
        if (promoDetails.discountType === 'percentage') {
          promoDiscount = (applicableSubtotal * amount) / 100;
          
          // Apply max discount cap if set
          const maxCap = Number(promoDetails.maxDiscountAmount || 0);
          if (maxCap > 0 && promoDiscount > maxCap) {
            promoDiscount = maxCap;
          }
        } else {
          promoDiscount = Math.min(applicableSubtotal, amount);
        }
        
        // Final cap: Cannot exceed remaining balance
        promoDiscount = Math.min(remainingTotal, promoDiscount);
      }
    }

    if (promoDetails.freeShipping) {
      freeShippingGranted = true;
    }
  }

  const totalDiscount = flatDiscountTotal + promoDiscount;
  const total = subtotal - totalDiscount;

  // Calculate dynamic campaign progress notices
  const campaignNotices: Array<{ offer: string; action: string; unlocked?: boolean }> = [];

  activeFlatRules.forEach(rule => {
    const minOrder = Number(rule.minOrderAmount || 0);
    if (minOrder <= 0) return;

    const targetedItems = finalItems.filter(item => {
      const pId = item.productId;
      const itemVarKey = `${pId}:${(item.weight || '').toString().trim().toLowerCase()}:${(item.flavor || '').toString().trim().toLowerCase()}`;
      return rule.allProducts || (
        rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === pId) && (
          !rule.applicableVariations ||
          rule.applicableVariations.length === 0 ||
          rule.applicableVariations.map((v: string) => v.trim().toLowerCase()).includes(itemVarKey.trim().toLowerCase())
        )
      );
    });

    if (targetedItems.length === 0) return;

    const sampleItem = targetedItems[0];
    const productName = sampleItem.productName || "packs";
    const unitPrice = Number(sampleItem.price) || 150;
    
    let variationSuffix = "";
    const pId = sampleItem.productId;
    if (rule.applicableVariations && rule.applicableVariations.length > 0 && pId) {
      const targetedVars = rule.applicableVariations.filter((v: string) => 
        v.trim().toLowerCase().startsWith(pId.toLowerCase() + ":")
      );
      if (targetedVars.length > 0) {
        const varNames = targetedVars.map((v: string) => {
          const parts = v.split(":");
          const weight = parts[1] ? parts[1].trim() : "";
          const flavor = parts[2] ? parts[2].trim() : "";
          return [weight, flavor].filter(Boolean).join(" - ");
        }).filter(Boolean);
        if (varNames.length > 0) {
          variationSuffix = ` (${varNames.join(", ")})`;
        }
      }
    } else {
      const varNames = Array.from(new Set(targetedItems.map(item => {
        return [item.weight, item.flavor].filter(Boolean).join(" - ");
      }).filter(Boolean)));
      if (varNames.length > 0) {
        variationSuffix = ` (${varNames.join(", ")})`;
      }
    }
    
    const targetQty = Math.round(minOrder / unitPrice);
    const originalTotal = targetQty * unitPrice;
    
    let ruleDiscountAmount = 0;
    if (rule.discountType === 'percentage') {
      ruleDiscountAmount = (originalTotal * Number(rule.discountAmount)) / 100;
      const maxCap = Number(rule.maxDiscountAmount || 0);
      if (maxCap > 0 && ruleDiscountAmount > maxCap) {
        ruleDiscountAmount = maxCap;
      }
    } else {
      ruleDiscountAmount = Number(rule.discountAmount) * targetQty;
    }
    
    const discountedTotal = Math.round(originalTotal - ruleDiscountAmount);
    const currentQty = targetedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    
    const isMet = currentQty >= targetQty;
    const freeShippingText = rule.freeShipping ? " + Free Shipping" : "";

    if (isMet) {
      const ruleId = rule._id ? rule._id.toString() : String(rule.id || '');
      const usedAmount = ruleUsage.get(ruleId) || 0;
      const actualSaved = usedAmount > 0 ? Math.min(usedAmount, Number(rule.maxDiscountAmount || 99999999)) : ruleDiscountAmount;
      campaignNotices.push({
        offer: `Get ${targetQty} packs of ${productName}${variationSuffix} for ৳${discountedTotal}${freeShippingText}!`,
        action: `✓ Offer Unlocked! You saved ৳${Math.round(actualSaved)}!`,
        unlocked: true
      });
    } else {
      const remainingQty = Math.max(0, targetQty - currentQty);
      campaignNotices.push({
        offer: `Get ${targetQty} packs of ${productName}${variationSuffix} for ৳${discountedTotal}${freeShippingText}!`,
        action: `Add ${remainingQty} more pack${remainingQty > 1 ? 's' : ''} to unlock this offer!`,
        unlocked: false
      });
    }
  });

  return {
    items: finalItems,
    subtotal: Number(subtotal) || 0,
    discountAmount: Number(totalDiscount) || 0,
    promoDiscount: Number(promoDiscount) || 0,
    ruleDiscount: Number(flatDiscountTotal) || 0,
    total: Number(total) || 0,
    promoCode: promoDetails ? promoDetails.code : undefined,
    promoDetails,
    isRestricted: promoDetails ? !promoDetails.allProducts : false,
    applicableSubtotal: Number(applicableSubtotal) || 0,
    freeShippingGranted,
    campaignNotices
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
            itemCount: normalizedItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
            subtotal: parsed.subtotal || 0,
            total: parsed.total || 0,
            discountAmount: parsed.discountAmount || 0,
            promoCode: parsed.promoCode,
            promoDetails: parsed.promoDetails,
            promoDiscount: parsed.promoDiscount,
            ruleDiscount: parsed.ruleDiscount,
            isRestricted: parsed.isRestricted,
            applicableSubtotal: parsed.applicableSubtotal,
            freeShippingGranted: parsed.freeShippingGranted,
            campaignNotices: parsed.campaignNotices || [],
            flatRules: parsed.flatRules || []
          };
        } catch (e) {
          console.error("Cart initial parse failed:", e);
        }
      }
    }
    return { items: [], total: 0, subtotal: 0, discountAmount: 0, itemCount: 0, isRestricted: false, applicableSubtotal: 0, freeShippingGranted: false, flatRules: [] };
  });

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
          itemCount: normalizedItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
          subtotal: parsed.subtotal || 0,
          total: parsed.total || 0,
          discountAmount: parsed.discountAmount || 0,
          promoCode: parsed.promoCode,
          promoDetails: parsed.promoDetails,
          promoDiscount: parsed.promoDiscount,
          ruleDiscount: parsed.ruleDiscount,
          isRestricted: parsed.isRestricted,
          applicableSubtotal: parsed.applicableSubtotal,
          freeShippingGranted: parsed.freeShippingGranted,
          campaignNotices: parsed.campaignNotices || [],
          flatRules: parsed.flatRules || []
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

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [syncFromStorage]);

  // Sync with DB
  useEffect(() => {
    if (!isInitialized) return;

    const syncDB = async () => {
      const token = localStorage.getItem("token");
      const alreadySynced = sessionStorage.getItem("cart_synced") === "true";

      if (token && !alreadySynced) {
        try {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`
          };
          const activeShopId = localStorage.getItem("sr_active_shop_id");
          if (activeShopId) {
            headers["x-on-behalf-of"] = activeShopId;
          }
          const res = await fetch("/api/cart", {
            headers
          });
          if (res.ok) {
            const data = await res.json();
            const dbItems = (data.items || []).map((i: any) => normalizeItem(i)).filter((i: any): i is CartItem => i !== null);
            
            setCart(prev => {
              const dbItemMap = new Map(dbItems.map((i: CartItem) => [getItemKey(i), i]));
              const localKeys = new Set(prev.items.map((i: CartItem) => getItemKey(i)));
              const updatedLocalItems = prev.items.map(item => {
                const key = getItemKey(item);
                const dbItem = dbItemMap.get(key) as CartItem | undefined;
                return dbItem ? { 
                  ...item, 
                  price: dbItem.price, 
                  stock: dbItem.stock,
                  discountAmount: dbItem.discountAmount,
                  discountedPrice: dbItem.discountedPrice,
                  discountedTotal: dbItem.discountedTotal
                } : item;
              });
              const uniqueDBItems = dbItems.filter((i: CartItem) => !localKeys.has(getItemKey(i)));
              const mergedItems = [...updatedLocalItems, ...uniqueDBItems];
              
              sessionStorage.setItem("cart_synced", "true");
              return { 
                items: mergedItems,
                itemCount: mergedItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
                subtotal: data.subtotal || 0,
                total: data.total || 0,
                discountAmount: data.discountAmount || 0,
                promoDiscount: data.promoDiscount || 0,
                ruleDiscount: data.ruleDiscount || 0,
                isRestricted: data.isRestricted,
                applicableSubtotal: data.applicableSubtotal,
                freeShippingGranted: data.freeShippingGranted,
                promoCode: prev.promoCode || data.promoCode, 
                promoDetails: prev.promoDetails || data.promoDetails,
                campaignNotices: data.campaignNotices || [],
                flatRules: data.flatRules || []
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

  const lastRequestData = React.useRef<string>("");

  // Persist to LocalStorage & DB (and fetch recalculated totals)
  useEffect(() => {
    if (!isInitialized) return;

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

    // Create a simplified version of items for comparison (only things that represent user intent)
    const currentRequestData = JSON.stringify({
      items: cart.items.map(i => ({ id: i.productId, q: i.quantity, w: i.weight, f: i.flavor })),
      promo: cart.promoCode
    });

    // If nothing significant changed since last request, skip
    if (currentRequestData === lastRequestData.current) return;

    let lastPromo = undefined;
    try {
      if (lastRequestData.current) {
        const parsedLast = JSON.parse(lastRequestData.current);
        lastPromo = parsedLast.promo;
      }
    } catch (e) {}

    const promoChanged = cart.promoCode !== lastPromo;
    const delay = promoChanged ? 50 : 200;

    setIsSyncing(true);

    // Use a cancelled flag instead of AbortController to avoid surfacing
    // false-positive AbortErrors in Next.js dev mode when cleanup fires
    // before the timer callback executes.
    let cancelled = false;
    const abortController = new AbortController();

    const timer = setTimeout(async () => {
      if (cancelled) {
        setIsSyncing(false);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const activeShopId = localStorage.getItem("sr_active_shop_id");
        if (activeShopId) {
          headers["x-on-behalf-of"] = activeShopId;
        }

        const res = await fetch("/api/cart", {
          method: "POST",
          headers,
          signal: abortController.signal,
          body: JSON.stringify({ 
            items: cart.items,
            promoCode: cart.promoCode
          })
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          // Update lastRequestData ONLY after successful sync to prevent loops
          lastRequestData.current = currentRequestData;
          
          setCart(prev => {
            const dbItems = data.items || [];
            const dbItemMap = new Map(dbItems.map((i: any) => [getItemKey(i), i]));
            
            let hasChanged = false;
            const mergedItems = prev.items.map(item => {
              const key = getItemKey(item);
              const dbItem = dbItemMap.get(key) as CartItem | undefined;
              if (dbItem) {
                const newQuantity = Math.min(item.quantity, dbItem.quantity || item.quantity);
                if (item.price !== dbItem.price || item.stock !== dbItem.stock || item.quantity !== newQuantity) {
                  hasChanged = true;
                }
                return {
                  ...item,
                  price: dbItem.price,
                  stock: dbItem.stock,
                  quantity: newQuantity,
                  discountAmount: dbItem.discountAmount,
                  discountedPrice: dbItem.discountedPrice,
                  discountedTotal: dbItem.discountedTotal
                };
              }
              return item;
            });

            // Only update state if data is actually different to avoid extra renders/loops
            if (!hasChanged && 
                prev.subtotal === data.subtotal && 
                prev.total === data.total &&
                prev.promoCode === data.promoCode) {
              return prev;
            }

            if (prev.items.length === 0) {
              return prev;
            }

            return {
              ...prev,
              items: mergedItems,
              subtotal: data.subtotal,
              total: data.total,
              discountAmount: data.discountAmount,
              promoDiscount: data.promoDiscount,
              ruleDiscount: data.ruleDiscount,
              isRestricted: data.isRestricted,
              applicableSubtotal: data.applicableSubtotal,
              freeShippingGranted: data.freeShippingGranted,
              promoCode: data.promoCode,
              promoDetails: data.promoDetails,
              campaignNotices: data.campaignNotices || [],
              flatRules: data.flatRules || prev.flatRules || []
            };
          });
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("DB Save failed:", err);
        }
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cart.items, cart.promoCode, isInitialized]);

  const addItem = useCallback((item: AddCartItemInput, quantity: number = 1) => {
    setCart(prev => {
      const normalized = normalizeItem({ ...item, quantity: item.quantity ?? quantity });
      if (!normalized) return prev;
      const itemKey = getItemKey(normalized);
      const existingIdx = prev.items.findIndex(i => itemMatchesKey(i, itemKey));
      let newItems = [...prev.items];
      
      const isDealerUser = (user?.role === "customer" && user?.customerType === "dealer") || user?.role === "owner";
      const canInputManual = user && (["owner", "super_admin", "admin", "moderator"].includes(user.role) || isDealerUser);
      const maxAllowed = canInputManual ? 999999 : (normalized.stock || 999);

      if (existingIdx > -1) {
        const existing = newItems[existingIdx];
        newItems[existingIdx] = { 
          ...existing, 
          quantity: Math.min(maxAllowed, existing.quantity + normalized.quantity),
          // ONLY clear stale discounts on this mutated item!
          discountAmount: undefined,
          discountedPrice: undefined,
          discountedTotal: undefined
        };
      } else {
        newItems.push({ 
          ...normalized, 
          quantity: Math.min(maxAllowed, normalized.quantity),
          // ONLY clear stale discounts on this mutated item!
          discountAmount: undefined,
          discountedPrice: undefined,
          discountedTotal: undefined
        });
      }

      const calculated = calculateClientSideTotals(newItems, prev.promoCode, prev.promoDetails, prev.flatRules, user);
      const newItemCount = calculated.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
      return { 
        ...prev, 
        items: calculated.items, 
        itemCount: newItemCount,
        subtotal: calculated.subtotal,
        total: calculated.total,
        discountAmount: calculated.discountAmount,
        promoDiscount: calculated.promoDiscount,
        ruleDiscount: calculated.ruleDiscount,
        freeShippingGranted: calculated.freeShippingGranted,
        campaignNotices: calculated.campaignNotices
      };
    });
  }, [user]);

  const removeItem = useCallback((key: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(i => !itemMatchesKey(i, key));
      const calculated = calculateClientSideTotals(newItems, prev.promoCode, prev.promoDetails, prev.flatRules, user);
      const newItemCount = calculated.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
      return { 
        ...prev, 
        items: calculated.items, 
        itemCount: newItemCount,
        subtotal: calculated.subtotal,
        total: calculated.total,
        discountAmount: calculated.discountAmount,
        promoDiscount: calculated.promoDiscount,
        ruleDiscount: calculated.ruleDiscount,
        freeShippingGranted: calculated.freeShippingGranted,
        campaignNotices: calculated.campaignNotices
      };
    });
  }, [user]);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setCart(prev => {
      const isDealerUser = (user?.role === "customer" && user?.customerType === "dealer") || user?.role === "owner";
      const canInputManual = user && (["owner", "super_admin", "admin", "moderator"].includes(user.role) || isDealerUser);

      const newItems = quantity <= 0 
        ? prev.items.filter(i => !itemMatchesKey(i, key))
        : prev.items.map(i => {
            if (itemMatchesKey(i, key)) {
              const itemMaxAllowed = canInputManual ? 999999 : (i.stock || 999);
              return { 
                ...i, 
                quantity: Math.min(itemMaxAllowed, quantity),
                // ONLY clear stale discounts on this mutated item!
                discountAmount: undefined,
                discountedPrice: undefined,
                discountedTotal: undefined
              };
            }
            return i;
          });

      const calculated = calculateClientSideTotals(newItems, prev.promoCode, prev.promoDetails, prev.flatRules, user);
      const newItemCount = calculated.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
      return { 
        ...prev, 
        items: calculated.items, 
        itemCount: newItemCount,
        subtotal: calculated.subtotal,
        total: calculated.total,
        discountAmount: calculated.discountAmount,
        promoDiscount: calculated.promoDiscount,
        ruleDiscount: calculated.ruleDiscount,
        freeShippingGranted: calculated.freeShippingGranted,
        campaignNotices: calculated.campaignNotices
      };
    });
  }, [user]);

  const applyPromo = useCallback((details: PromoDetails) => {
    setCart(prev => {
      const calculated = calculateClientSideTotals(prev.items, details.code, details, prev.flatRules, user);
      return { 
        ...prev, 
        promoCode: details.code, 
        promoDetails: details,
        subtotal: calculated.subtotal,
        total: calculated.total,
        discountAmount: calculated.discountAmount,
        promoDiscount: calculated.promoDiscount,
        ruleDiscount: calculated.ruleDiscount,
        isRestricted: !details.allProducts,
        applicableSubtotal: calculated.applicableSubtotal,
        freeShippingGranted: calculated.freeShippingGranted,
        campaignNotices: calculated.campaignNotices
      };
    });
  }, [user]);

  const removePromo = useCallback(() => {
    setCart(prev => {
      const calculated = calculateClientSideTotals(prev.items, undefined, undefined, prev.flatRules, user);
      return { 
        ...prev, 
        promoCode: undefined, 
        promoDetails: undefined,
        subtotal: calculated.subtotal,
        total: calculated.total,
        discountAmount: calculated.discountAmount,
        promoDiscount: 0,
        ruleDiscount: calculated.ruleDiscount,
        isRestricted: false,
        applicableSubtotal: 0,
        freeShippingGranted: calculated.freeShippingGranted,
        campaignNotices: calculated.campaignNotices
      };
    });
  }, [user]);

  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0, subtotal: 0, discountAmount: 0, itemCount: 0, freeShippingGranted: false, flatRules: [] });
  }, []);

  const contextValue: CartContextType = {
    cart,
    items: cart.items,
    total: isMounted ? (cart.total || 0) : 0,
    subtotal: isMounted ? (cart.subtotal || 0) : 0,
    itemCount: cart.itemCount,
    promoCode: cart.promoCode,
    discountAmount: isMounted ? (cart.discountAmount || 0) : 0,
    promoDiscount: isMounted ? (cart.promoDiscount || 0) : 0,
    ruleDiscount: isMounted ? (cart.ruleDiscount || 0) : 0,
    promoDetails: cart.promoDetails,
    isRestricted: cart.isRestricted,
    applicableSubtotal: cart.applicableSubtotal,
    freeShippingGranted: isMounted ? (cart.freeShippingGranted || false) : false,
    campaignNotices: cart.campaignNotices || [],
    isLoading: !isMounted || isLoading,
    isSyncing: isMounted ? isSyncing : false,
    addItem,
    removeItem,
    updateQuantity,
    applyPromo,
    removePromo,
    clearCart,
    getItemDiscount: () => 0
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
