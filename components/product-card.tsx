"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeProductImagePath } from "@/lib/utils";

interface Variation {
  weight?: string;
  flavor?: string;
  price: number;
  discountPrice?: number;
  stock: number;
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
}

export default function ProductCard({
  name,
  slug,
  category,
  variations = [],
  onAddToCart,
  price = 0,
  stock = 0,
}: ProductCardProps) {
  const [isFlying, setIsFlying] = useState(false);

  // Find default variation or use the first one
  const v = variations.find(v => v.isDefault) || variations[0];
  const defaultVariation = {
    ...v,
    price: v?.price ?? price,
    discountPrice: v?.discountPrice ?? 0,
    stock: v?.stock ?? stock,
    weight: v?.weight ?? "",
    flavor: v?.flavor ?? "",
    image: v?.image ?? ""
  };

  const productImg = sanitizeProductImagePath(defaultVariation.image || "");

  const hasDiscount = !!defaultVariation.discountPrice && defaultVariation.discountPrice < defaultVariation.price;
  const currentPrice = (hasDiscount ? defaultVariation.discountPrice : defaultVariation.price) || 0;
  
  const discountPercentage = hasDiscount 
    ? Math.round(((defaultVariation.price - defaultVariation.discountPrice!) / defaultVariation.price) * 100) 
    : 0;

  const handleAddToCart = () => {
    if (onAddToCart && defaultVariation.stock > 0) {
      onAddToCart(defaultVariation);
      setIsFlying(true);
      setTimeout(() => setIsFlying(false), 800);
    }
  };

  const isOutOfStock = defaultVariation.stock === 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group">
      {hasDiscount && (
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-red-600 text-white font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded shadow-lg">Sale: {discountPercentage}% off</span>
        </div>
      )}
      {/* Image Container */}
      <Link href={`/shop/products/${slug}`}>
        <div className="relative w-full h-56 bg-gray-50 overflow-hidden flex items-center justify-center p-4">
          <Image
            src={productImg}
            alt={name}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 backdrop-blur-[1px]">
              <span className="bg-white text-gray-900 border-2 border-red-600 px-4 py-1 font-black text-sm uppercase tracking-tighter">Out of Stock</span>
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
          {!isOutOfStock && (
            <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">
              In Stock
            </span>
          )}
        </div>

        <div className="flex flex-col gap-0.5 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-red-600">৳</span>
            <span className="text-2xl font-black text-red-600 tracking-tighter">
              {Math.round(currentPrice)}
            </span>
          </div>
          {hasDiscount && (
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
            disabled={isOutOfStock}
            className={`w-full py-6 font-black uppercase tracking-wider text-sm transition-all active:scale-[0.98] ${isOutOfStock ? 'opacity-50 grayscale' : 'bg-red-600 text-white hover:bg-black hover:shadow-lg'}`}
          >
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
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
