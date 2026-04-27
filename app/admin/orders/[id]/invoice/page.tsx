'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OrderInvoice } from '@/components/admin/order-invoice';

export default function OrderInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
        } else {
          setError('Order not found or access denied');
        }
      } catch (err) {
        setError('Failed to load order data');
      }
    };

    if (id) fetchOrder();
  }, [id]);

  useEffect(() => {
    if (order) {
      // Allow time for styles and images (logo) to load
      const timer = setTimeout(() => {
        window.print();
        // Optional: window.close(); 
        // Note: Some browsers block window.close() unless opened by script
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [order]);

  if (error) return <div className="p-10 text-red-600 font-bold">{error}</div>;
  if (!order) return <div className="p-10 font-bold uppercase tracking-widest animate-pulse">Generating Professional Invoice...</div>;

  return (
    <div className="bg-white min-h-screen">
      {/* 
          On this page, the OrderInvoice will NOT be hidden 
          We use a special class to force visibility 
      */}
      <style jsx global>{`
        #invoice-${order.id} {
          display: block !important;
          visibility: visible !important;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          html, body {
             background: white !important;
             margin: 0 !important;
             padding: 0 !important;
             height: 100vh !important;
             width: 100% !important;
             overflow: hidden !important;
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
          }
          * {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
          *::-webkit-scrollbar {
            display: none !important;
          }
          nav, footer, .no-print, .print-btn {
            display: none !important;
          }
          .py-10 {
            padding: 0 !important;
          }
          #invoice-${order.id} {
            page-break-after: avoid;
            page-break-before: avoid;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="print:hidden fixed top-6 right-6 z-[100]">
        <button 
          onClick={() => window.print()}
          className="print-btn bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 transition-all active:scale-95 uppercase tracking-widest text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Print Invoice
        </button>
      </div>

      <div className="py-10">
        <OrderInvoice order={order} />
      </div>
    </div>
  );
}
