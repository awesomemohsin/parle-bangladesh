'use client';

import React from 'react';

interface InvoiceProps {
  order: any;
}

export const OrderInvoice = ({ order }: InvoiceProps) => {
  if (!order) return null;

  return (
    <div id={`invoice-${order.id}`} className="hidden print:block bg-white w-full max-w-[190mm] mx-auto font-sans text-gray-800 p-0 box-border overflow-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="mx-auto w-full bg-white p-[5mm] text-gray-800 border-t-[8px] border-b-[8px] border-red-600 min-h-[275mm] flex flex-col justify-start">
        {/* Header */}
        <div className="flex justify-between items-start" style={{ breakInside: 'avoid' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src="/logo.png" alt="Logo" className="h-9 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-black leading-6 text-red-600 uppercase tracking-tighter italic">
              PARLE <br /> <span className="text-gray-900 font-black">BANGLADESH</span>
            </h1>
            <p className="text-[8px] font-black text-gray-900 uppercase tracking-widest mt-0.5 max-w-[400px] leading-tight">
              M/S CIRCLE ENTERPRISE IS THE EXCLUSIVE AUTHORISED DISTRIBUTOR OF PARLE BISCUITS PVT. LTD- (INDIA) IN BANGLADESH.
            </p>
          </div>

          <div className="text-right">
            <h2 className="text-3xl font-black tracking-tight text-red-600 italic mb-0.5">
              INVOICE
            </h2>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">
              {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-[9px] font-black text-gray-900 mt-0.5 uppercase tracking-[0.2em]">Order ID: #{order.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 grid grid-cols-2 gap-6 text-[10px]" style={{ breakInside: 'avoid' }}>
          <div>
            <h3 className="font-black text-[8px] uppercase tracking-widest text-gray-900 mb-0.5">Office Address</h3>
            <p className="font-bold text-gray-900 leading-none">Circle Enterprise</p>
            <p className="text-gray-600 leading-tight mt-0.5">
              Unity trade Center, Nabinagar, Ashulia, Savar, Dhaka-1344
            </p>
            <p className="mt-1 font-black text-red-600 tracking-tight">+8801958113002</p>
          </div>

          <div>
            <h3 className="font-black text-[8px] uppercase tracking-widest text-gray-900 mb-0.5">Invoice To:</h3>
            <p className="font-black text-gray-900 uppercase leading-none">{order.customerName}</p>
            <p className="text-gray-600 leading-tight mt-0.5">
              {order.address}, {order.city} {order.postalCode}
            </p>
            <p className="mt-1 font-bold text-gray-900 leading-none">{order.customerPhone}</p>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4">
          <div className="grid grid-cols-12 bg-gray-100 text-[8px] font-black uppercase tracking-widest">
            <div className="col-span-6 bg-red-600 px-3 py-2 text-white">
              Items Description
            </div>
            <div className="col-span-2 bg-red-600 px-2 py-2 text-white text-center border-l border-white/10">
              Price
            </div>
            <div className="col-span-2 px-2 py-2 text-center text-gray-600">
              Qnt
            </div>
            <div className="col-span-2 px-2 py-2 text-right text-gray-600">
              Total
            </div>
          </div>

          {order.items.map((item: any, index: number) => (
            <div
              key={index}
              className={`grid grid-cols-12 text-[9px] items-center border-b border-gray-50 ${index % 2 === 1 ? "bg-gray-50/50" : "bg-white"
                }`}
            >
              <div className="col-span-6 px-3 py-1.5">
                <p className="font-black text-gray-900 uppercase tracking-tight leading-none">{item.name}</p>
                <div className="flex gap-2 mt-0.5">
                  {item.weight && <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">{item.weight}</span>}
                  {item.flavor && <span className="text-[7px] font-black text-red-600 uppercase tracking-tight italic">{item.flavor}</span>}
                </div>
              </div>
              <div className="col-span-2 px-2 py-1.5 font-bold text-center text-gray-700">৳{item.price.toFixed(0)}</div>
              <div className="col-span-2 px-2 py-1.5 text-center font-black text-gray-900">
                {item.quantity}
              </div>
              <div className="col-span-2 px-2 py-1.5 text-right font-black text-gray-900">
                ৳{(item.price * item.quantity).toFixed(0)}
              </div>
            </div>
          ))}
        </div>

        {/* Totals Section */}
        <div className="mt-4 flex justify-end">
          <div className="w-56 text-[9px]">
            <div className="flex justify-between py-1 px-1">
              <span className="font-black text-red-600 uppercase tracking-widest">SUBTOTAL :</span>
              <span className="font-black text-red-600">৳{(order.subtotal || (order.total - (order.shippingCost || 0) + (order.discountAmount || 0))).toFixed(0)}</span>
            </div>
            <div className="flex justify-between py-1 px-1 border-t border-gray-100">
              <span className="font-bold text-gray-500 uppercase tracking-widest">Delivery Fee :</span>
              <span className="font-bold text-gray-900">৳{(order.shippingCost || 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between py-1 px-1 border-t border-gray-100">
              <div className="flex flex-col">
                <span className="font-bold text-green-600 uppercase tracking-widest italic leading-none">Discount :</span>
                {order.promoCode && (
                  <span className="text-[7px] font-black text-gray-400 uppercase mt-0.5 tracking-widest">CODE: {order.promoCode}</span>
                )}
              </div>
              <span className="font-bold text-green-600">-৳{(order.discountAmount || 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between py-1 px-1 border-t border-gray-100">
              <span className="font-bold text-gray-500 uppercase tracking-widest">Payment :</span>
              <span className="font-black text-gray-900 uppercase italic text-[8px]">{order.paymentMethod || 'Cash on Delivery'}</span>
            </div>

            <div className="mt-2 flex items-center justify-between bg-red-600 px-3 py-2.5 text-white rounded-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.1em] italic">TOTAL DUE :</span>
              <span className="text-sm font-black italic">৳{order.total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Footer - Pushed to Bottom */}
        <div className="mt-auto">
          {order.instruction && (
            <div className="mt-3 text-[8px]">
              <h4 className="font-black uppercase tracking-widest text-gray-900 mb-0.5">Instructions:</h4>
              <p className="max-w-md text-gray-500 italic border-l border-gray-100 pl-3 leading-tight">
                {order.instruction}
              </p>
            </div>
          )}

          <p className="mt-4 text-[10px] font-black text-red-600 uppercase italic tracking-tighter">
            Thank you for your Business
          </p>

          <div className="mt-4 border-t border-red-600/30 pt-4 grid grid-cols-3 gap-4 text-[8px]" style={{ breakInside: 'avoid' }}>
            <div>
              <h4 className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">Questions?</h4>
              <p className="font-bold text-gray-900 leading-tight">Email: cfb@circlenetworkbd.net</p>
              <p className="font-bold text-gray-900 mt-0.5 leading-tight">Support: +8801958113002</p>
            </div>

            <div>
              <h4 className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">Distributor Details:</h4>
              <p className="font-bold text-gray-900 uppercase leading-tight">Circle Enterprise Hub</p>
              <p className="text-gray-900 mt-0.5 leading-tight uppercase text-[7px] font-bold">Official Distribution Network for Parle Products</p>
            </div>

            <div>
              <h4 className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">
                Terms & Note:
              </h4>
              <p className="text-gray-500 leading-tight">
                Goods once sold are not returnable. This is a system-generated invoice for the verified distributor network.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Indicator for Screen Mode */}
      <div className="print:hidden h-10 bg-gray-50 flex items-center justify-center border-t border-gray-200">
        <p className="text-[8px] font-black text-red-600 uppercase tracking-[0.4em] animate-pulse">Generated Secure Invoice Preview</p>
      </div>
    </div>
  );
}
