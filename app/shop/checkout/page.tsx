'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart, getItemKey } from '@/hooks/useCart';

interface OrderState {
  status: 'form' | 'confirming' | 'success' | 'error';
  orderId?: string;
  finalSubtotal?: number;
  error?: string;
}

export default function CheckoutPage() {
  const { items, total, clearCart, promoCode, discountAmount } = useCart();
  const [orderState, setOrderState] = useState<OrderState>({ status: 'form' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPostalCode: '',
    instruction: '',
    paymentMethod: 'cash_on_delivery',
  });
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [prefilled, setPrefilled] = useState({ name: false, email: false, phone: false });

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
      } catch (e) {}
    }
  }, []);

  if (items.length === 0 && orderState.status !== 'success') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Link href="/shop" className="flex items-center gap-2 text-amber-700 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8">Add products before checking out.</p>
            <Link href="/shop">
              <Button className="bg-amber-700 hover:bg-amber-800 text-white">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isFreeDelivery = total >= 1000;
  const shippingCost = isFreeDelivery ? 0 : 80;
  const grandTotal = total + shippingCost - (discountAmount || 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSameAsBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      if (!formData.address || !formData.city || !formData.postalCode) {
        alert("Please fill up the billing address first.");
        return;
      }
      setSameAsBilling(true);
    } else {
      setSameAsBilling(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentSubtotal = total; // Capture subtotal before clearing
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
          promoCode,
          discountAmount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to place order');
      }

      const order = await response.json();
      clearCart();
      setOrderState({
        status: 'success',
        orderId: order.id,
        finalSubtotal: currentSubtotal
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setOrderState({
        status: 'error',
        error: message,
      });
    }
  };

  // Success State
  if (orderState.status === 'success') {
    const displaySubtotal = orderState.finalSubtotal || 0;
    const isFree = displaySubtotal >= 1000;
    const displayShipping = isFree ? 0 : 80;
    const displayTotal = displaySubtotal + displayShipping - (discountAmount || 0);

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left Column: Confirmation & Logistics */}
            <div className="p-8 lg:p-12 border-b md:border-b-0 md:border-r border-gray-100 bg-white">
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Received!</h1>
                <p className="text-gray-500 mb-8">Your order has been placed successfully.</p>
                
                <div className="bg-gray-50 px-4 py-2 rounded-lg mb-10 w-full flex justify-between items-center">
                  <span className="text-sm text-gray-500">Order ID:</span>
                  <span className="text-base font-bold text-red-600">{orderState.orderId}</span>
                </div>

                <div className="w-full">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Order Summary</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold text-gray-900 border-b border-dotted border-gray-300 flex-grow mx-4"></span>
                      <span className="font-bold text-gray-900">৳ {Math.round(displaySubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 uppercase font-bold tracking-tight">Delivery Charge</span>
                      <span className="font-semibold text-gray-300 border-b border-dotted border-gray-300 flex-grow mx-4"></span>
                      <span className="font-bold text-gray-900">{displayShipping === 0 ? "FREE" : `৳ ${Math.round(displayShipping)}`}</span>
                    </div>
                    {(discountAmount || 0) > 0 && (
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span className="font-bold uppercase tracking-tight flex items-center gap-1"><Tag className="w-3 h-3" /> Promo Discount</span>
                        <span className="font-semibold text-gray-100 border-b border-dotted border-gray-100 flex-grow mx-4"></span>
                        <span className="font-bold">- ৳ {Math.round(discountAmount || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-4 mt-2">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-red-610 text-2xl tracking-tighter">৳ {Math.round(displayTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Payment & Next Steps */}
            <div className="p-8 lg:p-12 bg-gray-50 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Payment Card */}
                <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                  <h3 className="text-red-900 font-bold text-base mb-2 flex items-center gap-2">
                    Payment: Cash on Delivery
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Please keep exact change ready. Payment is due strictly upon physical receipt of order.
                  </p>
                </div>

                {/* Verification Steps */}
                <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                  <h3 className="text-green-900 font-bold text-base mb-4">What's Next?</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-gray-700 text-sm">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>We have received your order</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 text-sm">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>We will contact you for confirmation</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 text-sm">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>Estimated delivery: 3-5 business days</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Link href="/shop" className="w-full mt-8">
                <Button className="w-full py-6 font-bold bg-amber-700 hover:bg-amber-800 text-white h-14 rounded-2xl shadow-lg transition-all active:scale-95">
                  Back to Shop
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-white">
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
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                      placeholder="Dhaka"
                    />
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

            {/* Shipping Information */}
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
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shipping City *</label>
                    <input
                      type="text"
                      name="shippingCity"
                      value={sameAsBilling ? formData.city : formData.shippingCity}
                      onChange={handleInputChange}
                      required
                      readOnly={sameAsBilling}
                      className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all ${sameAsBilling ? 'opacity-70 cursor-not-allowed text-gray-500' : ''}`}
                      placeholder="Dhaka"
                    />
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">৳ {Math.round(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold text-gray-900">৳ {Math.round(shippingCost)}</span>
                </div>
                {(discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Promo ({promoCode})</span>
                    <span className="font-semibold">- ৳ {Math.round(discountAmount || 0)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-3">
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <span className="text-2xl font-bold text-red-600">
                  ৳ {Math.round(grandTotal)}
                </span>
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
