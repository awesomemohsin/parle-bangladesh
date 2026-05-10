"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { User, ShoppingBag, Clock, Package, ChevronRight, Hash, Calendar, ShieldCheck, Printer, Image as ImageIcon, X, ShoppingCart, Plus, Download as DownloadIcon } from "lucide-react";
import { OrderInvoice } from "@/components/admin/order-invoice";
import { ConfirmModal } from "@/components/confirm-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const formatCurrency = (val: number) => `৳${val.toFixed(2)}`;
const formatDate = (dateString: string) => new Date(dateString).toLocaleString()

interface OrderItem {
  productId: string;
  productSlug: string;
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
  customerType?: string;
}

export default function MyOrdersPage() {
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDealer, setIsDealer] = useState(false);

  // Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [isAddingMap, setIsAddingMap] = useState<Record<string, boolean>>({});

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
        setIsDealer(user?.customerType === 'dealer');

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
    setPreviewOrder(null); // Close modal to prevent print interference
    // Use a slightly longer delay to ensure full rendering of fonts and signatures
    setTimeout(() => {
      window.print();
      setPrintingOrderId(null);
    }, 1500);
  };

  const handleAddToCart = (item: OrderItem) => {
    setIsAddingMap(prev => ({ ...prev, [item.productId + (item.weight || '')]: true }));

    addItem({
      productId: item.productId,
      productName: item.name,
      productSlug: item.productSlug,
      price: item.price,
      image: item.image,
      weight: item.weight,
      flavor: item.flavor,
      stock: 999, // Assume available for reorder, will be checked in cart
    });

    setTimeout(() => {
      setIsAddingMap(prev => ({ ...prev, [item.productId + (item.weight || '')]: false }));
    }, 800);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-8 main-content">
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
              <Card
                key={order.id}
                className={`overflow-hidden rounded-xl shadow-none transition-all duration-300 group ${
                  order.customerType === 'dealer' 
                    ? "border-amber-200 hover:border-amber-500 bg-amber-50/5" 
                    : "border-gray-100 hover:border-red-600"
                }`}
              >
                {/* Header Bar - More Compact */}
                <div className={`${
                  order.customerType === 'dealer' ? "bg-amber-50" : "bg-slate-50/80"
                } border-b border-gray-100 px-4 py-1.5 flex flex-wrap justify-between items-center gap-4 transition-colors`}>
                  <div className="flex items-center gap-3">
                    {order.customerType === 'dealer' && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-600 text-white rounded-md">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span className="text-[7px] font-black uppercase tracking-widest">Dealer Order</span>
                      </div>
                    )}
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setPreviewOrder(order)}
                    >
                      <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">
                        ORDER ID: <span className="text-red-600 ml-1 select-all">#{order.id.slice(-8).toUpperCase()}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => setPreviewOrder(order)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/5 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-all duration-300 group/view"
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest">View Full Order</span>
                      <ChevronRight className="w-2.5 h-2.5 transition-transform group-hover/view:translate-x-0.5" />
                    </button>
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
                  <div className={`px-4 py-1.5 border-b text-[10px] font-bold ${order.status === 'cancelled' ? 'bg-red-50/30 text-red-700 border-red-50' :
                      order.status === 'damaged' ? 'bg-amber-50/30 text-amber-700 border-amber-50' :
                        'bg-gray-50/30 text-gray-700 border-gray-50'
                    }`}>
                    <span className="uppercase tracking-widest text-[8px] opacity-60 mr-2">{order.status} REASON:</span>
                    {order.statusReason || order.cancelReason}
                  </div>
                )}

                {/* Card Body - Highly Compact */}
                <div className="p-2 flex flex-col md:flex-row gap-2">
                  {/* Admin Role Section - Smaller */}
                  {isAdmin && (
                    <div className="md:w-36 shrink-0 flex flex-col gap-1 border-r border-gray-50 pr-2">
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
                  <div className="flex-1 flex flex-col justify-between self-stretch gap-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 p-0.5 bg-slate-50/50 rounded-lg border border-gray-50 hover:border-gray-200 transition-all group/item">
                          <div className="relative w-8 h-8 bg-white rounded-md border border-gray-100 flex-shrink-0 overflow-hidden shadow-sm">
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
                          <div className="flex flex-col min-w-0 leading-none">
                            <span className="font-black text-[10px] text-gray-900 leading-none uppercase truncate">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0 leading-none">
                              <span className="text-[9px] font-black text-red-600 leading-none">{formatCurrency(item.price)}</span>
                              {(item.weight || item.flavor) && (
                                <span className="text-[7px] text-gray-400 font-bold uppercase truncate border-l border-gray-200 pl-1.5 leading-none">
                                  {[item.weight, item.flavor].filter(Boolean).join(' / ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary Segment - Compact */}
                    <div className="flex justify-between items-end border-t border-gray-50 pt-2 mt-auto">
                      <div className="flex flex-wrap gap-2">
                        {order.status === 'delivered' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              window.open(`/orders/${order.id}/invoice`, '_blank');
                            }}
                            className="h-8 px-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white rounded-md font-black uppercase tracking-widest text-[9px] transition-all flex items-center gap-2"
                          >
                            <DownloadIcon className="w-3 h-3" />
                            Invoice
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewOrder(order);
                          }}
                          className="text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-1 group/btn h-8 text-red-600 hover:bg-red-600 border border-red-600 px-3 py-1 rounded-md hover:text-white"
                        >
                          {isAdmin ? 'Management' : 'View Items'}
                          <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                        </button>

                        {!isAdmin && (
                          <Link href="/shop" onClick={(e) => e.stopPropagation()}>
                            <button className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 hover:text-red-600 h-8 px-2 flex items-center gap-1">
                              Buy Again
                            </button>
                          </Link>
                        )}

                        {!isAdmin && order.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerCancel(order.id);
                            }}
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

        {/* Order Preview Modal - Premium Responsive Glassmorphism */}
        <Dialog open={!!previewOrder} onOpenChange={() => setPreviewOrder(null)}>
          <DialogContent
            showCloseButton={false}
            className="!fixed !top-[50%] !left-[50%] !translate-x-[-50%] !translate-y-[-50%] !max-w-[95vw] sm:!max-w-[90vw] !w-[95vw] sm:!w-[80vw] !h-[90vh] sm:!h-[80vh] !flex !flex-col p-0 bg-white/95 !backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 z-[9999]"
          >
            {/* Header - Mobile Responsive */}
            <DialogHeader className="p-3 sm:p-4 bg-white border-b border-gray-100 shrink-0 z-20 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button
                    onClick={() => setPreviewOrder(null)}
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-100/50 rounded-full hover:bg-red-600 hover:text-white transition-all active:scale-90"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                      <span className="w-4 h-0.5 sm:w-6 sm:h-1 bg-red-600 rounded-full"></span>
                      <span className="text-[8px] sm:text-[10px] font-black text-red-600 uppercase tracking-widest">Order Archive</span>
                    </div>
                    <DialogTitle className="text-lg sm:text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
                      Order #{previewOrder?.id.slice(-8).toUpperCase()}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Review items from your previous order and add them back to your cart.
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t sm:border-none pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[8px] sm:text-[9px] font-black text-gray-300 uppercase mb-0.5">Grand Total</p>
                    <p className="text-lg sm:text-2xl font-black text-gray-900 tracking-tighter italic leading-none">
                      ৳{previewOrder?.total.toFixed(0)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-red-600 text-white text-[8px] sm:text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-red-600/20">
                      {previewOrder?.status}
                    </span>
                    {previewOrder?.status === 'delivered' && (
                      <button
                        onClick={() => window.open(`/orders/${previewOrder.id}/invoice`, '_blank')}
                        className="flex items-center gap-1 text-[8px] font-black text-gray-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                      >
                        <Printer className="w-3 h-3" />
                        Print Invoice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable Area - 2-Column Grid Responsive */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-50/30 custom-scrollbar">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                  {previewOrder?.items.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-red-600 transition-all duration-300 flex flex-col group h-full">
                      {/* Image Container - Highly compact */}
                      <div className="relative w-full h-24 sm:h-36 bg-white flex items-center justify-center p-2 sm:p-4 overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-100" />
                        )}

                        <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 bg-red-600 text-white font-black text-[7px] sm:text-[9px] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shadow-lg uppercase italic z-10">
                          x{item.quantity}
                        </div>
                      </div>
                      {/* Content Section */}
                      <div className="p-2 sm:p-3 flex flex-col border-t border-gray-50 space-y-0">
                        <div className="space-y-0">
                          <h3 className="font-bold text-[10px] sm:text-xs text-gray-900 leading-none group-hover:text-red-600 transition-colors line-clamp-2 m-0 p-0">
                            {item.name}
                          </h3>
                          <div className="m-0 p-0 leading-none">
                            <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate leading-none">
                              {item.weight || item.flavor || "Standard"}
                            </span>
                          </div>
                        </div>

                        <div className="m-0 p-0">
                          <div className="flex items-center gap-0.5 leading-none">
                            <span className="text-[10px] sm:text-xs font-bold text-red-600 leading-none">৳</span>
                            <span className="text-sm sm:text-lg font-black text-gray-900 tracking-tighter leading-none">
                              {item.price}
                            </span>
                          </div>

                          <Button
                            onClick={() => handleAddToCart(item)}
                            className={`w-full py-2 sm:py-4 font-black uppercase tracking-widest text-[8px] sm:text-[10px] transition-all active:scale-95 rounded-md sm:rounded-lg
                              ${isAddingMap[item.productId + (item.weight || '')]
                                ? 'bg-black text-white'
                                : 'bg-red-600 text-white hover:bg-black'}`}
                          >
                            <AnimatePresence mode="wait">
                              {isAddingMap[item.productId + (item.weight || '')] ? (
                                <motion.div
                                  key="check"
                                  initial={{ y: 20, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  exit={{ y: -20, opacity: 0 }}
                                  className="flex items-center gap-1"
                                >
                                  <Plus className="w-2 h-2 sm:w-3 sm:h-3 animate-spin" />
                                  <span>Add...</span>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="cart"
                                  initial={{ y: 20, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  exit={{ y: -20, opacity: 0 }}
                                  className="flex items-center gap-1 sm:gap-2"
                                >
                                  <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span>Reorder</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Area - Hidden on tiny screens if needed */}
            <div className="p-3 sm:p-4 bg-white/50 border-t border-gray-100 flex items-center justify-center shrink-0">
              <p className="text-[7px] sm:text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] sm:tracking-[0.4em]">
                Secure Order Archive Review
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Generating Overlay */}
      {/* (Removed as we now use a dedicated invoice tab) */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ef4444;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #000;
        }
      `}</style>
    </>
  );
}
