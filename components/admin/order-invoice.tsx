'use client';

import React from 'react';

interface InvoiceProps {
  order: any;
}

export const OrderInvoice = ({ order }: InvoiceProps) => {
  if (!order) return null;

  const numberToWords = (amount: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numStr = Math.round(amount).toString();
    if (numStr.length > 9) return 'Amount too large';

    const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += n[1] != '00' ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
    str += n[2] != '00' ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
    str += n[3] != '00' ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
    str += n[4] != '0' ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
    str += n[5] != '00' ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
    return str + 'Taka Only';
  };

  const items = order.items || [];

  const chunkItems = (items: any[]) => {
    if (items.length <= 13) {
      return [items];
    }

    const pages: any[][] = [];
    const tempItems = [...items];

    for (let i = 0; i < tempItems.length; i += 13) {
      pages.push(tempItems.slice(i, i + 13));
    }

    return pages;
  };

  const itemChunks = chunkItems(items);
  const isMultiPage = itemChunks.length > 1;

  return (
    <div id={`invoice-${order.id}`} className="bg-white w-full max-w-[190mm] mx-auto font-sans text-gray-800 p-0 box-border overflow-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}>
      {/* @ts-ignore */}
      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
        @media print {
          .invoice-page {
            page-break-after: always !important;
            break-after: page !important;
          }
          .invoice-page-last {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {itemChunks.map((chunk, pageIndex) => {
        const pageNumber = pageIndex + 1;
        const totalPages = itemChunks.length;
        const isLastPage = pageNumber === totalPages;

        return (
          <div
            key={pageIndex}
            className={`invoice-page ${isLastPage ? 'invoice-page-last' : ''} mx-auto w-full bg-white p-[5mm] text-gray-800 border-t-[8px] border-b-[8px] border-red-600 min-h-[275mm] flex flex-col justify-start relative mb-8 print:mb-0`}
          >
            {/* Header */}
            {pageNumber === 1 ? (
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
                  {['cancelled', 'lost', 'damaged', 'returned'].includes(order.status) && (
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-sm border ${order.status === 'returned' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        ORDER {order.status}
                      </span>
                    </div>
                  )}
                  {isMultiPage && (
                    <p className="text-[9px] font-black text-red-600 mt-1 uppercase tracking-wider">Page {pageNumber} of {totalPages}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center pb-2 border-b border-gray-100" style={{ breakInside: 'avoid' }}>
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" />
                  <div>
                    <h1 className="text-sm font-black text-red-600 uppercase tracking-tight italic leading-none">
                      PARLE BANGLADESH
                    </h1>
                    <p className="text-[7px] text-gray-500 uppercase mt-0.5 leading-none">Authorized Distributor: Circle Enterprise</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-950 uppercase tracking-wider leading-none">
                    INVOICE CONTD.
                  </p>
                  <p className="text-[8px] font-bold text-gray-500 mt-0.5 uppercase tracking-wider">
                    Order ID: #{order.id.slice(-8).toUpperCase()}
                  </p>
                  {['cancelled', 'lost', 'damaged', 'returned'].includes(order.status) && (
                    <div className="mt-0.5">
                      <span className={`inline-block px-1.5 py-0.2 text-[7px] font-black uppercase tracking-wider rounded-sm border ${order.status === 'returned' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        {order.status}
                      </span>
                    </div>
                  )}
                  <p className="text-[8px] font-black text-red-600 mt-0.5 uppercase tracking-wider">
                    Page {pageNumber} of {totalPages}
                  </p>
                </div>
              </div>
            )}

            {/* Info */}
            {pageNumber === 1 && (
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
                  <p className="text-gray-600 leading-tight mt-1 text-[9px]">
                    <span className="font-bold text-gray-900 uppercase mr-1">Billing Address:</span>
                    {order.address}{order.thana ? `, Thana: ${order.thana}` : ''}, District: {order.city} {order.postalCode}
                  </p>
                  <p className="mt-1 font-bold text-gray-900 leading-none">{order.customerPhone}</p>
                </div>
              </div>
            )}

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

              {chunk.map((item: any, index: number) => (
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

            {/* Totals Section / Non-Last Page continued footer */}
            {isLastPage ? (
              <div className="mt-4 flex justify-between items-stretch gap-4">
                <div className="flex-1 flex flex-col justify-between pb-0.5">
                  <div>
                    {/* Row aligning with Subtotal - Empty */}
                    <div className="h-[14px]"></div>

                    {/* Row aligning with Delivery Fee - Delivery Info */}
                    <div className="mt-1">
                      <h4 className="text-[12px] font-black uppercase tracking-widest text-red-600 leading-none mb-1.5 underline decoration-red-600/30 underline-offset-2">
                        {order.deliveryMethod === 'pickup' ? 'Delivery Method (Pickup):' : 'Shipping Address:'}
                      </h4>
                      <div className="bg-gray-50 border-l-2 border-red-600 p-2 max-w-[320px]">
                        {order.deliveryMethod === 'pickup' ? (
                          <>
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">Collection Point Pickup</p>
                            <p className="text-[10px] text-red-600 font-black italic mt-0.5">Yassin Tower, Savar, Dhaka</p>
                          </>
                        ) : (
                          <p className="text-[10px] font-black text-gray-900 uppercase leading-tight">
                            {order.shippingAddress || order.address}{order.shippingThana || order.thana ? `, Thana: ${order.shippingThana || order.thana}` : ''}, District: {order.shippingCity || order.city} {order.shippingPostalCode || order.postalCode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <h4 className="text-[8px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Amount in Words:</h4>
                    <p className="text-[10px] font-black text-gray-900 uppercase italic leading-none border-l-2 border-red-600 pl-2">
                      {numberToWords(Math.round(order.total))}
                    </p>
                  </div>
                </div>
                <div className="w-56 text-[9px]">
                  <div className="flex justify-between py-1 px-1 text-black">
                    <span className="font-black uppercase tracking-widest">SUBTOTAL :</span>
                    <span className="font-black">৳{(order.subtotal || (order.total - (order.shippingCost || 0) + (order.discountAmount || 0))).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between py-1 px-1 border-t border-gray-100 text-blue-600">
                    <span className="font-bold uppercase tracking-widest">Delivery Fee :</span>
                    <span className="font-bold">৳{(order.shippingCost || 0).toFixed(0)}</span>
                  </div>
                  {order.srDiscountAmount > 0 ? (
                    <>
                      {((order.discountAmount || 0) - order.srDiscountAmount - (order.circleDiscount || 0)) > 0 && (
                        <div className="flex justify-between py-1 px-1 border-t border-gray-100">
                          <div className="flex flex-col">
                            <span className="font-bold text-green-600 uppercase tracking-widest italic leading-none">Coupon/Flat Discount :</span>
                            {order.promoCode && (
                              <span className="text-[7px] font-black text-gray-400 uppercase mt-0.5 tracking-widest">CODE: {order.promoCode}</span>
                            )}
                          </div>
                          <span className="font-bold text-green-600">-৳{((order.discountAmount || 0) - order.srDiscountAmount - (order.circleDiscount || 0)).toFixed(0)}</span>
                        </div>
                      )}
                      {order.circleNetworkDiscount && (
                        <div className="flex justify-between py-1 px-1 border-t border-gray-100 text-amber-600">
                          <div className="flex flex-col">
                            <span className="font-bold uppercase tracking-widest italic leading-none text-[8px]">Circle Network Discount :</span>
                            <span className="text-[7px] font-black text-gray-400 mt-0.5 tracking-widest leading-none">
                              ID: {order.circleNetworkDiscount.id} | NO: {order.circleNetworkDiscount.number}
                            </span>
                          </div>
                          <span className="font-bold text-amber-600">-৳{(order.circleDiscount || 0).toFixed(0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 px-1 border-t border-gray-100 text-teal-600">
                        <span className="font-bold uppercase tracking-widest italic leading-none">Special Discount :</span>
                        <span className="font-bold text-teal-600">-৳{order.srDiscountAmount.toFixed(0)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {((order.discountAmount || 0) - (order.circleDiscount || 0)) > 0 && (
                        <div className="flex justify-between py-1 px-1 border-t border-gray-100">
                          <div className="flex flex-col">
                            <span className="font-bold text-green-600 uppercase tracking-widest italic leading-none">Discount :</span>
                            {order.promoCode && (
                              <span className="text-[7px] font-black text-gray-400 uppercase mt-0.5 tracking-widest">CODE: {order.promoCode}</span>
                            )}
                          </div>
                          <span className="font-bold text-green-600">-৳{((order.discountAmount || 0) - (order.circleDiscount || 0)).toFixed(0)}</span>
                        </div>
                      )}
                      {order.circleNetworkDiscount && (
                        <div className="flex justify-between py-1 px-1 border-t border-gray-100 text-amber-600">
                          <div className="flex flex-col">
                            <span className="font-bold uppercase tracking-widest italic leading-none text-[8px]">Circle Network Discount :</span>
                            <span className="text-[7px] font-black text-gray-400 mt-0.5 tracking-widest leading-none">
                              ID: {order.circleNetworkDiscount.id} | NO: {order.circleNetworkDiscount.number}
                            </span>
                          </div>
                          <span className="font-bold text-amber-600">-৳{(order.circleDiscount || 0).toFixed(0)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between py-1 px-1 border-t border-gray-100 text-[11px] text-red-600">
                    <span className="font-black uppercase tracking-widest">Total Amount :</span>
                    <span className="font-black">৳{order.total.toFixed(0)}</span>
                  </div>
                  {(() => {
                    const isPaid = order.paymentStatus === 'paid' || (!['cancelled', 'lost', 'damaged', 'returned'].includes(order.status) && order.amountDue !== undefined && order.amountDue <= 0);

                    const paymentReceived = order.amountPaid !== undefined ? order.amountPaid : (isPaid ? order.total : 0);

                    const totalDue = order.amountDue !== undefined ? order.amountDue : (isPaid ? 0 : order.total);

                    const getPaymentStatusText = () => {
                      if (['cancelled', 'lost', 'damaged', 'returned'].includes(order.status)) {
                        return `${order.status.toUpperCase()}`;
                      }
                      if (isPaid) return 'PAID ✅';
                      if (order.paymentStatus === 'partial') return `PARTIAL (Due ৳${totalDue.toFixed(0)}) ⏳`;
                      return order.status === 'delivered' ? 'Payment Pending ✅' : 'UNPAID ⏳';
                    };

                    const statusColor = ['cancelled', 'lost', 'damaged', 'returned'].includes(order.status)
                      ? (order.status === 'returned' ? 'text-purple-600' : 'text-red-600')
                      : (isPaid ? 'text-green-600' : 'text-amber-600');

                    return (
                      <>
                        <div className="flex justify-between py-1 px-1 border-t border-gray-100 text-gray-500">
                          <span className="font-bold uppercase tracking-widest text-[8px]">Payment Recieved :</span>
                          <span className="font-black text-gray-950 text-[9px]">৳{paymentReceived.toFixed(0)}</span>
                        </div>

                        <div className="flex justify-between py-1 px-1 border-t border-gray-100">
                          <span className="font-bold text-gray-500 uppercase tracking-widest text-[8px]">PAYMENT STATUS :</span>
                          <span className={`font-black uppercase text-[8px] ${statusColor}`}>
                            {getPaymentStatusText()}
                          </span>
                        </div>

                        {totalDue > 0 && (
                          <div className="flex justify-between py-1 px-1 border-t border-gray-100 text-gray-500">
                            <span className="font-bold uppercase tracking-widest text-[8px]">PAYMENT METHOD :</span>
                            <span className="font-black text-gray-950 uppercase text-[8px]">CASH ON DELIVERY</span>
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between bg-red-600 px-3 py-2.5 text-white rounded-sm">
                          <span className="text-[10px] font-black uppercase tracking-[0.1em] italic">TOTAL DUE :</span>
                          <span className="text-sm font-black italic">
                            ৳{totalDue.toFixed(0)}
                          </span>
                        </div>

                        {order.paymentStatus === 'paid' && order.paymentMethod === 'sslcommerz' && (
                          <div className="flex flex-col gap-1 py-1.5 px-1 border-t border-gray-100 text-[9px] text-gray-500 leading-normal font-bold">
                            <div><span className="uppercase tracking-tight text-gray-400">Transaction ID:</span> <span className="font-mono text-gray-900 font-black text-[9px]">{order.id}</span></div>
                            {order.paymentDetails?.card_brand && (
                              <div><span className="uppercase tracking-tight text-gray-400">Payment Mode:</span> <span className="text-blue-600 uppercase font-black text-[9px]">{order.paymentDetails.card_brand}</span></div>
                            )}
                            {order.paymentDetails?.verifiedAt && (
                              <div><span className="uppercase tracking-tight text-gray-400">Payment Time:</span> <span className="text-gray-950 font-black text-[9px]">{new Date(order.paymentDetails.verifiedAt).toLocaleString()}</span></div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="mt-auto pt-4 flex justify-between items-center border-t border-dashed border-gray-200" style={{ breakInside: 'avoid' }}>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic animate-pulse">
                  Invoice continued on next page...
                </span>
                <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-1 rounded uppercase tracking-wider">
                  Page {pageNumber} of {totalPages}
                </span>
              </div>
            )}

            {/* Signatures & Footer */}
            {isLastPage && (
              <div className="mt-auto">
                {order.instruction && (
                  <div className="mt-2 text-[8px]">
                    <h4 className="font-black uppercase tracking-widest text-gray-900 mb-0.5">Order Instructions:</h4>
                    <p className="max-w-md text-gray-500 italic border-l border-gray-100 pl-3 leading-tight">
                      {order.instruction}
                    </p>
                  </div>
                )}

                {(order.statusReason || order.cancelReason) && (
                  <div className="mt-2 text-[8px]" style={{ breakInside: 'avoid' }}>
                    <h4 className={`font-black uppercase tracking-widest mb-0.5 ${order.status === 'returned' ? 'text-purple-700' :
                      order.status === 'cancelled' ? 'text-red-600' :
                        'text-amber-700'
                      }`}>
                      {order.status} Reason:
                    </h4>
                    <p className={`max-w-md italic border-l-2 pl-3 leading-tight font-medium p-1.5 rounded-sm ${order.status === 'returned' ? 'text-purple-900 border-purple-300 bg-purple-50/50' :
                      order.status === 'cancelled' ? 'text-red-900 border-red-300 bg-red-50/50' :
                        'text-amber-900 border-amber-300 bg-amber-50/50'
                      }`}>
                      {order.statusReason || order.cancelReason}
                    </p>
                  </div>
                )}

                {!['cancelled', 'lost', 'damaged', 'returned'].includes(order.status) && (
                  <p className="mt-4 text-[10px] font-black text-red-600 uppercase italic tracking-tighter">
                    Thank you for your Purchase!
                  </p>
                )}

                <div className="mt-2 border-t border-red-600/30 pt-4 grid grid-cols-3 gap-4 text-[8px]" style={{ breakInside: 'avoid' }}>
                  <div>
                    <h4 className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">Questions?</h4>
                    <p className="font-bold text-gray-900 leading-tight">Email: cfb@circlenetworkbd.net</p>
                    <p className="font-bold text-gray-900 mt-0.5 leading-tight">Support: +8801958113002</p>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">Distributor Details:</h4>
                    <p className="font-bold text-gray-900 uppercase leading-tight">Circle Enterprise Hub</p>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">
                      Terms & Note:
                    </h4>
                    <p className="text-gray-500 leading-tight">
                      {['cancelled', 'lost', 'damaged', 'returned'].includes(order.status)
                        ? `This order was marked as ${order.status.toUpperCase()}. This is a system-generated record for the verified distributor network.`
                        : "Goods once sold are not returnable. This is a system-generated invoice for the verified distributor network."
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Absolute page number for print */}
            {isMultiPage && (
              <div className="absolute bottom-1 right-5 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                Page {pageNumber} of {totalPages}
              </div>
            )}
          </div>
        );
      })}

      {/* Visual Indicator for Screen Mode */}
      <div className="print:hidden h-10 bg-gray-50 flex items-center justify-center border-t border-gray-200">
        <p className="text-[8px] font-black text-red-600 uppercase tracking-[0.4em] animate-pulse">Generated Secure Invoice Preview</p>
      </div>
    </div>
  );
};
