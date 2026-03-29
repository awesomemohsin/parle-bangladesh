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

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/auth/login";
          return;
        }

        const res = await fetch("/api/orders", {
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
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
      
      {isLoading ? (
        <p className="text-gray-500">Loading your orders...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">You have not placed any orders yet.</p>
          <Link href="/shop" className="text-blue-600 font-medium hover:underline">
            Start Shopping
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="p-6">
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
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                      'bg-orange-100 text-orange-800'}`}>
                    {order.status}
                  </span>
                  <span className="text-lg font-bold">{formatCurrency(order.total)}</span>
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
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-semibold">
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
