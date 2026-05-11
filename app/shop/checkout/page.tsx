'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart, getItemKey } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { BD_DISTRICTS } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderState {
  status: 'form' | 'confirming' | 'success' | 'error';
  orderId?: string;
  finalSubtotal?: number;
  finalShippingCost?: number;
  finalDiscountAmount?: number;
  finalDeliveryMethod?: 'shipping' | 'pickup';
  error?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, subtotal, clearCart, promoCode, promoDetails, discountAmount, promoDiscount, ruleDiscount, isRestricted, isLoading, applyPromo, removePromo } = useCart();
  const { logout } = useAuth();
  const [orderState, setOrderState] = useState<OrderState>({ status: 'form' });
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoError('');
    
    try {
      const pIds = items.map(item => item.productId).join(',');
      const res = await fetch(`/api/promo-codes/validate?code=${promoInput.toUpperCase()}&subtotal=${subtotal}&productIds=${pIds}`);
      const data = await res.json();
      
      if (res.ok) {
        applyPromo(data);
        setPromoInput('');
        setShowSuccessAlert(true);
        // Hide alert after 5 seconds
        setTimeout(() => setShowSuccessAlert(false), 5000);
      } else {
        setPromoError(data.error || 'Invalid code');
      }
    } catch (err) {
      setPromoError('Failed to validate code');
    }
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Dhaka',
    postalCode: '',
    shippingAddress: '',
    shippingCity: 'Dhaka',
    shippingPostalCode: '',
    instruction: '',
    paymentMethod: 'cash_on_delivery',
  });
  const [deliveryMethod, setDeliveryMethod] = useState<'shipping' | 'pickup'>('shipping');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [prefilled, setPrefilled] = useState({ name: false, email: false, phone: false });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.title = 'Checkout | Parle Bangladesh';
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setFormData(prev => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
          phone: user.mobile || prev.phone,
        }));
        setPrefilled({
          name: !!user.name,
          email: !!user.email,
          phone: !!user.mobile
        });
      } catch (e) { }
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isLoading && items.length === 0) {
    return (
      <div className="min-h-screen bg-white font-sans p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="h-10 w-48 bg-slate-100 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full bg-slate-50 animate-pulse rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && orderState.status !== 'success') {
    return (
      <div className="min-h-screen bg-white font-sans p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Link href="/shop" className="flex items-center gap-2 text-amber-700 hover:text-amber-800 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold">Back to Shop</span>
          </Link>
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4 uppercase tracking-tight">Your cart is empty</h1>
            <p className="text-gray-500 mb-8 font-bold uppercase text-[10px] tracking-widest">Add products before checking out.</p>
            <Link href="/shop">
              <Button className="bg-amber-700 hover:bg-black text-white h-14 px-10 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Use the synchronized values from the CartContext (server-side calculation)
  // Note: we might need to handle shipping cost locally as it depends on the form
  const isFreeDelivery = subtotal >= 1000;
  const destinationCity = sameAsBilling ? formData.city : formData.shippingCity;
  const baseShippingCharge = destinationCity === 'Dhaka' ? 80 : 130;
  const currentShippingCost = deliveryMethod === 'pickup' ? 0 : (isFreeDelivery ? 0 : baseShippingCharge);
  
  // The final total should be (subtotal - ruleDiscount - promoDiscount) + shippingCost
  const grandTotal = Math.max(0, (subtotal - (ruleDiscount || 0) - (promoDiscount || 0)) + currentShippingCost);
  const displayPromoDiscount = promoDiscount || 0;
  const shippingCost = currentShippingCost;
  const productSubtotal = subtotal;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleSameAsBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSameAsBilling(e.target.checked);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentSubtotal = subtotal; // Use original price for the database subtotal field
    setOrderState({ status: 'confirming' });

    try {
      // Prepare order items
      const orderItems = items.map(item => ({
        productSlug: item.productSlug,
        quantity: item.quantity,
        weight: item.weight,
        flavor: item.flavor,
        image: item.image,
        price: item.price,
        name: item.productName,
      }));

      // Create order
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          items: orderItems,
          billingAddress: {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            city: formData.city,
            postalCode: formData.postalCode,
          },
          shippingAddress: {
            address: sameAsBilling ? formData.address : formData.shippingAddress,
            city: sameAsBilling ? formData.city : formData.shippingCity,
            postalCode: sameAsBilling ? formData.postalCode : formData.shippingPostalCode,
          },
          instruction: formData.instruction,
          paymentMethod: formData.paymentMethod,
          deliveryMethod,
          promoCode,
          discountAmount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) logout();
        throw new Error(data.error || 'Failed to place order');
      }

      const order = await response.json();
      clearCart();
      router.push(`/shop/order-received/${order.id}`);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setOrderState({
        status: 'error',
        error: message,
      });
    }
  };


  // Error State
  if (orderState.status === 'error') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Link href="/shop/cart" className="flex items-center gap-2 text-amber-700 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Failed</h1>
            <p className="text-red-600 text-lg mb-8">{orderState.error}</p>
            <Link href="/shop/checkout">
              <Button className="bg-amber-700 hover:bg-amber-800 text-white">
                Try Again
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Checkout Form
  return (
    <div className="min-h-screen bg-white font-sans p-8">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/shop/cart" className="flex items-center gap-2 text-amber-700 hover:text-amber-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Success Alert */}
        <AnimatePresence>
          {showSuccessAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-5 flex items-center gap-3 bg-[#f3f9f1] border border-[#d6e9c6] p-4 rounded-md shadow-sm"
            >
              <div className="w-6 h-6 bg-[#82b440] rounded flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-600">Coupon code applied successfully.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Checkout Form - Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contact Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 pb-2 border-b">Contact Information</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      readOnly={prefilled.name}
                      className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all ${prefilled.name ? 'opacity-70 cursor-not-allowed' : ''}`}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      readOnly={prefilled.email}
                      className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all ${prefilled.email ? 'opacity-70 cursor-not-allowed' : ''}`}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    readOnly={prefilled.phone}
                    className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all ${prefilled.phone ? 'opacity-70 cursor-not-allowed' : ''}`}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="border-t pt-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2 pb-2 border-b">Billing Address</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Street Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                    placeholder="House #, Road #"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City / District *</label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all appearance-none"
                    >
                      {BD_DISTRICTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Postal Code *</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                      placeholder="1000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Method Selection */}
            <div className="border-t pt-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2 pb-2 border-b">Delivery Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${deliveryMethod === 'shipping' ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input type="radio" className="hidden" checked={deliveryMethod === 'shipping'} onChange={() => setDeliveryMethod('shipping')} />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">Home Delivery</span>
                    <span className="text-[11px] text-gray-500 mt-1">Inside Dhaka: ৳ 80 | Outside Dhaka: ৳ 130</span>
                  </div>
                </label>
                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${deliveryMethod === 'pickup' ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input type="radio" className="hidden" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">Collection Point Pickup</span>
                    <span className="text-sm text-gray-500">Free pickup from our location</span>
                  </div>
                </label>
              </div>
              {deliveryMethod === 'pickup' && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-bold text-amber-800 mb-2">Pickup Location:</p>
                  <p className="text-sm text-amber-900 font-medium mb-1">
                    Yassin Tower, Savar Palli Bidyut Bazar Road, Dendabor, Ashulia, Savar, Dhaka 1344.
                  </p>
                  <p className="text-sm text-amber-700">Please collect your order from our official collection point.</p>
                  <a href="https://maps.app.goo.gl/pp3pwo3hyPm87ST79" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-red-600 hover:text-red-700 font-bold text-sm underline">
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>

            {/* Shipping Information */}
            {deliveryMethod === 'shipping' && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2 pb-2 border-b">
                  <h2 className="text-xl font-bold text-gray-900">Shipping Information</h2>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={handleSameAsBillingChange}
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-600"
                    />
                    <span className="text-sm text-gray-600">Same as billing address</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shipping Address *</label>
                      <input
                        type="text"
                        name="shippingAddress"
                        value={sameAsBilling ? formData.address : formData.shippingAddress}
                        onChange={handleInputChange}
                        required
                        readOnly={sameAsBilling}
                        className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all ${sameAsBilling ? 'opacity-70 cursor-not-allowed text-gray-500' : ''}`}
                        placeholder="House #, Road #"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shipping City / District *</label>
                      <select
                        name="shippingCity"
                        value={sameAsBilling ? formData.city : formData.shippingCity}
                        onChange={handleInputChange}
                        required
                        disabled={sameAsBilling}
                        className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all appearance-none ${sameAsBilling ? 'opacity-70 cursor-not-allowed text-gray-500' : ''}`}
                      >
                        {BD_DISTRICTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shipping Postal Code *</label>
                      <input
                        type="text"
                        name="shippingPostalCode"
                        value={sameAsBilling ? formData.postalCode : formData.shippingPostalCode}
                        onChange={handleInputChange}
                        required
                        readOnly={sameAsBilling}
                        className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all ${sameAsBilling ? 'opacity-70 cursor-not-allowed text-gray-500' : ''}`}
                        placeholder="1000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Sticky Container) */}
          <div className="space-y-4 lg:sticky lg:top-8 h-fit">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-2 pb-2 border-b">Order Summary</h2>

              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {items.map(item => {
                  const itemKey = getItemKey(item);
                  return (
                    <div key={itemKey} className="flex justify-between text-sm gap-2">
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-medium">{item.productName} x {item.quantity}</span>
                        {(item.weight || item.flavor) && (
                          <span className="text-xs text-gray-500">
                            {[item.weight, item.flavor].filter(Boolean).join(" | ")}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900">
                        ৳ {Math.round(item.price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 text-left mb-4 border-t pt-3">
                {/* Subtotal (Discounted by flat rules) */}
                <div className="flex justify-between">
                  <span className="text-gray-600 font-bold uppercase text-[9px] tracking-widest">Subtotal</span>
                  <span className="font-semibold text-gray-900">৳ {Math.round(productSubtotal)}</span>
                </div>

                {/* Delivery Charge */}
                <div className="flex justify-between">
                  <span className="text-gray-600 font-bold uppercase text-[9px] tracking-widest">Delivery Charge</span>
                  <span className="font-semibold text-gray-900">৳ {Math.round(shippingCost)}</span>
                </div>
                
                {/* Coupon Discount */}
                {promoCode && (
                  <div className="border-t border-gray-100 py-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold uppercase text-[9px] tracking-widest text-gray-500">
                        Coupon ({promoCode}):
                      </span>
                      <div className="flex items-center gap-2">
                         <span className="font-semibold text-green-600">- ৳ {Math.round(displayPromoDiscount)}</span>
                         <button 
                          type="button" 
                          onClick={removePromo} 
                          className="text-[9px] font-bold text-red-600 hover:underline flex items-center gap-1"
                         >
                           [Remove] <X className="w-2.5 h-2.5" />
                         </button>
                      </div>
                    </div>
                    {isRestricted && (
                      <p className="text-[8px] text-amber-600 font-bold uppercase tracking-tight leading-none italic">
                        * Valid for selected items only
                      </p>
                    )}
                  </div>
                )}

                {/* PROMO CODE INPUT SECTION */}
                {!promoCode && (
                  <div className="py-3 border-y border-gray-100 my-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Have a Discount Code?</label>
                    <div className="flex gap-1.5">
                       <input 
                         type="text" 
                         placeholder="Code"
                         value={promoInput}
                         onChange={(e) => setPromoInput(e.target.value)}
                         className="flex-1 bg-white border border-gray-200 focus:border-red-600 rounded px-3 py-1.5 text-[10px] font-bold transition-all outline-none"
                       />
                       <button 
                         type="button"
                         onClick={handleApplyPromo}
                         className="bg-gray-900 text-white px-3 rounded text-[9px] font-black uppercase hover:bg-red-600 transition-colors active:scale-95"
                       >
                         Apply
                       </button>
                    </div>
                    {promoError && (
                       <p className="mt-1.5 text-[8px] font-black text-red-600 uppercase tracking-widest">{promoError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-3 items-end">
                <div>
                   <div className="flex items-center gap-2 mb-0.5">
                     <span className="font-bold text-gray-900 text-lg">Grand Total</span>
                     {(discountAmount || 0) > 0 && (
                       <span className="text-[10px] font-black text-white bg-green-600 px-2 py-1 rounded uppercase tracking-tighter shadow-sm animate-bounce-slow">
                         Saved ৳{Math.round(discountAmount || 0)}
                       </span>
                     )}
                   </div>
                </div>
                <div className="text-right">
                   <span className="text-2xl font-bold text-red-600 leading-none">
                     ৳ {Math.round(grandTotal)}
                   </span>
                </div>
              </div>
            </div>

            {/* Instruction */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Delivery Instruction</h2>
              <textarea
                name="instruction"
                value={formData.instruction}
                onChange={(e: any) => handleInputChange(e)}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all resize-y"
                placeholder="Any specific instructions?"
              ></textarea>
            </div>

            {/* Payment Method & Submit */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Payment Method</h2>
              <label className="flex items-center p-3 border border-red-200 bg-red-50/50 rounded-lg cursor-pointer mb-4">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash_on_delivery"
                  checked={formData.paymentMethod === 'cash_on_delivery'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-red-600 accent-red-600"
                />
                <div className="ml-3">
                  <span className="block font-bold text-gray-900 text-sm">Cash on Delivery</span>
                </div>
              </label>

              <Button
                type="submit"
                disabled={orderState.status === 'confirming'}
                className="w-full py-3 font-bold text-lg uppercase tracking-wide shadow-md hover:shadow-lg transition-all border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
              >
                {orderState.status === 'confirming' ? 'Placing Order...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
