"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

type Variation = {
  weight?: string;
  flavor?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  isDefault?: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  variations: Variation[];
  image: string;
  description?: string;
};

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug || "");
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVarIndex, setSelectedVarIndex] = useState<number>(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFlying, setIsFlying] = useState(false);

  const selectedVariation = product?.variations?.[selectedVarIndex];
  const displayPrice = selectedVariation?.discountPrice || selectedVariation?.price || 0;
  const originalPrice = selectedVariation?.price || 0;
  const displayStock = selectedVariation ? selectedVariation.stock : 0;
  const hasDiscount = !!selectedVariation?.discountPrice && selectedVariation.discountPrice < selectedVariation.price;
  const discountPercentage = hasDiscount ? Math.round(((originalPrice - (selectedVariation?.discountPrice || 0)) / originalPrice) * 100) : 0;

  const handleAddToCart = () => {
    if (!product || !selectedVariation) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      price: displayPrice,
      image: images.length > 0 ? images[currentImageIndex] : product.image || "/images/placeholder.webp",
      quantity: quantity,
      weight: selectedVariation.weight || "",
      flavor: selectedVariation.flavor || "",
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

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/products/${slug}`);
        if (!response.ok) {
          setProduct(null);
          return;
        }

        const data = await response.json();
        const p = data.product || null;
        setProduct(p);
        setImages(data.images || []);
        
        if (p) {
          document.title = `${p.name} | Parle Bangladesh`;
          // Find default variation index
          const defaultIdx = p.variations.findIndex((v: Variation) => v.isDefault);
          if (defaultIdx !== -1) {
            setSelectedVarIndex(defaultIdx);
          }
        }
      } catch (error) {
        console.error("Failed to load product details:", error);
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadProduct();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 font-medium">Loading product details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-24 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">PRODUCT NOT FOUND</h1>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">The product you're looking for might have been moved or removed from our inventory.</p>
          <Link href="/shop">
            <Button size="lg" className="px-12 py-7 font-black uppercase tracking-widest text-lg">Back to Shop</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mainImageUrl = images.length > 0 ? images[currentImageIndex] : product.image || "/images/placeholder.webp";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Product Info Section */}
        <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
          
          {/* Left Column: Image Gallery */}
          <div className="md:col-span-6 p-6 md:p-10 bg-white border-r border-gray-100">
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white group border">
              <img 
                src={mainImageUrl} 
                alt={product.name} 
                className="w-full h-full object-contain p-8 group-hover:scale-105 transition-transform duration-700"
              />
              {displayStock === 0 && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <span className="bg-white text-gray-900 border-4 border-red-600 px-8 py-3 font-black text-2xl uppercase tracking-tighter shadow-2xl">Out of Stock</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto py-6 scrollbar-hide">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-24 h-24 rounded-xl border-4 transition-all relative overflow-hidden bg-white shadow-sm ${
                      currentImageIndex === idx 
                        ? "border-red-600 scale-105" 
                        : "border-gray-100 hover:border-red-200"
                    }`}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain p-2" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div className="md:col-span-6 p-6 md:p-12 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-red-600 font-black text-xs uppercase tracking-[0.3em]">{product.category}</span>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-[1.1] tracking-tighter">
                {product.name}
              </h1>
            </div>

            {/* Price Section */}
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-black text-red-600">৳</span>
                <span className="text-5xl font-black text-red-600 tracking-tighter">
                  {Math.round(displayPrice)}
                </span>
              </div>
              {hasDiscount && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 line-through font-bold text-sm">৳ {Math.round(originalPrice)}</span>
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Save {discountPercentage}%</span>
                </div>
              )}
            </div>

            {/* Variations / Options */}
            {product.variations && product.variations.length > 0 && (
              <div className="flex flex-col gap-4 pt-4 border-t">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-8 h-[2px] bg-red-600"></span> Select Variation
                </span>
                <div className="flex flex-wrap gap-3">
                  {product.variations.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedVarIndex(i);
                        setQuantity(1);
                      }}
                      className={`px-6 py-3 text-sm font-black uppercase tracking-tighter border-Subtle transition-all active:scale-95 ${
                        selectedVarIndex === i 
                          ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-200" 
                          : "bg-white border-2 border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-500"
                      }`}
                    >
                      {[v.weight, v.flavor].filter(Boolean).join(" ") || "Default"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex flex-col gap-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Quantity</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${displayStock > 0 ? "text-green-600" : "text-red-600"}`}>
                  {displayStock > 0 ? `${displayStock} items available` : "Sold Out"}
                </span>
              </div>
              <div className="flex items-center h-14 bg-gray-50 rounded-lg p-1 border border-gray-100 w-fit">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors disabled:opacity-20"
                  disabled={quantity <= 1 || displayStock === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                </button>
                <div className="w-16 h-full flex items-center justify-center text-xl font-black text-gray-900 font-mono">{String(quantity).padStart(2, '0')}</div>
                <button 
                  onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                  className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors disabled:opacity-20"
                  disabled={quantity >= displayStock || displayStock === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 mt-4 pt-6 border-t relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleBuyNow}
                  disabled={displayStock === 0}
                  className="h-16 bg-red-600 hover:bg-black text-white font-black rounded-xl transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] shadow-xl shadow-red-100"
                >
                  Buy Now
                </button>
                <div className="relative">
                  <button
                    onClick={handleAddToCart}
                    disabled={displayStock === 0}
                    className="w-full h-16 bg-white border-4 border-red-600 text-red-600 hover:bg-red-50 font-black rounded-xl transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em]"
                  >
                    Add to Cart
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
                        className="absolute left-1/2 top-1/2 -ml-5 -mt-5 w-12 h-12 bg-red-600 rounded-full border-4 border-white flex items-center justify-center text-white font-black z-50 pointer-events-none shadow-2xl"
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

        {/* Product Details Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mt-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600"></div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-8 flex items-center gap-4">
            Product details <span className="flex-1 h-[2px] bg-gray-100"></span>
          </h2>
          <div className="prose prose-lg max-w-none text-gray-500 font-medium leading-relaxed">
            {product.description || "No description provided for this product. High quality Parle product guaranteed."}
          </div>
        </div>
      </main>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
