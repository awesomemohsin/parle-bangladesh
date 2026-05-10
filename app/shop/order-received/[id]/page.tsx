"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  items: OrderItem[];
  subtotal: number;
  ruleDiscount: number;
  promoDiscount: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  promoCode?: string;
}

export default function OrderReceivedPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (!res.ok) throw new Error("Failed to fetch order details");
        const data = await res.json();
        setOrder(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

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
  // Subtotal = Gross Subtotal - Flat/Rule Discounts
  const displaySubtotal = (order.subtotal || 0) - (order.ruleDiscount || 0);
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
                  
                  {/* Delivery Charge */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 uppercase font-bold tracking-tight text-[11px]">Delivery Charge</span>
                    <span className="font-semibold text-gray-300 border-b border-dotted border-gray-300 flex-grow mx-4"></span>
                    <span className="font-bold text-gray-900">{displayShipping === 0 ? "FREE" : `৳ ${Math.round(displayShipping)}`}</span>
                  </div>

                  {/* Coupon Discount */}
                  {displayPromoDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span className="font-bold uppercase tracking-tight flex items-center gap-1 text-[11px]">
                        <Tag className="w-3 h-3" /> Coupon {order.promoCode ? `(${order.promoCode})` : ''}:
                      </span>
                      <span className="font-semibold text-gray-100 border-b border-dotted border-gray-100 flex-grow mx-4"></span>
                      <span className="font-bold">- ৳ {Math.round(displayPromoDiscount)}</span>
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
              <Button className="w-full py-6 font-bold bg-amber-700 hover:bg-amber-800 text-white h-14 rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs">
                Back to Shop
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
