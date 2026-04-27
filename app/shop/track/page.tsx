'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Package, Truck, CheckCircle2, Clock, MapPin, Hash, Mail, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch(`/api/orders/track?orderId=${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to find order');
      }

      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'processing': return <Package className="w-5 h-5 text-blue-500" />;
      case 'shipped': return <Truck className="w-5 h-5 text-purple-500" />;
      case 'delivered': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'processing': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'shipped': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-10 h-1 bg-red-600 rounded-full"></span>
            <span className="text-xs font-black text-red-600 uppercase tracking-[0.3em]">Logistic Sync</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic mb-4">
            Track Your Order
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto font-medium">
            Enter your Order ID to get real-time status updates on your package.
          </p>
        </div>

        {/* Search Form */}
        <Card className="p-1 md:p-2 bg-white rounded-[2rem] shadow-2xl border-none mb-12 overflow-hidden">
          <form onSubmit={handleTrack} className="flex flex-col md:flex-row items-stretch gap-2">
            <div className="relative flex-1 group">
              <Hash className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-red-600 transition-colors" />
              <input
                type="text"
                placeholder="ORDER ID (E.G. 0F29X3AE)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
                className="w-full h-16 pl-14 pr-6 bg-gray-50/50 border-none rounded-2xl md:rounded-[1.75rem] text-sm font-bold uppercase tracking-widest focus:ring-2 focus:ring-red-600 transition-all outline-none"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-16 px-10 bg-black hover:bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl md:rounded-[1.75rem] transition-all active:scale-95 flex items-center gap-2 shrink-0 shadow-lg shadow-gray-100"
            >
              {loading ? 'Searching...' : (
                <>
                  Track Order
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-12 p-6 bg-red-50 border border-red-100 rounded-3xl text-center">
            <p className="text-red-600 font-black uppercase tracking-widest text-[10px]">{error}</p>
          </div>
        )}

        {/* Results */}
        {order && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Card */}
            <Card className="overflow-hidden border-none shadow-xl rounded-[2rem] bg-white">
              <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Package className="w-7 h-7 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Overview</p>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Order #{order.shortId}</h2>
                  </div>
                </div>
                <div className={`px-6 py-3 rounded-2xl border-2 font-black uppercase tracking-[0.2em] text-sm flex items-center gap-3 ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {order.status}
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left: Summary */}
                <div className="lg:col-span-2 space-y-8">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight italic mb-6 border-b pb-4">
                      Order Contents
                    </h3>
                    <div className="space-y-4">
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-xs text-gray-400 border border-slate-100 group-hover:border-red-200 transition-colors">
                              {item.quantity}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-gray-900 uppercase tracking-tight text-sm leading-none mb-1">{item.name}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                {item.weight || 'Std Unit'} • {item.flavor || 'Original'}
                              </span>
                            </div>
                          </div>
                          <span className="font-black text-gray-900 tabular-nums">৳{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-8 space-y-4 border border-slate-100/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Subtotal</span>
                      <span className="font-bold text-gray-900">৳{order.subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Delivery Charge</span>
                      <span className="font-bold text-gray-900">{order.shippingCost === 0 ? 'FREE' : `৳${order.shippingCost.toFixed(0)}`}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm text-emerald-600">
                        <span className="font-black uppercase tracking-widest text-[10px]">Promo Discount</span>
                        <span className="font-bold">- ৳{order.discountAmount.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-black text-gray-900 uppercase tracking-widest text-xs">Total Bill</span>
                      <span className="text-3xl font-black text-red-600 italic tracking-tighter">৳{order.total.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Shipping */}
                <div className="space-y-8 lg:border-l lg:pl-12 border-slate-100">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Delivery Info</h3>
                    <div className="flex items-start gap-4">
                      <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-1" />
                      <div>
                        <p className="text-xs font-bold text-gray-500 leading-relaxed">
                          {order.shippingAddress}, {order.shippingCity}<br />
                          Postal Code: {order.shippingPostalCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Method</h3>
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                      <p className="text-xs font-black text-gray-900 uppercase tracking-tight mb-1">{order.deliveryMethod === 'pickup' ? 'Collection Pickup' : 'Home Delivery'}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Est. 3-5 Business Days</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Payment</h3>
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                      <p className="text-xs font-black text-gray-900 uppercase tracking-tight mb-1">{order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment'}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pay upon receipt</p>
                    </div>
                  </div>

                  <Link href="/shop" className="block pt-4">
                    <Button variant="outline" className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 hover:bg-black hover:text-white transition-all">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            <div className="text-center">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Authorized Result • Parle Bangladesh</p>
            </div>
          </div>
        )}

        {/* Empty State / Initial */}
        {!order && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 opacity-60">
            <div className="p-8 bg-white/50 rounded-3xl border border-white flex flex-col items-center text-center">
              <ShoppingBag className="w-8 h-8 text-gray-400 mb-4" />
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-2">Instant Search</h3>
              <p className="text-[11px] text-gray-500 font-medium">No login required. Just enter your unique 8-character Order ID to see your package's progress.</p>
            </div>
            <div className="p-8 bg-white/50 rounded-3xl border border-white flex flex-col items-center text-center">
              <Truck className="w-8 h-8 text-gray-400 mb-4" />
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-2">Real-time Sync</h3>
              <p className="text-[11px] text-gray-500 font-medium">Updates are logged directly from our warehouse management system once they are scanned for dispatch.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
