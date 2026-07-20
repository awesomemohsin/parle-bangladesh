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
    cart,
    items,
    removeItem,
    updateQuantity,
    total,
    subtotal,
    discountAmount,
    ruleDiscount,
    promoDiscount,
    circleDiscount,
    clearCart,
    isLoading,
    campaignNotices,
    freeShippingGranted,
    isSyncing,
    applyCircleDiscount,
    removeCircleDiscount
  } = useCart();
  const { user } = useAuth();
  const isDealer = !!(user && (
    ['super_admin', 'admin', 'moderator', 'owner'].includes(user.role) ||
    ['super_admin', 'admin', 'moderator', 'owner', 'dealer', 'employee'].includes(user.customerType || '')
  ));
  const isRetailer = user?.role === "customer" && user?.customerType === "retailer";
  const canInputManualQty = user && (["owner", "super_admin", "admin", "moderator"].includes(user.role) || isDealer || isRetailer);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());

  // Circle Network campaign rate selectors & inputs
  const [selectedRateOption, setSelectedRateOption] = useState<'original' | 'circle'>('original');
  const [isCircleModalOpen, setIsCircleModalOpen] = useState(false);
  const [circlePhone, setCirclePhone] = useState('');
  const [circleBillingId, setCircleBillingId] = useState('');
  const [isVerifyingCircle, setIsVerifyingCircle] = useState(false);
  const [circleError, setCircleError] = useState('');
  const [circleSuccess, setCircleSuccess] = useState('');
  const [shakingFields, setShakingFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (cart?.circleNetworkDiscount) {
      setSelectedRateOption('circle');
    } else {
      setCircleSuccess('');
    }
  }, [cart?.circleNetworkDiscount]);

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
    if (selectedRateOption === 'circle') {
      if (!cart?.circleNetworkDiscount) {
        setIsCircleModalOpen(true);
        return;
      }
    } else {
      if (cart?.circleNetworkDiscount) {
        removeCircleDiscount();
      }
    }
    setIsCheckingOut(true);
    router.push('/shop/checkout');
  };

  // Calculate cart-only totals (ignoring coupon)
  // Use the server-side calculated totals directly
  const circleDiscountVal = cart?.circleNetworkDiscount 
    ? (circleDiscount || 0) 
    : (selectedRateOption === 'circle' ? (subtotal * 0.1) : 0);

  const cartDisplayTotal = selectedRateOption === 'circle'
    ? (total - (cart?.circleNetworkDiscount ? 0 : circleDiscountVal))
    : (total + (cart?.circleNetworkDiscount ? (circleDiscount || 0) : 0));

  const cartDisplaySaved = (ruleDiscount || 0) + circleDiscountVal;

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
                                    <div className="transition-all duration-200">
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
                          className={`absolute top-0 left-0 h-full rounded-full ${isFreeDelivery ? 'bg-green-500' : 'bg-red-600'
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
                  {/* Option A: Original Rate */}
                  <div 
                    onClick={() => {
                      setSelectedRateOption('original');
                      if (cart?.circleNetworkDiscount) {
                        removeCircleDiscount();
                      }
                    }}
                    className={`flex justify-between items-center p-4 mb-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedRateOption === 'original'
                        ? 'border-gray-900 bg-white shadow-sm'
                        : 'border-transparent bg-transparent hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOTAL</p>
                        {(ruleDiscount || 0) > 0 && (
                          <span className="text-[8px] sm:text-[9px] font-black text-white bg-green-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            Saved ৳{Math.round(cartDisplaySaved)}
                          </span>
                        )}
                      </div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                        Standard Pricing Rate
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter tabular-nums italic leading-none">
                        <span className="text-base sm:text-xl text-red-600 not-italic">৳</span>
                        <span>
                          {Math.round(total + (cart?.circleNetworkDiscount ? (circleDiscount || 0) : 0))}
                        </span>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                        {selectedRateOption === 'original' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Option B: Circle Network Rate */}
                  {!cart?.circleNetworkDiscount ? (
                    <div
                      onClick={() => {
                        setSelectedRateOption('circle');
                        setIsCircleModalOpen(true);
                      }}
                      className={`flex justify-between items-center p-4 mb-6 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedRateOption === 'circle'
                          ? 'border-amber-500 bg-amber-50/20 shadow-sm'
                          : 'border-transparent bg-transparent hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="text-left max-w-[150px] sm:max-w-none">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          <p className="text-[10px] sm:text-xs font-black text-amber-900 uppercase tracking-wider leading-tight">
                            Flat 10% off for Circle Network Users
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-2xl sm:text-4xl font-black text-amber-600 tracking-tighter tabular-nums italic leading-none">
                            <span className="text-base sm:text-xl text-amber-500 not-italic">৳</span>
                            <span>{Math.round(total * 0.9)}</span>
                          </div>
                          <p className="text-[8px] font-bold text-gray-400 line-through leading-none mt-0.5">
                            ৳{Math.round(total)}
                          </p>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                          {selectedRateOption === 'circle' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setSelectedRateOption('circle')}
                      className={`flex justify-between items-center p-4 mb-6 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedRateOption === 'circle'
                          ? 'border-amber-500 bg-amber-50/20 shadow-sm'
                          : 'border-transparent bg-transparent hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="text-left max-w-[150px] sm:max-w-none">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <p className="text-[10px] sm:text-xs font-black text-amber-900 uppercase tracking-wider leading-tight">
                            Circle Network Applied (ID: {cart.circleNetworkDiscount.id})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-2xl sm:text-4xl font-black text-amber-600 tracking-tighter tabular-nums italic leading-none">
                          <span className="text-base sm:text-xl text-amber-500 not-italic">৳</span>
                          <span>{Math.round(total)}</span>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 border-amber-500 flex items-center justify-center shrink-0">
                          {selectedRateOption === 'circle' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-red-600 text-white font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-slate-200 active:scale-95 text-xs group disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-3">
                      Proceed to Checkout
                      {isSyncing ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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

      {/* Circle Network Campaign Verification Modal */}
      <AnimatePresence>
        {isCircleModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCircleModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-amber-100 shadow-2xl overflow-hidden text-center"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl -mr-16 -mt-16 pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setIsCircleModalOpen(false)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-gray-100/70 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all"
                aria-label="Close modal"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              {/* Centered & Larger Logos */}
              <div className="flex flex-col items-center justify-center mb-5 pt-2">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <a
                    href="https://circlenetworkbd.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-85 transition-opacity"
                    title="Visit Circle Network"
                  >
                    <img 
                      src="/circle-logo-en.svg" 
                      alt="Circle Network" 
                      className="h-12 sm:h-14 w-auto object-contain"
                    />
                  </a>
                  <span className="text-gray-300 font-light text-2xl">×</span>
                  <img 
                    src="/logo.png" 
                    alt="Parle" 
                    className="h-10 sm:h-12 w-auto object-contain"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-snug">
                  Flat 10% OFF for{" "}
                  <a
                    href="https://circlenetworkbd.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:text-amber-600 underline decoration-amber-400/50 hover:decoration-amber-500 transition-colors"
                  >
                    Circle Network
                  </a>{" "}
                  User 😀
                </h3>
              </div>

              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest leading-relaxed mb-6 text-center">
                Provide your registered contact number and Customer ID to apply your flat 10% Circle Network partner discount.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className={`flex-1 ${shakingFields.circlePhone ? 'animate-shake' : ''}`}>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Registered Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g., 01XXXXXXXXX"
                      value={circlePhone}
                      onChange={(e) => setCirclePhone(e.target.value)}
                      className={`w-full bg-white border ${shakingFields.circlePhone ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs font-bold transition-all outline-none`}
                    />
                  </div>
                  <div className={`flex-1 ${shakingFields.circleBillingId ? 'animate-shake' : ''}`}>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Customer ID</label>
                    <input
                      type="text"
                      placeholder="e.g., 12345"
                      value={circleBillingId}
                      onChange={(e) => setCircleBillingId(e.target.value)}
                      className={`w-full bg-white border ${shakingFields.circleBillingId ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs font-bold transition-all outline-none`}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (isVerifyingCircle) return;
                    
                    const mobileRegex = /^01[3-9]\d{8}$/;
                    const phoneClean = circlePhone.trim();
                    const shakeMap: Record<string, boolean> = {};

                    if (!phoneClean || phoneClean.length !== 11 || !mobileRegex.test(phoneClean)) {
                      shakeMap.circlePhone = true;
                      setCircleError("Please enter a valid 11-digit BD mobile number (e.g. 01XXXXXXXXX).");
                    }
                    if (!circleBillingId.trim()) {
                      shakeMap.circleBillingId = true;
                    }

                    if (Object.keys(shakeMap).length > 0) {
                      setShakingFields(shakeMap);
                      setTimeout(() => setShakingFields({}), 500);
                      return;
                    }

                    setCircleError('');
                    setCircleSuccess('');
                    setIsVerifyingCircle(true);

                    try {
                      const res = await fetch('/api/discounts/verify-circle-user', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          contactNumber: circlePhone,
                          billingId: circleBillingId
                        })
                      });

                      const data = await res.json();
                      if (res.ok) {
                        applyCircleDiscount(data.client.id, data.client.contact_number);
                        setCircleSuccess(`Success! 10% Circle Network partner rate applied.`);
                        setTimeout(() => {
                          setIsCircleModalOpen(false);
                          setIsCheckingOut(true);
                          router.push('/shop/checkout');
                        }, 1000);
                      } else {
                        setCircleError(data.error || 'Verification failed. Please check inputs.');
                      }
                    } catch (err) {
                      setCircleError('Unable to reach validation server. Please try again.');
                    } finally {
                      setIsVerifyingCircle(false);
                    }
                  }}
                  disabled={isVerifyingCircle}
                  className="w-full bg-amber-600 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-amber-700 transition-colors active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 shadow-lg shadow-amber-600/10"
                >
                  {isVerifyingCircle ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Apply & Checkout'
                  )}
                </button>
              </div>

              {circleError && (
                <p className="mt-3 text-[9px] font-black text-red-600 uppercase tracking-widest text-center">{circleError}</p>
              )}
              {circleSuccess && (
                <p className="mt-3 text-[9px] font-black text-green-600 uppercase tracking-widest text-center">{circleSuccess}</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
