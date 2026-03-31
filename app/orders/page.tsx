"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
const formatCurrency = (val: number) => `৳${val.toFixed(2)}`;
const formatDate = (dateString: string) => new Date(dateString).toLocaleString()

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  weight?: string;
  flavor?: string;
}

interface Order {
  id: string;
  createdAt: string;
  total: number;
  status: string;
  items: OrderItem[];
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/auth/login";
          return;
        }

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-none">My Orders</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-2">Track your history & status</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="SEARCH BY PRODUCT OR ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 px-4 pl-10 text-[10px] font-black uppercase tracking-widest bg-gray-50 border border-gray-200 rounded-lg focus:border-red-600 focus:bg-white focus:outline-none transition-all w-full sm:w-[240px]"
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-4 text-[10px] font-black uppercase tracking-widest bg-gray-50 border border-gray-200 rounded-lg focus:border-red-600 focus:bg-white focus:outline-none transition-all cursor-pointer appearance-none min-w-[140px]"
          >
            <option value="all">ALL STATUSES</option>
            <option value="pending">PENDING</option>
            <option value="processing">PROCESSING</option>
            <option value="shipped">SHIPPED</option>
            <option value="delivered">DELIVERED</option>
            <option value="cancelled">CANCELLED</option>
          </select>
        </div>
      </div>
      
      {isLoading && orders.length === 0 ? (
        <p className="text-gray-500">Loading your orders...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">You have not placed any orders yet.</p>
          <Link href="/shop" className="text-red-600 font-medium hover:underline">
            Start Shopping
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="p-6 transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    Order ID: <span className="font-mono text-gray-700">{order.id}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Placed on {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="mt-4 md:mt-0 flex gap-4 items-center">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize 
                    ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      order.status === 'processing' ? 'bg-red-100 text-red-800' : 
                      order.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 
                      'bg-red-50 text-red-700 font-bold border border-red-100'}`}>
                    {order.status}
                  </span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(order.total)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Items:</h4>
                <ul className="divide-y divide-gray-50">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="py-2 flex justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-medium">
                          {item.quantity}x {item.name}
                        </span>
                        <div className="flex gap-2 mt-1">
                          {item.weight && (
                            <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100">
                              W: {item.weight}
                            </span>
                          )}
                          {item.flavor && (
                            <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100">
                              F: {item.flavor}
                            </span>
                          )}
                          <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 font-semibold">
                            Unit Price: {formatCurrency(item.price)}
                          </span>
                        </div>
                      </div>
                      <span className="text-gray-800 font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
