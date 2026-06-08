"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeProductImagePath } from "@/lib/utils";
import { useCart, getItemKey } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck } from "lucide-react";

interface Variation {
  weight?: string;
  flavor?: string;
  price: number;
  dealerPrice?: number;
  retailerPrice?: number;
  discountPrice?: number;
  flatDiscountPrice?: number;
  hasFlatDiscount?: boolean;
  flatDiscountAmount?: number;
  flatDiscountType?: string;
  stock: number;
  holdStock?: number;
  deliveredCount?: number;
  lostCount?: number;
  damagedCount?: number;
  image?: string;
  isDefault?: boolean;
}

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  category: string;
  variations: Variation[];
  onAddToCart?: (variation: Variation) => void;
  price?: number;
  stock?: number;
  priority?: boolean;
}

export default function ProductCard({
  id,
  name,
  slug,
  category,
  variations = [],
  onAddToCart,
  price = 0,
  stock = 0,
  priority = false,
}: ProductCardProps) {
  const { items, addItem } = useCart();
  const { user } = useAuth();
  const [isFlying, setIsFlying] = useState(false);
  const isDealer = user?.customerType === "dealer";
  const isRetailer = user?.customerType === "retailer";

  // Intelligent Default Selection: Skip out-of-stock items for the main display
  const defaultIndex = useMemo(() => {
    if (!variations || variations.length === 0) return 0;
    const primaryVar = variations.find(v => v.isDefault);
    const target = (primaryVar && primaryVar.stock > 0) 
      ? primaryVar 
      : (variations.find(v => v.stock > 0) || variations[0]);
    const idx = variations.indexOf(target);
    return idx !== -1 ? idx : 0;
  }, [variations]);

  const [activeVarIndex, setActiveVarIndex] = useState(defaultIndex);

  // Sync index when defaultIndex changes
  useEffect(() => {
    setActiveVarIndex(defaultIndex);
  }, [defaultIndex]);

  // Automatically cycle through variations every 3 seconds if there are multiple variations
  useEffect(() => {
    if (!variations || variations.length <= 1) return;

    const interval = setInterval(() => {
      setActiveVarIndex((prev) => (prev + 1) % variations.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [variations.length]);

  const fallbackImg = (variations && variations.find(varObj => varObj.image)?.image) || "";
  const currentVar = (variations && variations[activeVarIndex]) || (variations && variations[0]) || {};
  const activeVariation = {
    ...currentVar,
    price: currentVar.price || price,
    discountPrice: currentVar.discountPrice || 0,
    flatDiscountPrice: currentVar.flatDiscountPrice || 0,
    hasFlatDiscount: !!currentVar.hasFlatDiscount,
    flatDiscountAmount: currentVar.flatDiscountAmount || 0,
    flatDiscountType: currentVar.flatDiscountType || '',
    stock: currentVar.stock !== undefined ? currentVar.stock : stock,
    weight: currentVar.weight || "",
    flavor: currentVar.flavor || "",
    image: currentVar.image || fallbackImg
  };

  const productImg = sanitizeProductImagePath(activeVariation.image);

  const userDiscountPercent = Number(user?.flatDiscountPercent) || 0;
  const isUserDiscountActive = !isDealer && !isRetailer && userDiscountPercent > 0 && user?.flatDiscountExpiresAt && new Date(user.flatDiscountExpiresAt) > new Date();

  const hasDealerPrice = isDealer && !!activeVariation.dealerPrice && activeVariation.dealerPrice > 0;
  const hasRetailerPrice = isRetailer && !!activeVariation.retailerPrice && activeVariation.retailerPrice > 0;
  
  // A product has a retail discount if it has a manual discountPrice OR a global flatDiscountPrice
  const hasManualDiscount = !isDealer && !isRetailer && !!activeVariation.discountPrice && activeVariation.discountPrice < activeVariation.price;
  const hasFlatDiscount = !isDealer && !isRetailer && !!activeVariation.hasFlatDiscount && !!activeVariation.flatDiscountPrice;
  
  let currentPrice = activeVariation.price;
  let discountPercentage = 0;
  let hasAnyRetailDiscount = false;
  let activeDiscountLabel = "Sale";

  if (hasDealerPrice) {
    currentPrice = activeVariation.dealerPrice!;
  } else if (hasRetailerPrice) {
    currentPrice = activeVariation.retailerPrice!;
  } else {
    // Collect all candidates
    let candidates = [{ price: activeVariation.price, percent: 0, label: "" }];
    
    if (hasManualDiscount) {
      const p = Math.round(((activeVariation.price - activeVariation.discountPrice!) / activeVariation.price) * 100);
      candidates.push({ price: activeVariation.discountPrice!, percent: p, label: "Sale" });
    }
    if (hasFlatDiscount) {
      const p = activeVariation.flatDiscountType === 'percentage' 
        ? activeVariation.flatDiscountAmount!
        : Math.round(((activeVariation.price - activeVariation.flatDiscountPrice!) / activeVariation.price) * 100);
      candidates.push({ price: activeVariation.flatDiscountPrice!, percent: p, label: "Campaign" });
    }
    if (isUserDiscountActive) {
      const userPrice = Math.round(activeVariation.price * (1 - userDiscountPercent / 100));
      candidates.push({ price: userPrice, percent: userDiscountPercent, label: `${user.customerType?.toUpperCase() || 'Member'}` });
    }

    // Pick candidate with lowest price
    const bestCandidate = candidates.reduce((best, current) => current.price < best.price ? current : best, candidates[0]);
    currentPrice = bestCandidate.price;
    discountPercentage = bestCandidate.percent;
    activeDiscountLabel = bestCandidate.label;
    hasAnyRetailDiscount = currentPrice < activeVariation.price;
  }

  const cartItemKey = getItemKey({ productId: id || slug, weight: activeVariation.weight, flavor: activeVariation.flavor });
  const existingCartItem = items.find(i => getItemKey(i) === cartItemKey);
  const cartQuantity = existingCartItem?.quantity || 0;
  
  const canInputManualQty = user && (["owner", "super_admin", "admin", "moderator"].includes(user.role) || isDealer || isRetailer);

  // Resilience: If stock is missing, assume it's available (or treat as out of stock? 
  // Let's assume a large number if missing to avoid blocking)
  const actualStock = activeVariation.stock !== undefined ? activeVariation.stock : 999;
  const isOutOfStock = actualStock === 0;
  const isAtMax = !canInputManualQty && actualStock > 0 && cartQuantity >= actualStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (actualStock > 0 && !isAtMax) {
      if (onAddToCart) {
        onAddToCart(activeVariation);
      } else {
        // Fallback to direct cart add if no custom handler is provided
        addItem({
          productId: id,
          productName: name,
          productSlug: slug,
          price: currentPrice,
          image: activeVariation.image,
          weight: activeVariation.weight,
          flavor: activeVariation.flavor,
          stock: actualStock,
        });
      }
      
      setIsFlying(true);
      setTimeout(() => setIsFlying(false), 800);
    }
  };

  const variationParams = new URLSearchParams();
  if (activeVariation.weight) variationParams.set('weight', activeVariation.weight);
  if (activeVariation.flavor) variationParams.set('flavor', activeVariation.flavor);
  const productUrl = `/shop/products/${slug}${variationParams.toString() ? `?${variationParams.toString()}` : ''}`;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group">
      {hasAnyRetailDiscount && (
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-red-600 text-white font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded shadow-lg">
            {activeDiscountLabel}: {discountPercentage}% off
          </span>
        </div>
      )}
      {/* Image Container */}
      <Link href={productUrl}>
        <div className="relative w-full h-56 bg-white overflow-hidden flex items-center justify-center p-4">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeVarIndex}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="absolute inset-0 p-4 flex items-center justify-center"
            >
              <div className="relative w-full h-full">
                <Image
                  src={productImg}
                  alt={name}
                  fill
                  priority={priority}
                  className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Flavor badge overlay with eye-catching premium gradient */}
          <AnimatePresence mode="popLayout">
            {activeVariation.flavor && (
              <motion.div
                key={activeVariation.flavor}
                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute bottom-3 right-3 z-20"
              >
                <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-[9.5px] uppercase tracking-widest px-3 py-1 rounded-full shadow-lg border border-white/20 select-none">
                  {activeVariation.flavor}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-30 backdrop-blur-[1px]">
              <span className="bg-white text-gray-900 border-2 border-red-600 px-4 py-1 font-black text-sm uppercase tracking-tighter">Out of Stock</span>
            </div>
          )}
          {isAtMax && !isOutOfStock && (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-30">
               <span className="bg-white text-amber-600 border border-amber-500 px-2 py-1 font-black text-xs uppercase tracking-tighter shadow-sm">Max in Cart</span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 border-t">
        <Link href={productUrl}>
          <h3 className="font-bold text-gray-900 leading-tight hover:text-red-600 line-clamp-2 min-h-[2.5rem] mb-1 transition-colors">
            {name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mb-3 min-h-[1.5rem] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={activeVarIndex}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="text-xs font-bold text-gray-500 uppercase tracking-widest"
            >
              {activeVariation.weight || (!activeVariation.flavor ? "Standard" : "")}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-0.5 mb-4 min-h-[3rem] justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeVarIndex}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-lg font-bold ${hasDealerPrice ? 'text-amber-600' : (hasRetailerPrice ? 'text-teal-600' : 'text-red-600')}`}>৳</span>
                <span className={`text-2xl font-black tracking-tighter ${hasDealerPrice ? 'text-amber-600' : (hasRetailerPrice ? 'text-teal-600' : 'text-red-600')}`}>
                  {Math.round(currentPrice)}
                </span>
                {hasDealerPrice && (
                  <div className="ml-2 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    <ShieldCheck className="w-2.5 h-2.5 text-amber-600" />
                    <span className="text-[8px] font-black uppercase text-amber-600 tracking-tighter">Dealer Rate</span>
                  </div>
                )}
                {hasRetailerPrice && (
                  <div className="ml-2 flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                    <ShieldCheck className="w-2.5 h-2.5 text-teal-600" />
                    <span className="text-[8px] font-black uppercase text-teal-600 tracking-tighter">Retailer Rate</span>
                  </div>
                )}
              </div>
              {(hasAnyRetailDiscount || hasDealerPrice || hasRetailerPrice) && (
                <div className="flex items-center gap-1 opacity-40">
                   <span className="text-[10px] font-bold text-gray-500">৳</span>
                   <span className="text-[10px] text-gray-500 line-through font-bold">{Math.round(activeVariation.price)}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Button */}
        <div className="relative">
          <Button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAtMax}
            className={`w-full py-6 font-black uppercase tracking-wider text-sm transition-all active:scale-[0.98] ${isOutOfStock ? 'opacity-50 grayscale' : (isAtMax ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-inner' : 'bg-red-600 text-white hover:bg-black hover:shadow-lg')}`}
          >
            {isOutOfStock ? "Out of Stock" : (isAtMax ? "Stock Reached" : "Add to Cart")}
          </Button>

          {/* Flying Dot Animation */}
          <AnimatePresence>
            {isFlying && (
              <motion.div
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ 
                  x: 0, 
                  y: -800, 
                  scale: 0.2, 
                  opacity: 0,
                  rotate: 720 
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "circOut" }}
                className="absolute left-1/2 top-1/2 -ml-4 -mt-4 w-10 h-10 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-black z-50 pointer-events-none shadow-2xl"
              >
                +1
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
