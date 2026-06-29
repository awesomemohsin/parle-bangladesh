"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Check, 
  Tag, 
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  weight?: string;
  flavor?: string;
}

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  deliveryMethod: string;
  paymentMethod: string;
  paymentStatus?: string;
  items: OrderItem[];
  subtotal: number;
  ruleDiscount: number;
  promoDiscount: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  promoCode?: string;
  isRestricted?: boolean;
  customerType?: string;
  status?: string;
}

export default function OrderReceivedPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const isNewSignup = searchParams?.get("new_signup") === "true";

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [showPrompt, setShowPrompt] = useState(isNewSignup);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const handleKeepPhone = () => {
    setShowPrompt(false);
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }
    setPasswordError("");
    setIsSubmittingPassword(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password.");
      } else {
        setPasswordSuccess("Account secured successfully!");
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setShowPrompt(false);
        }, 1500);
      }
    } catch (err) {
      setPasswordError("Network error occurred.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (!res.ok) throw new Error("Failed to fetch order details");
        const data = await res.json();
        setOrder(data);

        // Fetch auth details to verify if the account is new (e.g. created in last 15 minutes)
        try {
          const authRes = await fetch("/api/auth/me");
          if (authRes.ok) {
            const authData = await authRes.json();
            if (authData.user && authData.user.createdAt) {
              const userCreatedAt = new Date(authData.user.createdAt).getTime();
              const now = Date.now();
              if (now - userCreatedAt < 15 * 60 * 1000) {
                setShowPrompt(true);
              }
            }
          }
        } catch (authErr) {
          console.error("Failed to fetch user creation time for auto-prompt:", authErr);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!order || order.paymentMethod !== 'sslcommerz' || order.paymentStatus === 'paid') return;

    const calculateTimeLeft = () => {
      const createdTime = new Date(order.createdAt).getTime();
      const expireTime = createdTime + 30 * 60 * 1000; // 30 minutes in ms
      const now = Date.now();
      const difference = Math.floor((expireTime - now) / 1000);
      return difference > 0 ? difference : 0;
    };

    const initial = calculateTimeLeft();
    setTimeLeft(initial);
    if (initial <= 0 && order.status !== 'cancelled') {
      setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order]);

  if (isLoading) {
    return (
      <div className="py-20 bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-20 bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-gray-100 max-w-md w-full">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-500 text-sm mb-8">We couldn't find the order details you're looking for.</p>
          <Link href="/shop">
            <Button className="w-full bg-gray-900 rounded-2xl">Return to Shop</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Pricing Logic to match the requested layout:
  // Subtotal = Original Gross Subtotal (undiscounted)
  const displaySubtotal = order.subtotal || 0;
  const displayShipping = order.shippingCost || 0;
  const displayPromoDiscount = order.promoDiscount || 0;
  const displayTotal = order.total;
  const totalSaved = order.discountAmount || 0;

  return (
    <div className="bg-slate-50 flex items-center justify-center px-4 py-4 md:py-8">
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

              {showPrompt && (
                <div className="w-full bg-amber-50/70 border border-amber-200 rounded-3xl p-5 mb-8 text-left animate-in fade-in slide-in-from-top-3 duration-300">
                  <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    🎉 Welcome to Parle!
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed mb-4">
                    We've created an account for you. Your username is your phone number: <span className="font-bold font-mono">{order.customerPhone}</span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="px-4 py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm text-center"
                    >
                      🔒 Secure with Custom Password
                    </button>
                    <button
                      onClick={handleKeepPhone}
                      className="px-4 py-3 bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 text-center font-bold"
                    >
                      Keep Phone Number as Password
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 px-4 py-2 rounded-lg mb-10 w-full flex justify-between items-center">
                <span className="text-sm text-gray-500">Order ID:</span>
                <span className="text-base font-bold text-red-600">{order.id.slice(-8).toUpperCase()}</span>
              </div>

              <div className="w-full">
                <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Order Summary</h2>
                <div className="space-y-3">
                  {/* Subtotal (After flat discounts) */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900 border-b border-dotted border-gray-300 flex-grow mx-4"></span>
                    <span className="font-bold text-gray-900">৳ {Math.round(displaySubtotal)}</span>
                  </div>

                  {/* Automatic/Campaign Discount */}
                  {(order.ruleDiscount || 0) > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600 font-medium">
                      <span className="font-bold uppercase tracking-tight text-[11px]">
                        {order.customerType && order.customerType !== "retailer" 
                          ? `${order.customerType.toUpperCase()} DISCOUNT` 
                          : "AUTOMATIC DISCOUNT"}
                      </span>
                      <span className="font-semibold text-green-100 border-b border-dotted border-green-100 flex-grow mx-4"></span>
                      <span className="font-bold">- ৳ {Math.round(order.ruleDiscount)}</span>
                    </div>
                  )}
                  
                  {/* Delivery Charge */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 uppercase font-bold tracking-tight text-[11px]">Delivery Charge</span>
                    <span className="font-semibold text-gray-300 border-b border-dotted border-gray-300 flex-grow mx-4"></span>
                    <span className="font-bold text-gray-900">{displayShipping === 0 ? "FREE" : `৳ ${Math.round(displayShipping)}`}</span>
                  </div>

                  {/* Coupon Discount */}
                  {displayPromoDiscount > 0 && (
                    <div className="border-b border-gray-50 pb-2 mb-2">
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span className="font-bold uppercase tracking-tight flex items-center gap-1 text-[11px]">
                          <Tag className="w-3 h-3" /> Coupon {order.promoCode ? `(${order.promoCode})` : ''}:
                        </span>
                        <span className="font-semibold text-gray-100 border-b border-dotted border-gray-100 flex-grow mx-4"></span>
                        <span className="font-bold">- ৳ {Math.round(displayPromoDiscount)}</span>
                      </div>
                      {order.isRestricted && (
                        <p className="text-[9px] text-amber-600 font-bold uppercase tracking-tight leading-none italic mt-1 text-right">
                          * Applied to selected items only
                        </p>
                      )}
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="flex justify-between border-t pt-4 mt-2 items-end">
                    <div>
                      <span className="font-bold text-gray-900 block mb-1">Grand Total</span>
                      {totalSaved > 0 && (
                        <span className="text-[10px] font-black text-white bg-green-600 px-2 py-1 rounded uppercase tracking-tighter">
                          Saved ৳ {Math.round(totalSaved)}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-red-610 text-3xl tracking-tighter italic">৳ {Math.round(displayTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Payment & Next Steps */}
          <div className="p-8 lg:p-12 bg-gray-50 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Payment Card */}
              {order.paymentMethod === 'sslcommerz' ? (
                <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                  <h3 className="text-green-900 font-bold text-base mb-2 flex items-center gap-2">
                    Payment: Online Payment (SSLCommerz)
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-2">
                    Status:{' '}
                    <span className={`font-black ${
                      order.status === 'cancelled'
                        ? 'text-red-600'
                        : order.paymentStatus === 'paid'
                        ? 'text-green-600'
                        : 'text-amber-600'
                    }`}>
                      {order.status === 'cancelled'
                        ? 'CANCELLED ❌'
                        : order.paymentStatus === 'paid'
                        ? 'PAID ✅'
                        : 'UNPAID ⏳'}
                    </span>
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {order.status === 'cancelled'
                      ? 'This order has been automatically cancelled due to payment timeout.'
                      : order.paymentStatus === 'paid'
                      ? 'Your payment was successfully received and verified online. Your remaining due amount is ৳0.'
                      : 'Your online payment transaction has not been completed or verified yet.'}
                  </p>

                  {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && timeLeft !== null && timeLeft > 0 && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-bold leading-normal">
                      ⚠️ <span className="uppercase tracking-widest text-[10px] font-black">PAYMENT TIMEOUT:</span> Please complete your payment within{' '}
                      <span className="font-mono font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                        {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
                      </span>{' '}
                      or the order will be automatically cancelled.
                    </div>
                  )}

                  {order.status === 'cancelled' && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs font-bold leading-normal">
                      ❌ <span className="uppercase tracking-widest text-[10px] font-black">ORDER CANCELLED:</span> This order has been automatically cancelled due to payment timeout (30 minutes expired).
                    </div>
                  )}

                  {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        window.location.href = `/api/orders/${order.id}/pay`;
                      }}
                      className="w-full text-xs font-black uppercase tracking-[0.15em] text-white bg-green-600 hover:bg-green-700 py-3 rounded-xl shadow-lg shadow-green-600/10 transition-all active:scale-95 flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      💳 Pay Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                  <h3 className="text-red-900 font-bold text-base mb-2 flex items-center gap-2">
                    Payment: Cash on Delivery
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Please keep exact change ready. Payment is due strictly upon physical receipt of order.
                  </p>
                </div>
              )}

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
                    <span>Estimated delivery: 3-5 days after confirming the order</span>
                  </li>
                </ul>
              </div>
            </div>

            <Link href="/shop" className="w-full mt-8">
              <Button className="w-full py-6 font-bold bg-amber-700 hover:bg-amber-800 text-white h-14 rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs">
                Back to Shop
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 w-full max-w-md shadow-2xl relative animate-in fade-in scale-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">
              Secure Your Account
            </h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Create a custom password for your account to ensure your order details and personal information remain secure.
            </p>

            <form onSubmit={handleSetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="MINIMUM 6 CHARACTERS"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm text-gray-700 bg-white"
                />
              </div>

              {passwordError && (
                <p className="text-[10px] text-red-650 font-bold uppercase tracking-wide leading-tight mt-1">
                  ⚠️ {passwordError}
                </p>
              )}

              {passwordSuccess && (
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide leading-tight mt-1">
                  ✅ {passwordSuccess}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPassword || !!passwordSuccess}
                  className="flex-1 px-4 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md disabled:opacity-50"
                >
                  {isSubmittingPassword ? "Saving..." : "Save & Secure"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isSubmittingPassword || !!passwordSuccess}
                  className="px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
