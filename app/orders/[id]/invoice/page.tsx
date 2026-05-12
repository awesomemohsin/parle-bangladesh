'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OrderInvoice } from '@/components/admin/order-invoice';

export default function InvoicePage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order || data);
        } else {
          setOrder(null);
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id]);

  useEffect(() => {
    if (order && !loading) {
      // Small delay to ensure all assets (fonts/logos) are loaded before printing
      setTimeout(() => {
        window.print();
        // Optional: window.close(); // You might want to keep it open so they can see the invoice
      }, 1000);
    }
  }, [order, loading]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] animate-pulse">Initializing Invoice System...</p>
      </div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <p className="text-red-600 font-black uppercase tracking-widest text-xs">Order Not Found or Access Denied</p>
    </div>
  );

  return (
    <div className="bg-white min-h-screen p-0">
      <div className="print-area block">
        <OrderInvoice order={order} />
      </div>

      <style jsx global>{`
        /* Kill ALL layout elements and their spacing */
        nav, footer, header, section, .navbar, .footer, .career-cta, #navbar, #footer {
          display: none !important;
        }

        /* Remove the root layout's top padding */
        main {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }

        @media print {
          @page { margin: 0; size: auto; }
          body { margin: 0; padding: 0; background: white !important; }
          .print-area { display: block !important; visibility: visible !important; }
        }
        
        body {
          background: white !important;
          display: block !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .print-area {
          background: white;
          width: 100%;
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
