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
  Tag,
  Check,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, getItemKey } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { sanitizeProductImagePath } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ShopLoading from "../loading";

// Pricing and discount calculations are now computed strictly on the server side.

function CollapsibleOffers({ notices }: { notices: any[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-amber-200 bg-amber-50/20 rounded-[24px] overflow-hidden transition-all duration-300 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-left text-amber-900 font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-amber-50/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-600 animate-pulse" />
          Unlock More Offers ({notices.length} available)
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-4 h-4 text-amber-600" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-amber-100 bg-white/50"
          >
            <div className="p-4 space-y-3">
              {notices.map((notice, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 border border-amber-100/50 rounded-xl p-3.5 flex items-start gap-3 shadow-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tight text-amber-900 leading-normal italic">
                      {notice.offer}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-amber-500 mt-0.5">
                      {notice.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
    isLoading,
    campaignNotices,
    freeShippingGranted,
    isSyncing
  } = useCart();
  const { user } = useAuth();
  const isDealer = (user?.role === "customer" && user?.customerType === "dealer") || user?.role === "owner";
  const isRetailer = user?.role === "customer" && user?.customerType === "retailer";
  const canInputManualQty = user && (["owner", "super_admin", "admin", "moderator"].includes(user.role) || isDealer || isRetailer);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [mounted]);

  useEffect(() => {
    if (!isSyncing) {
      setUpdatingKeys(new Set());
    }
  }, [isSyncing]);

  const handleUpdateQuantity = (key: string, newQty: number) => {
    setUpdatingKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    updateQuantity(key, newQty);
  };

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsNavigating(true);
    router.push(href);
  };

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
  // Use the server-side calculated totals directly
  const cartDisplayTotal = total;
  const cartDisplaySaved = ruleDiscount || 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 relative">
      <AnimatePresence>
        {(isCheckingOut || isNavigating) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999]"
          >
            <ShopLoading />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 rotate-3 group-hover:rotate-6 transition-transform flex-shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-gray-900 italic tracking-tighter uppercase leading-none">Your Cart</h1>
              <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 sm:mt-2">
                {items.length} {items.length === 1 ? 'Product' : 'Products'} Selected
              </p>
            </div>
          </div>

          <a href="/shop" onClick={(e) => handleLinkClick(e, '/shop')}>
            <Button variant="ghost" className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:text-red-600 gap-1.5 sm:gap-2 px-2.5 sm:px-4">
              Continue <span className="hidden sm:inline">Shopping</span> <ArrowRight className="w-3 h-3" />
            </Button>
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl sm:rounded-[40px] p-8 sm:p-20 text-center shadow-xl shadow-slate-200/50 border border-gray-50 max-w-2xl mx-auto mt-6 sm:mt-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-[30px] sm:rounded-[35px] flex items-center justify-center mx-auto mb-6 sm:mb-8 relative">
              <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200" />
              <div className="absolute -top-1 -right-1 w-5.5 h-5.5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center border-4 border-white">
                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase italic tracking-tight mb-3 sm:mb-4">Cart is Empty</h2>
            <p className="text-gray-400 font-medium mb-8 sm:mb-10 max-w-xs mx-auto text-xs sm:text-sm leading-relaxed">
              Your bag is waiting for some delicious snacks. Let's fill it up!
            </p>
            <a href="/shop" onClick={(e) => handleLinkClick(e, '/shop')}>
              <Button className="h-12 sm:h-14 px-8 sm:px-10 rounded-2xl bg-gray-900 hover:bg-red-600 text-white font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95 text-[9px] sm:text-[10px]">
                Browse Shop
              </Button>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
            {/* Items Column */}
            <div className="lg:col-span-8 space-y-4">
              {/* Unlocked Campaign Alerts */}
              {campaignNotices?.filter(notice => (notice as any).unlocked).map((notice, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`unlocked-${idx}`} 
                  className="border rounded-[24px] p-4 flex items-center gap-4 shadow-sm bg-emerald-50 border-emerald-200"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-tight italic text-emerald-800">
                      {notice.offer}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mt-0.5">
                      {notice.action}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Collapsible Locked Campaign Alerts */}
              {(() => {
                const lockedNotices = campaignNotices?.filter(notice => !(notice as any).unlocked) || [];
                return lockedNotices.length > 0 ? (
                  <CollapsibleOffers notices={lockedNotices} />
                ) : null;
              })()}

              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => {
                    const itemKey = getItemKey(item);
                    const productLink = `/shop/products/${item.productSlug}?weight=${encodeURIComponent(item.weight || '')}&flavor=${encodeURIComponent(item.flavor || '')}`;
                    return (
                      <motion.div
                        layout
                        key={itemKey}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group bg-white rounded-3xl p-3.5 sm:p-5 flex items-start sm:items-center gap-3.5 sm:gap-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all border border-transparent hover:border-gray-100"
                      >
                        {/* Product Image */}
                        <a 
                          href={productLink} 
                          onClick={(e) => handleLinkClick(e, productLink)} 
                          className="relative w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 group-hover:scale-105 transition-transform cursor-pointer"
                        >
                          <Image
                            src={sanitizeProductImagePath(item.image || "")}
                            alt={item.productName}
                            fill
                            sizes="(max-width: 640px) 80px, 96px"
                            className="object-contain p-2"
                          />
                        </a>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-1 sm:mb-2">
                            <div className="min-w-0 flex-1">
                              <a 
                                href={productLink} 
                                onClick={(e) => handleLinkClick(e, productLink)} 
                                className="hover:text-red-600 transition-colors"
                              >
                                <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-tight italic line-clamp-2 sm:line-clamp-1 cursor-pointer pr-2">
                                  {item.productName}
                                </h3>
                              </a>
                              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                                {item.weight && (
                                  <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-widest">
                                    {item.weight}
                                  </span>
                                )}
                                {item.flavor && (
                                  <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-widest">
                                    {item.flavor}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => setDeleteId(itemKey)}
                              className="p-1.5 sm:p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-3 sm:mt-4">
                            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-50 rounded-xl p-0.5 sm:p-1 border border-slate-100 flex-shrink-0">
                              <button
                                onClick={() => handleUpdateQuantity(itemKey, item.quantity - 1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-white hover:text-red-600 transition-all text-slate-400 active:scale-90"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </button>
                              <span className="w-8 sm:w-10 text-center text-[11px] sm:text-xs font-black text-gray-900 tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(itemKey, item.quantity + 1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-white hover:text-red-600 transition-all text-slate-400 active:scale-90"
                                disabled={!canInputManualQty && item.stock !== undefined && item.quantity >= item.stock}
                              >
                                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </button>
                            </div>

                            {(() => {
                              const originalTotal = item.price * item.quantity;
                              const discountedTotal = item.discountedTotal;
                              return (
                                <div className="text-right min-w-[70px] sm:min-w-[80px] flex-shrink-0">
                                  <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                    {item.quantity > 1 ? `৳${item.price} x ${item.quantity}` : 'Price'}
                                  </p>
                                  <div className="flex flex-col items-end justify-center min-h-[36px] sm:min-h-[40px]">
                                    <div className={`transition-opacity duration-200 ${isSyncing && updatingKeys.has(itemKey) ? 'opacity-50' : 'opacity-100'}`}>
                                      {discountedTotal !== undefined && discountedTotal < originalTotal ? (
                                        <>
                                          <div className="flex items-center gap-1 font-bold text-gray-400 text-[10px] sm:text-xs line-through">
                                            <span>৳</span>
                                            <span>{originalTotal}</span>
                                          </div>
                                          <div className="flex items-center gap-0.5 sm:gap-1 font-black text-green-600">
                                            <span className="text-[9px] sm:text-[10px]">৳</span>
                                            <span className="text-sm sm:text-lg tracking-tighter tabular-nums">
                                              {discountedTotal}
                                            </span>
                                          </div>
                                          <span className="text-[7px] sm:text-[8px] font-black text-white bg-green-500 px-1 sm:px-1.5 py-0.5 rounded uppercase tracking-tighter mt-0.5 sm:mt-1">
                                            Saved ৳{originalTotal - discountedTotal}
                                          </span>
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-0.5 sm:gap-1 font-black text-gray-900">
                                          <span className="text-[9px] sm:text-[10px] text-red-600">৳</span>
                                          <span className="text-sm sm:text-lg tracking-tighter tabular-nums">
                                            {originalTotal}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
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
                {(() => {
                  const isB2BUser = isDealer || isRetailer;
                  const isFreeDelivery = cartDisplayTotal >= 1000 || !!freeShippingGranted || isB2BUser;
                  const progressPercent = isFreeDelivery ? 100 : Math.min((cartDisplayTotal / 1000) * 100, 100);
                  return (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isFreeDelivery ? 'bg-green-600 shadow-lg shadow-green-100 rotate-6' : 'bg-red-600 shadow-lg shadow-red-100'}`}>
                            <Truck className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-tight italic">
                              {isFreeDelivery ? 'Free Delivery Unlocked!' : 'Free Delivery'}
                            </h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                              {isFreeDelivery ? 'Your snacks ship for free' : `Spend ৳${Math.max(1000 - cartDisplayTotal, 0)} more`}
                            </p>
                          </div>
                        </div>
                        {!isFreeDelivery && (
                          <div className="text-right">
                            <span className="text-[10px] font-black text-red-600 italic tracking-tighter bg-red-50 px-2 py-1 rounded-lg">
                              {Math.round(progressPercent)}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`absolute top-0 left-0 h-full rounded-full ${
                            isFreeDelivery ? 'bg-green-500' : 'bg-red-600'
                          }`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </motion.div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>

              <div className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-2xl shadow-slate-200/50 border border-gray-50 flex flex-col gap-6 sm:gap-8 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/50 blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-1 bg-red-600 rounded-full" />
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Order Summary</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Cart Total</h2>
                </div>


                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center sm:items-end mb-6 gap-2">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 mb-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOTAL</p>
                        {(ruleDiscount || 0) > 0 && (
                          <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-[9px] sm:text-[10px] font-black text-white bg-green-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-tighter shadow-lg shadow-green-100 flex items-center gap-1 w-fit whitespace-nowrap"
                          >
                            <ShieldCheck className="w-2.5 h-2.5 animate-pulse" />
                            Saved ৳{Math.round(cartDisplaySaved)}
                          </motion.span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter tabular-nums italic text-right flex-shrink-0">
                      <span className="text-base sm:text-xl text-red-600 not-italic">৳</span>
                      <span className={`transition-opacity duration-200 ${isSyncing ? 'opacity-50' : 'opacity-100'}`}>
                        {Math.round(cartDisplayTotal)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={isCheckingOut || isSyncing}
                    className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-red-600 text-white font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-slate-200 active:scale-95 text-xs group disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-3">
                      {isSyncing ? (
                        <>
                          Recalculating
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        </>
                      ) : (
                        <>
                          Proceed to Checkout
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
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
                    {isDealer || isRetailer ? (
                      <span className="text-green-600 font-extrabold">✨ B2B Free Delivery Activated</span>
                    ) : (
                      <span className="text-red-600">Free delivery on orders over ৳1000</span>
                    )}
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
