"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingCart, ArrowLeft, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { sanitizeProductImagePath } from "@/lib/utils";

interface Variation {
  weight?: string;
  flavor?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  image?: string;
  isDefault?: boolean;
  isBulk?: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  variations: Variation[];
  description?: string;
  isBulk?: boolean;
}

export default function ProductDetailsClient({ product, images }: { product: any, images: string[] }) {
  const router = useRouter();
  const { addItem } = useCart();
  
  // Find default variation index
  const defaultIdx = product.variations.findIndex((v: Variation) => v.isDefault);
  const initialVarIndex = defaultIdx !== -1 ? defaultIdx : 0;

  const [selectedVarIndex, setSelectedVarIndex] = useState<number>(initialVarIndex);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFlying, setIsFlying] = useState(false);

  const selectedVariation = product.variations && product.variations.length > 0 ? product.variations[selectedVarIndex] : null;
  const displayPrice = selectedVariation?.discountPrice || selectedVariation?.price || product.price || 0;
  const originalPrice = selectedVariation?.price || product.price || 0;
  const displayStock = selectedVariation?.stock ?? product.stock ?? 0;
  const hasDiscount = !!selectedVariation?.discountPrice && selectedVariation.discountPrice < selectedVariation.price;
  const discountPercentage = hasDiscount ? Math.round(((originalPrice - (selectedVariation?.discountPrice || 0)) / originalPrice) * 100) : 0;

  // Sync image with variation selection
  useEffect(() => {
    if (selectedVariation?.image) {
      const sanitizedImage = sanitizeProductImagePath(selectedVariation.image);
      const idx = images.indexOf(sanitizedImage);
      if (idx !== -1) {
        setCurrentImageIndex(idx);
      } else {
        setCurrentImageIndex(-1); // Show no image found
      }
    } else {
      setCurrentImageIndex(-1); // Show no image found
    }
  }, [selectedVarIndex, images, selectedVariation]);

  // Sync variation with image selection
  const handleImageSelect = (idx: number) => {
    setCurrentImageIndex(idx);
    const selectedImage = images[idx];
    
    // Check if this image belongs to a specific variation
    const matchingVarIdx = product.variations.findIndex((v: any) => v.image === selectedImage);
    if (matchingVarIdx !== -1) {
      setSelectedVarIndex(matchingVarIdx);
    }
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariation) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      price: displayPrice,
      image: selectedVariation?.image || images[currentImageIndex] || "/placeholder.svg",
      quantity: quantity,
      weight: selectedVariation?.weight || "",
      flavor: selectedVariation?.flavor || "",
      stock: displayStock,
    });
    setIsFlying(true);
    setTimeout(() => setIsFlying(false), 800);
  };

  const handleBuyNow = () => {
    if (displayStock > 0) {
      handleAddToCart();
      router.push("/shop/checkout");
    }
  };

  const mainImageUrl = images[currentImageIndex] || "/placeholder.svg";

  return (
    <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0 border border-gray-100">
      {/* Left Column: Image Gallery */}
      <div className="md:col-span-6 p-6 lg:p-10 bg-white border-b md:border-b-0 md:border-r border-gray-100">
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white group border-2 border-gray-50 flex items-center justify-center p-6">
          <img 
            src={mainImageUrl} 
            alt={product.name} 
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          {displayStock === 0 && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
              <span className="bg-white text-gray-900 border-2 border-red-600 px-6 py-2 font-bold text-xl uppercase tracking-tighter shadow-xl">
                SOLD OUT
              </span>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-4 overflow-x-auto py-8 px-2 md:px-4 no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => handleImageSelect(idx)}
                className={`flex-shrink-0 w-24 h-24 rounded-2xl border-4 transition-all relative overflow-hidden bg-white shadow-xl ${
                  currentImageIndex === idx 
                    ? "border-red-600 scale-110 translate-y-[-4px]" 
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img 
                  src={img} 
                  alt={`View ${idx + 1}`} 
                  className="w-full h-full object-contain p-3" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="md:col-span-6 p-6 lg:p-12 flex flex-col gap-8 bg-slate-50/20">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{product.category}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
            {product.name}
          </h1>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-red-600">৳</span>
              <span className="text-5xl font-bold text-red-600 tracking-tight tabular-nums">
                {Math.round(displayPrice)}
              </span>
            </div>
            
            <div className="flex flex-col mb-1.5">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">(Including Vat)</span>
               {hasDiscount && (
                 <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 opacity-40">
                       <span className="text-xs font-bold text-gray-400">৳</span>
                       <span className="text-gray-400 line-through font-bold text-base tabular-nums leading-none">{Math.round(originalPrice)}</span>
                    </div>
                    <span className="text-green-600 text-[9px] font-black uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-md">{discountPercentage}% off</span>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Option Selection */}
        {product.variations && product.variations.length > 0 && (
          <div className="flex flex-col gap-4 pt-6 border-t-2 border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-6 h-0.5 bg-red-600 rounded-full"></span> 
              Select Option
            </span>
            <div className="flex flex-wrap gap-2">
              {product.variations.map((v: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedVarIndex(i);
                    setQuantity(1);
                  }}
                  className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-2 transition-all active:scale-95 rounded-xl flex items-center gap-2 ${
                    selectedVarIndex === i 
                      ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100" 
                      : "bg-white border-gray-50 text-gray-400 hover:border-red-200 hover:text-red-500"
                  }`}
                >
                  {[v.weight, v.flavor].filter(Boolean).join(" ") || "Standard"}
                  {selectedVarIndex === i && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity</span>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${displayStock > 0 ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${displayStock > 0 ? "text-green-600" : "text-red-600"}`}>
                {displayStock > 0 ? "In Stock" : "Out of stock"}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center h-12 bg-white rounded-xl p-1 border-2 border-gray-50 shadow-sm w-fit group focus-within:border-red-600 transition-all">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-full flex items-center justify-center text-gray-300 hover:text-red-600 transition-colors disabled:opacity-20"
                disabled={quantity <= 1 || displayStock === 0}
              >
                <Minus className="w-4 h-4 stroke-[3]" />
              </button>
              <div className="w-12 h-full flex items-center justify-center text-lg font-bold text-gray-900 tabular-nums">
                {quantity}
              </div>
              <button 
                onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                className="w-10 h-full flex items-center justify-center text-gray-300 hover:text-red-600 transition-colors disabled:opacity-20"
                disabled={quantity >= displayStock || displayStock === 0}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Price Total Overlay */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Subtotal</span>
              <span className="text-xl font-bold text-gray-900 tabular-nums leading-none">৳ {Math.round(displayPrice * quantity)}</span>
            </div>
          </div>
        </div>

        {/* Buy Now Buttons */}
        <div className="flex flex-col gap-4 mt-auto pt-8 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleBuyNow}
              disabled={displayStock === 0}
              className="h-14 bg-red-600 hover:bg-black text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-30 uppercase tracking-widest shadow-xl shadow-red-100 flex items-center justify-center gap-3 text-xs"
            >
              Buy Now
            </button>
            <div className="relative">
              <button
                onClick={handleAddToCart}
                disabled={displayStock === 0}
                className="w-full h-14 bg-white border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-30 uppercase tracking-widest flex items-center justify-center gap-3 text-xs group"
              >
                <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Add To Cart
              </button>
              
              {/* Flying Item Animation */}
              <AnimatePresence>
                {isFlying && (
                  <motion.div
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{ 
                      x: 0, 
                      y: -1000, 
                      scale: 0.1, 
                      opacity: 0,
                      rotate: 720 
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className="absolute left-1/2 top-1/2 -ml-6 -mt-6 w-14 h-14 bg-red-600 rounded-full border-4 border-white flex items-center justify-center text-white font-black z-50 pointer-events-none shadow-2xl"
                  >
                    +{quantity}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
