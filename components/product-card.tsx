"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
  discountPrice?: number;
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

  // Intelligent Default Selection: Skip out-of-stock items for the main display
  const primaryVar = variations.find(v => v.isDefault);
  const v = (primaryVar && primaryVar.stock > 0) 
    ? primaryVar 
    : (variations.find(v => v.stock > 0) || variations[0]);
  const defaultVariation = {
    ...v,
    price: v?.price || price,
    discountPrice: v?.discountPrice || 0,
    stock: v?.stock !== undefined ? v.stock : stock,
    weight: v?.weight || "",
    flavor: v?.flavor || "",
    image: v?.image || ""
  };

  const productImg = sanitizeProductImagePath(defaultVariation.image || "");

  const hasDealerPrice = isDealer && !!defaultVariation.dealerPrice && defaultVariation.dealerPrice > 0;
  const hasDiscount = !hasDealerPrice && !!defaultVariation.discountPrice && defaultVariation.discountPrice < defaultVariation.price;
  
  let currentPrice = defaultVariation.price;
  if (hasDealerPrice) {
    currentPrice = defaultVariation.dealerPrice!;
  } else if (hasDiscount) {
    currentPrice = defaultVariation.discountPrice!;
  }
  
  const discountPercentage = hasDiscount 
    ? Math.round(((defaultVariation.price - defaultVariation.discountPrice!) / defaultVariation.price) * 100) 
    : 0;

  const cartItemKey = getItemKey({ productId: id || slug, weight: defaultVariation.weight, flavor: defaultVariation.flavor });
  const existingCartItem = items.find(i => getItemKey(i) === cartItemKey);
  const cartQuantity = existingCartItem?.quantity || 0;
  
  // Resilience: If stock is missing, assume it's available (or treat as out of stock? 
  // Let's assume a large number if missing to avoid blocking)
  const actualStock = defaultVariation.stock !== undefined ? defaultVariation.stock : 999;
  const isOutOfStock = actualStock === 0;
  const isAtMax = actualStock > 0 && cartQuantity >= actualStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (actualStock > 0 && !isAtMax) {
      if (onAddToCart) {
        onAddToCart(defaultVariation);
      } else {
        // Fallback to direct cart add if no custom handler is provided
        addItem({
          productId: id,
          productName: name,
          productSlug: slug,
          price: currentPrice,
          image: defaultVariation.image,
          weight: defaultVariation.weight,
          flavor: defaultVariation.flavor,
          stock: actualStock,
        });
      }
      
      setIsFlying(true);
      setTimeout(() => setIsFlying(false), 800);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group">
      {hasDiscount && (
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-red-600 text-white font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded shadow-lg">Sale: {discountPercentage}% off</span>
        </div>
      )}
      {/* Image Container */}
      <Link href={`/shop/products/${slug}`}>
        <div className="relative w-full h-56 bg-white overflow-hidden flex items-center justify-center p-4">
          <Image
            src={productImg}
            alt={name}
            fill
            priority={priority}
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 backdrop-blur-[1px]">
              <span className="bg-white text-gray-900 border-2 border-red-600 px-4 py-1 font-black text-sm uppercase tracking-tighter">Out of Stock</span>
            </div>
          )}
          {isAtMax && !isOutOfStock && (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-20">
               <span className="bg-white text-amber-600 border border-amber-500 px-2 py-1 font-black text-xs uppercase tracking-tighter shadow-sm">Max in Cart</span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 border-t">
        <Link href={`/shop/products/${slug}`}>
          <h3 className="font-bold text-gray-900 leading-tight hover:text-red-600 line-clamp-2 min-h-[2.5rem] mb-1 transition-colors">
            {name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mb-3 min-h-[1.5rem]">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            {defaultVariation.weight || defaultVariation.flavor || "Standard"}
          </span>
        </div>

          <div className="flex flex-col gap-0.5 mb-4">
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-bold ${hasDealerPrice ? 'text-amber-600' : 'text-red-600'}`}>৳</span>
            <span className={`text-2xl font-black tracking-tighter ${hasDealerPrice ? 'text-amber-600' : 'text-red-600'}`}>
              {Math.round(currentPrice)}
            </span>
            {hasDealerPrice && (
              <div className="ml-2 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                <ShieldCheck className="w-2.5 h-2.5 text-amber-600" />
                <span className="text-[8px] font-black uppercase text-amber-600 tracking-tighter">Dealer Rate</span>
              </div>
            )}
          </div>
          {(hasDiscount || hasDealerPrice) && (
            <div className="flex items-center gap-1 opacity-40">
               <span className="text-[10px] font-bold text-gray-500">৳</span>
               <span className="text-[10px] text-gray-500 line-through font-bold">{Math.round(defaultVariation.price)}</span>
            </div>
          )}
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
