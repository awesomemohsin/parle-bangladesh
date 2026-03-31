'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, Plus, Minus, ArrowLeft, Truck, Zap, ArrowRight, Tag, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart, getItemKey } from '@/hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  useState(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Cart | Parle Bangladesh';
    }
  });

  const { items, total, removeItem, updateQuantity, clearCart, applyPromo, removePromo, promoCode, discountAmount } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  
  // Modal states
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isFreeDelivery = total >= 1000;
  const shippingCost = (items.length > 0 && !isFreeDelivery) ? 80 : 0;
  const currentDiscount = discountAmount || 0;
  const grandTotal = total + shippingCost - currentDiscount;
  const amountToFree = 1000 - total;

  const handleApplyPromo = () => {
    if (promoInput.toUpperCase() === 'PARLE10') {
      applyPromo('PARLE10', total * 0.1);
      setPromoError('');
    } else {
      setPromoError('Invalid code');
    }
  };

  const handleCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      window.location.href = '/shop/checkout';
    }, 300);
  };

  const confirmDelete = () => {
    if (deleteId) {
      removeItem(deleteId);
      setDeleteId(null);
    }
  };

  const confirmClear = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-red-50 font-sans">
      {/* Modals Container */}
      <AnimatePresence>
        {(deleteId || showClearConfirm) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                 <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center uppercase tracking-tight mb-2">
                {deleteId ? "Remove Item?" : "Clear Cart?"}
              </h3>
              <p className="text-gray-500 text-center text-xs font-bold uppercase tracking-widest leading-relaxed mb-8">
                {deleteId 
                  ? "Are you sure you want to remove this product from your cart?" 
                  : "Are you sure you want to remove all items from your cart?"}
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => { setDeleteId(null); setShowClearConfirm(false); }}
                   className="h-12 rounded-xl bg-slate-100 text-gray-600 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={deleteId ? confirmDelete : confirmClear}
                   className="h-12 rounded-xl bg-white text-black font-bold uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95 border border-slate-200"
                 >
                   {deleteId ? "Remove" : "Clear All"}
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/shop" className="flex items-center gap-2 text-gray-400 hover:text-red-600 mb-4 transition-colors group">
            <div className="w-7 h-7 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest">Back to Shop</span>
          </Link>
          <div className="flex items-end justify-between">
            <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-tight leading-none">Your Cart</h1>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{items.length} Items</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
               <Truck className="w-8 h-8 text-slate-200" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 uppercase tracking-tight">Your cart is empty</h2>
            <p className="text-gray-400 mb-8 font-bold uppercase text-[9px] tracking-widest">Add some snacks to your cart</p>
            <Link href="/shop">
              <Button className="h-12 px-10 rounded-xl bg-red-600 hover:bg-black text-white font-bold uppercase tracking-widest transition-all active:scale-95">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cart Items Column */}
            <div className="lg:col-span-8 space-y-6">
              {/* SLIM LANDSCAPE PROMO BANNER */}
              <AnimatePresence mode="wait">
                {!isFreeDelivery ? (
                  <motion.div 
                    key="unlock"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-red-600 rounded-2xl p-6 text-white shadow-xl shadow-red-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group border border-red-500"
                  >
                    <div className="absolute top-0 right-0 w-48 h-full bg-white/5 skew-x-[-20deg] translate-x-16 group-hover:translate-x-12 transition-transform duration-700" />
                    <div className="flex items-center gap-4 relative z-10">
                       <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                          <Zap className="w-6 h-6 text-white fill-white animate-pulse" />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold uppercase tracking-tight leading-none mb-1.5 italic">Free Delivery Offer</h3>
                          <p className="text-[9px] text-red-100 font-bold uppercase tracking-widest opacity-90">
                            Add <span className="text-white text-sm mx-1">৳ {Math.round(amountToFree)}</span> more for free delivery
                          </p>
                       </div>
                    </div>
                    <div className="w-full md:w-40 relative z-10">
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden p-0.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(total / 1000) * 100}%` }}
                          className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                         <span className="text-[7px] font-black uppercase tracking-widest text-white/40">In Progress</span>
                         <span className="text-[7px] font-black uppercase tracking-widest text-white">{Math.round((total / 1000) * 100)}%</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="activated"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-zinc-900 rounded-2xl p-6 text-white shadow-xl shadow-zinc-200 flex items-center justify-between gap-4 border-2 border-green-500/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                         <Truck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold uppercase tracking-tight leading-none mb-1 text-green-400">Free Delivery Unlocked!</h3>
                         <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest text-wrap">Congratulations! Your delivery is now free.</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500 hidden md:block" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Items List */}
              <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/30 overflow-hidden border border-gray-50">
                <div className="divide-y divide-gray-50">
                  {items.map(item => {
                    const itemKey = getItemKey(item);
                    return (
                    <div
                      key={itemKey}
                      className="p-6 flex flex-col md:flex-row gap-6 items-center group transition-all hover:bg-slate-50/30"
                    >
                      <div className="w-28 h-28 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-50 p-4 shadow-inner relative">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-3xl">
                            📦
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/shop/products/${item.productSlug}`}
                              className="text-lg font-bold text-gray-900 hover:text-red-600 transition-colors uppercase tracking-tight leading-none block mb-2"
                            >
                              {item.productName}
                            </Link>
                            <div className="flex flex-wrap gap-1.5">
                              {(item.weight || (item as any).variationWeight) && (
                                <span className="bg-red-600 text-white px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                                  {item.weight || (item as any).variationWeight}
                                </span>
                              )}
                              {(item.flavor || (item as any).variationFlavor) && (
                                <span className="bg-red-600 text-white px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                                  {item.flavor || (item as any).variationFlavor}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="flex items-center justify-end gap-1 text-gray-900">
                                <span className="text-[10px] font-black text-red-600">৳</span>
                                <span className="text-xl font-black tracking-tight">{Math.round(item.price)}</span>
                             </div>
                             <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Price</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 bg-slate-100/50 p-1.5 rounded-xl border border-transparent">
                          <div className="flex items-center h-10 bg-white rounded-lg shadow-sm border border-gray-100 focus-within:ring-2 ring-red-600/10 transition-all overflow-hidden">
                            <button
                              onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                              className="w-10 h-full flex items-center justify-center text-gray-400 hover:bg-slate-50 hover:text-red-600 transition-all disabled:opacity-20"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(itemKey, parseInt(e.target.value) || 1)
                              }
                              className="w-10 bg-transparent text-center border-0 focus:outline-none font-black text-gray-900 text-sm"
                            />
                            <button
                              onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                              className="w-10 h-full flex items-center justify-center text-gray-400 hover:bg-slate-50 hover:text-red-600 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => setDeleteId(itemKey)}
                            className="bg-white hover:bg-red-50 text-gray-300 hover:text-red-600 p-2.5 rounded-lg transition-all group/btn shadow-sm border border-gray-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              </div>

              <div className="flex items-center justify-between py-4 px-2">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-[9px] font-black text-gray-300 uppercase tracking-widest hover:text-red-600 transition-colors"
                >
                  Clear Cart
                </button>
                <Link href="/shop" className="text-[9px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 group">
                  Add more items <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-4 sticky top-24 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/30 border border-gray-50 flex flex-col gap-6">
                <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight italic">Summary</h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center group cursor-default">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">Subtotal</span>
                    <div className="flex items-center gap-1 font-black text-gray-900">
                      <span className="text-[10px] text-red-600">৳</span>
                      <span className="text-lg tracking-tight">{Math.round(total)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center group cursor-default">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">Delivery</span>
                    <div className={`flex items-center gap-1 font-black ${isFreeDelivery ? 'text-green-600' : 'text-gray-900'}`}>
                      {isFreeDelivery ? (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Free</span>
                      ) : (
                        <>
                          <span className="text-[10px]">৳</span>
                          <span className="text-lg tracking-tight">80</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* PROMO CODE SECTION */}
                  <div className="py-4 border-y border-slate-50">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-3">Promo Code?</label>
                    <div className="flex gap-1.5">
                       <input 
                         type="text" 
                         placeholder="Code"
                         value={promoInput}
                         onChange={(e) => setPromoInput(e.target.value)}
                         className="flex-1 bg-slate-50 border border-transparent focus:border-black rounded-lg px-3 py-2 text-[10px] font-bold transition-all"
                       />
                       <button 
                         onClick={handleApplyPromo}
                         className="bg-white text-black border border-slate-200 px-4 rounded-lg text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-colors active:scale-95"
                       >
                         Apply
                       </button>
                    </div>
                    <AnimatePresence>
                      {promoCode && (
                         <motion.div 
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           className="mt-3 flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100 overflow-hidden"
                         >
                            <span className="text-[8px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5">
                               <Tag className="w-2.5 h-2.5" /> {promoCode} Applied
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-green-600">- ৳ {Math.round(currentDiscount)}</span>
                              <button onClick={removePromo} className="text-green-400 hover:text-red-500 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                         </motion.div>
                      )}
                    </AnimatePresence>
                    {promoError && (
                       <p className="mt-1.5 text-[8px] font-black text-red-600 uppercase tracking-widest text-center">{promoError}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total</p>
                    <div className="flex items-center gap-1.5 text-3xl font-black text-red-600 tracking-tighter tabular-nums">
                      <span className="text-lg">৳</span>
                      <span>{Math.round(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full h-14 rounded-xl bg-red-600 hover:bg-black text-white font-black uppercase tracking-widest transition-all shadow-xl shadow-red-100 active:scale-95 text-[10px] group border-red-500"
                >
                  <span className="group-hover:tracking-[0.15em] transition-all">Checkout</span>
                </Button>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                   <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                      <Truck className="w-4 h-4 text-red-600" />
                   </div>
                   <p className="text-[8px] text-gray-500 font-bold leading-relaxed uppercase tracking-widest px-2">
                    {isFreeDelivery 
                      ? "You've unlocked free delivery for this order!" 
                      : "Standard delivery charge is ৳ 80."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
