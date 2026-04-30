"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { User, ShoppingBag, Clock, Package, ChevronRight, Hash, Calendar, ShieldCheck, Printer, Image as ImageIcon } from "lucide-react";
import { OrderInvoice } from "@/components/admin/order-invoice";
import { ConfirmModal } from "@/components/confirm-modal";

const formatCurrency = (val: number) => `৳${val.toFixed(2)}`;
const formatDate = (dateString: string) => new Date(dateString).toLocaleString()

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  weight?: string;
  flavor?: string;
  image?: string;
}

interface Order {
  id: string;
  createdAt: string;
  total: number;
  subtotal?: number;
  shippingCost?: number;
  discountAmount?: number;
  promoCode?: string;
  status: string;
  deliveryMethod?: string;
  paymentMethod?: string;
  instruction?: string;
  cancelReason?: string;
  statusReason?: string;
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");
        
        if (!token || !userStr) {
          window.location.href = "/auth/login";
          return;
        }

        const user = JSON.parse(userStr);
        setIsAdmin(user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'super_admin' || user?.role === 'owner');

        const params = new URLSearchParams()
        if (search) params.append('q', search)
        if (status !== 'all') params.append('status', status)

        const res = await fetch(`/api/orders?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          throw new Error("Failed to load orders");
        }
        
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [search, status]);

  const handleCancel = async (orderId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled', cancelReason: 'Cancelled by customer' })
      });

      if (res.ok) {
        // Refresh orders locally
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled', cancelReason: 'Cancelled by customer' } : o));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel order.");
      }
    } catch (err) {
      alert("An error occurred.");
    }
  };

  const triggerCancel = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsCancelModalOpen(true);
  };

  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const handlePrint = (orderId: string) => {
    setPrintingOrderId(orderId);
    setTimeout(() => {
      window.print();
      setPrintingOrderId(null);
    }, 500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Mini Profile Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-1 bg-red-600 rounded-full"></span>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Order Log</span>
           </div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
            {isAdmin ? 'System Database' : 'My Orders'}
          </h1>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative group flex-1">
            <input 
              type="text" 
              placeholder="SEARCH PID OR USER..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 px-4 pl-10 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 rounded-lg focus:border-red-600 focus:outline-none transition-all w-full md:w-64"
            />
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
          </div>

          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-4 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 rounded-lg focus:border-red-600 focus:outline-none transition-all cursor-pointer min-w-[120px]"
          >
            <option value="all">ALL STAGES</option>
            <option value="pending">PENDING</option>
            <option value="processing">PROCESSING</option>
            <option value="shipped">SHIPPED</option>
            <option value="delivered">DELIVERED</option>
            <option value="cancelled">CANCELLED</option>
          </select>
        </div>
      </div>
      
      {isLoading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
           <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Querying...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-red-50 border border-red-100 rounded-xl">
           <p className="text-red-600 font-black uppercase tracking-widest text-[10px]">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">No Records identifed</h2>
          <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all">
            Return to Storefront
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden border border-gray-100 rounded-xl shadow-none hover:border-red-600 transition-all duration-300">
              {/* Header Bar - More Compact */}
              <div className="bg-slate-50/80 border-b border-gray-100 px-5 py-2 flex flex-wrap justify-between items-center gap-4">
                 <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">
                       ORDER ID: <span className="text-red-600 ml-1 select-all">{order.id.slice(-8).toUpperCase()}</span>
                    </span>
                 </div>
                 
                 <div className="flex items-center gap-4">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                       {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                     <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider border
                      ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-100' : 
                        order.status === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                        order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' : 
                        order.status === 'damaged' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        order.status === 'lost' ? 'bg-gray-50 text-gray-700 border-gray-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'}`}>
                      {order.status}
                    </span>
                 </div>
              </div>

              {(order.statusReason || order.cancelReason) && (
                <div className={`px-5 py-2 border-b text-[10px] font-bold ${
                  order.status === 'cancelled' ? 'bg-red-50/30 text-red-700 border-red-50' :
                  order.status === 'damaged' ? 'bg-amber-50/30 text-amber-700 border-amber-50' :
                  'bg-gray-50/30 text-gray-700 border-gray-50'
                }`}>
                  <span className="uppercase tracking-widest text-[8px] opacity-60 mr-2">{order.status} REASON:</span>
                  {order.statusReason || order.cancelReason}
                </div>
              )}

              {/* Card Body - Highly Compact */}
              <div className="p-5 flex flex-col md:flex-row gap-6">
                {/* Admin Role Section - Smaller */}
                {isAdmin && (
                  <div className="md:w-44 shrink-0 flex flex-col gap-2 border-r border-gray-50 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                       <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                       <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Admin Intel</span>
                    </div>
                    <div>
                       <p className="text-xs font-black text-gray-900 truncate leading-tight mb-1">{order.customerName}</p>
                       <p className="text-[8px] font-bold text-gray-300 uppercase truncate leading-none mb-0.5">{order.customerEmail}</p>
                       <p className="text-[8px] font-black text-gray-300 uppercase leading-none">{order.customerPhone}</p>
                    </div>
                  </div>
                )}

                {/* Main Viewport */}
                <div className="flex-1 flex flex-col justify-between self-stretch gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-xl border border-gray-50 hover:border-gray-200 transition-all group/item">
                        <div className="relative w-12 h-12 bg-white rounded-lg border border-gray-100 flex-shrink-0 overflow-hidden shadow-sm">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-50">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="absolute top-0 right-0 bg-red-600 text-white font-black text-[8px] px-1 rounded-bl-md">
                            x{item.quantity}
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-[10px] text-gray-900 leading-tight uppercase truncate">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-black text-red-600">{formatCurrency(item.price)}</span>
                            {(item.weight || item.flavor) && (
                              <span className="text-[7px] text-gray-400 font-bold uppercase truncate border-l border-gray-200 pl-1.5">
                                {[item.weight, item.flavor].filter(Boolean).join(' / ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Segment - Compact */}
                  <div className="flex justify-between items-end border-t border-gray-50 pt-3 mt-auto">
                     <div className="flex flex-wrap gap-2">
                        {order.status === 'delivered' && (
                           <button 
                             onClick={() => handlePrint(order.id)}
                             className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-600 px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 shadow-sm"
                           >
                             <Printer className="w-3 h-3" />
                             Download Invoice
                           </button>
                        )}
                        
                        <Link href={isAdmin ? `/admin/orders` : '/shop'}>
                           <button className={`text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-1 group/btn h-8
                             ${isAdmin ? 'text-red-600 hover:bg-red-600 border border-red-600 px-3 py-1 rounded-md hover:text-white' : 'text-gray-400 hover:text-red-600'}`}>
                              {isAdmin ? 'Management' : 'Buy Again'}
                              <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                           </button>
                        </Link>
                        
                        {!isAdmin && order.status === 'pending' && (
                           <button 
                             onClick={() => triggerCancel(order.id)}
                             className="text-[9px] font-black uppercase tracking-[0.15em] text-red-500 hover:text-white hover:bg-red-500 border border-red-500 px-3 py-1 rounded-md transition-all h-8"
                           >
                              Cancel Order
                           </button>
                        )}
                     </div>

                     <div className="text-right flex flex-col items-end">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest block leading-none mb-1">TOTAL</span>
                        <div className="text-xl font-black italic tracking-tighter text-gray-900 flex items-center gap-2 leading-none p-2 bg-slate-50 rounded-lg border border-slate-100">
                           <Package className="w-4 h-4 text-red-600 not-italic shrink-0 translate-y-0.5" />
                           {formatCurrency(order.total)}
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={() => selectedOrderId && handleCancel(selectedOrderId)}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action will return items to stock and cannot be reversed."
        confirmText="Yes, Cancel Order"
        cancelText="Keep Order"
      />

      {/* Hidden Invoice for Printing */}
      <div className="hidden print:block fixed inset-0 z-[9999] bg-white">
        {printingOrderId && (
          <OrderInvoice order={orders.find(o => o.id === printingOrderId) as any} />
        )}
      </div>
    </div>
  );
}
