"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  X,
  AlertCircle,
  Truck,
  Package,
  ShieldCheck,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, getItemKey } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { sanitizeProductImagePath } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    removeItem,
    updateQuantity,
    total,
    subtotal,
    discountAmount,
    ruleDiscount,
    promoDiscount,
    clearCart,
    isLoading
  } = useCart();
  const { user } = useAuth();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeDiscounts, setActiveDiscounts] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const fetchActiveDiscounts = async () => {
      try {
        const res = await fetch('/api/discounts/active');
        if (res.ok) {
          const data = await res.json();
          setActiveDiscounts(data);
        }
      } catch (err) {
        console.error("Failed to fetch active discounts", err);
      }
    };
    fetchActiveDiscounts();
  }, []);

  // Modal states
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!mounted) return null;

  // Only show skeleton if we are loading AND have no items yet
  if (isLoading && items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 w-full bg-white rounded-3xl animate-pulse shadow-sm" />
              ))}
            </div>
            <div className="lg:col-span-4 h-64 bg-white rounded-3xl animate-pulse shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  const handleCheckout = () => {
    setIsCheckingOut(true);
    router.push('/shop/checkout');
  };

  // Calculate cart-only totals (ignoring coupon)
  // We use items.reduce to ensure we're summing the prices as shown in the list (which include flat discounts)
  const cartDisplayTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartDisplaySaved = ruleDiscount || 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 rotate-3 group-hover:rotate-6 transition-transform">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-gray-900 italic tracking-tighter uppercase leading-none">Your Cart</h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                {items.length} {items.length === 1 ? 'Product' : 'Products'} Selected
              </p>
            </div>
          </div>

          <Link href="/shop">
            <Button variant="ghost" className="text-[9px] font-black uppercase tracking-widest hover:text-red-600 gap-2">
              Continue Shopping <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-10">
        {items.length === 0 ? (
          <div className="bg-white rounded-[40px] p-20 text-center shadow-xl shadow-slate-200/50 border border-gray-50 max-w-2xl mx-auto mt-10">
            <div className="w-24 h-24 bg-slate-50 rounded-[35px] flex items-center justify-center mx-auto mb-8 relative">
              <ShoppingBag className="w-10 h-10 text-slate-200" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-4 border-white">
                <X className="w-3 h-3 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tight mb-4">Cart is Empty</h2>
            <p className="text-gray-400 font-medium mb-10 max-w-xs mx-auto text-sm leading-relaxed">
              Your bag is waiting for some delicious snacks. Let's fill it up!
            </p>
            <Link href="/shop">
              <Button className="h-14 px-10 rounded-2xl bg-gray-900 hover:bg-red-600 text-white font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95 text-[10px]">
                Browse Shop
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Items Column */}
            <div className="lg:col-span-8 space-y-4">
              {/* Flat Discount Requirement Notice */}
              {activeDiscounts.filter(rule => {
                const minOrder = Number(rule.minOrderAmount || 0);
                if (minOrder <= 0 || subtotal >= minOrder) return false;
                
                const hasApplicableItem = items.some(item => 
                  rule.allProducts || 
                  (rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === item.productId))
                );
                return hasApplicableItem;
              }).map((rule, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={idx} 
                  className="bg-amber-50 border border-amber-200 rounded-[24px] p-4 flex items-center gap-4 shadow-sm"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-amber-800 uppercase tracking-tight italic">
                      Add ৳{Math.round(Number(rule.minOrderAmount) - subtotal)} more for automatic {(rule.discountType === 'percentage' ? `${rule.discountAmount}%` : `৳${rule.discountAmount}`)} discount!
                    </p>
                    <p className="text-[9px] font-bold text-amber-600/60 uppercase tracking-widest mt-0.5">
                      Minimum order required: ৳{rule.minOrderAmount}
                    </p>
                  </div>
                </motion.div>
              ))}

              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => {
                    const itemKey = getItemKey(item);
                    return (
                      <motion.div
                        layout
                        key={itemKey}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group bg-white rounded-3xl p-5 flex items-center gap-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all border border-transparent hover:border-gray-100"
                      >
                        {/* Product Image */}
                        <div className="relative w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 group-hover:scale-105 transition-transform">
                          <Image
                            src={sanitizeProductImagePath(item.image || "")}
                            alt={item.productName}
                            fill
                            className="object-contain p-2"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight italic line-clamp-1">
                                {item.productName}
                              </h3>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {item.weight && (
                                  <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-widest">
                                    {item.weight}
                                  </span>
                                )}
                                {item.flavor && (
                                  <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-widest">
                                    {item.flavor}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => setDeleteId(itemKey)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
                              <button
                                onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:text-red-600 transition-all text-slate-400 active:scale-90"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-10 text-center text-xs font-black text-gray-900 tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:text-red-600 transition-all text-slate-400 active:scale-90"
                                disabled={item.stock !== undefined && item.quantity >= item.stock}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                {item.quantity > 1 ? `৳${item.price} x ${item.quantity}` : 'Price'}
                              </p>
                              <div className="flex items-center gap-1 font-black text-gray-900">
                                <span className="text-[10px] text-red-600">৳</span>
                                <span className="text-lg tracking-tighter tabular-nums">
                                  {Math.round(item.price * item.quantity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 px-4">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-[9px] font-black text-slate-400 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Cart
                </button>
              </div>
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-4 sticky top-24 space-y-6">
              {/* Free Delivery Progress */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-gray-50 overflow-hidden relative"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${cartDisplayTotal >= 1000 ? 'bg-green-600 shadow-lg shadow-green-100 rotate-6' : 'bg-red-600 shadow-lg shadow-red-100'}`}>
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-tight italic">
                        {cartDisplayTotal >= 1000 ? 'Free Delivery Unlocked!' : 'Free Delivery'}
                      </h3>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {cartDisplayTotal >= 1000 ? 'Your snacks ship for free' : `Spend ৳${Math.max(1000 - cartDisplayTotal, 0)} more`}
                      </p>
                    </div>
                  </div>
                  {cartDisplayTotal < 1000 && (
                    <div className="text-right">
                      <span className="text-[10px] font-black text-red-600 italic tracking-tighter bg-red-50 px-2 py-1 rounded-lg">
                        {Math.round(Math.min((cartDisplayTotal / 1000) * 100, 100))}%
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((cartDisplayTotal / 1000) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`absolute top-0 left-0 h-full rounded-full ${
                      cartDisplayTotal >= 1000 ? 'bg-green-500' : 'bg-red-600'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </motion.div>
                </div>
              </motion.div>

              <div className="bg-white rounded-[32px] p-8 shadow-2xl shadow-slate-200/50 border border-gray-50 flex flex-col gap-8 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/50 blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-1 bg-red-600 rounded-full" />
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Order Summary</span>
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Cart Total</h2>
                </div>


                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOTAL</p>
                        {(ruleDiscount || 0) > 0 && (
                          <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-[10px] font-black text-white bg-green-600 px-2 py-1 rounded-md uppercase tracking-tighter shadow-lg shadow-green-100 flex items-center gap-1"
                          >
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Saved ৳{Math.round(cartDisplaySaved)}
                          </motion.span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-4xl font-black text-gray-900 tracking-tighter tabular-nums italic text-right">
                      <span className="text-xl text-red-600 not-italic">৳</span>
                      <span>{Math.round(cartDisplayTotal)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-red-600 text-white font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-slate-200 active:scale-95 text-xs group"
                  >
                    <span className="flex items-center gap-3">
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </div>

                {/* Trust Elements */}
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                      <Truck className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Shipping Information</p>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold leading-relaxed uppercase tracking-[0.05em]">
                    Inside Dhaka: ৳80 | Outside Dhaka: ৳130<br />
                    Collection Point Pickup is free<br />
                    <span className="text-red-600">Free delivery on orders over ৳1000</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-[30px] flex items-center justify-center mx-auto mb-8">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight mb-4">Remove Item?</h3>
              <p className="text-gray-400 font-medium mb-10 text-sm leading-relaxed">
                Are you sure you want to remove this item from your cart?
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteId(null)}
                  className="flex-1 h-14 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (deleteId) removeItem(deleteId);
                    setDeleteId(null);
                  }}
                  className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[9px] shadow-lg shadow-red-100 transition-all"
                >
                  Remove
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Cart Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-[30px] flex items-center justify-center mx-auto mb-8">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight mb-4">Clear All?</h3>
              <p className="text-gray-400 font-medium mb-10 text-sm leading-relaxed">
                This will remove all items from your cart. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 h-14 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all"
                >
                  Wait, No
                </Button>
                <Button
                  onClick={() => {
                    clearCart();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[9px] shadow-lg shadow-red-100 transition-all"
                >
                  Clear All
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
