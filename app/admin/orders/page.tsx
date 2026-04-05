'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface OrderLog {
  fromStatus: string
  toStatus: string
  changedBy: string
  reason?: string
  changedAt: string
}

interface Order {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  total: number
  status: string
  cancelReason?: string
  statusReason?: string
  orderLogs?: OrderLog[]
  items: any[]
  address: string
  city: string
  postalCode: string
  shippingAddress?: string
  shippingCity?: string
  shippingPostalCode?: string
  instruction?: string
  createdAt: string
  pendingApproval?: boolean
  promoCode?: string
  discountAmount?: number
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  
  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 10

  // Unsaved status changes
  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: string }>({})
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({})
  const [showAllLogs, setShowAllLogs] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [debouncedSearch, statusFilter, page])

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('q', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      
      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setPendingChanges(prev => ({ ...prev, [orderId]: newStatus }))
  }

  const saveStatusChange = async (orderId: string) => {
    const newStatus = pendingChanges[orderId]
    if (!newStatus) return

    let statusReason = '';
    const reasonRequiredStatuses = ['cancelled', 'damaged', 'lost'];
    
    if (reasonRequiredStatuses.includes(newStatus)) {
      const reason = window.prompt(`Please enter the ${newStatus} reason:`);
      if (reason === null) return; // User cancelled the prompt
      statusReason = reason;
    }

    setIsSaving(prev => ({ ...prev, [orderId]: true }))

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus, statusReason }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.pendingApproval) {
            alert("This status change requires OWNER approval and has been queued.");
        }
        setOrders(
          orders.map((o) => (o.id === orderId ? { ...data.order, pendingApproval: data.pendingApproval } : o))
        )
        // Clear pending change
        const newPending = { ...pendingChanges }
        delete newPending[orderId]
        setPendingChanges(newPending)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to update'}`)
      }
    } catch (error) {
      console.error('Failed to update order:', error)
      alert('An error occurred while saving')
    } finally {
      setIsSaving(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const filteredOrders = orders; // Now filtered by API

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Loading orders...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by email, name, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="damaged">Damaged</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const currentStatus = pendingChanges[order.id] || order.status;
            const hasChange = !!pendingChanges[order.id];
              return (
            <Card key={order.id} className="p-3 px-4 shadow-sm border-gray-100/60">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 uppercase">
                    Order ID: {order.id.toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ৳{order.total.toFixed(2)}
                  </p>
                  {(order.discountAmount || 0) > 0 && (
                     <div className="text-sm font-bold text-green-600 mt-1 uppercase tracking-tighter">
                       Promo: {order.promoCode} (-৳{(order.discountAmount || 0).toFixed(2)})
                     </div>
                  )}
                  {order.pendingApproval && (
                    <div className="bg-amber-100 text-amber-700 text-[11px] font-black uppercase px-3 py-1 rounded shadow-sm animate-pulse border-2 border-amber-300 mt-2 flex items-center gap-2 justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Waiting for Owner Approval
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-2">
                    <select
                      value={currentStatus}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value)
                      }
                      disabled={order.pendingApproval || isSaving[order.id]}
                      className={`mt-2 px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        hasChange ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      } ${order.pendingApproval ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="damaged">Damaged</option>
                      <option value="lost">Lost</option>
                    </select>
                    {hasChange && (
                      <Button 
                        size="sm" 
                        onClick={() => saveStatusChange(order.id)}
                        disabled={isSaving[order.id]}
                        className="h-8 text-xs bg-green-600 hover:bg-green-700"
                      >
                        {isSaving[order.id] ? 'Saving...' : 'Save Change'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-1 text-sm">
                <div>
                  <p className="text-gray-600">Customer</p>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                  <p className="text-gray-600">{order.customerEmail}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{order.customerPhone}</p>
                </div>
                <div className="col-span-2 md:col-span-1 border-t md:border-t-0 pt-1 md:pt-0">
                  <p className="text-gray-600">Billing Address</p>
                  <p className="font-medium text-gray-900 leading-tight">
                    {order.address}, {order.city} - {order.postalCode}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 text-sm mt-3 pt-3 border-t border-dashed">
                 <div>
                   <p className="text-gray-600">Shipping Address</p>
                   <p className="font-medium text-gray-900 leading-tight">
                     {order.shippingAddress || order.address}, {order.shippingCity || order.city} - {order.shippingPostalCode || order.postalCode}
                   </p>
                 </div>
                 {order.instruction && (
                   <div>
                     <p className="text-gray-600">Delivery Instruction</p>
                     <p className="font-medium text-amber-800 bg-amber-50 p-2 rounded-md leading-tight border border-amber-100">
                       {order.instruction}
                     </p>
                   </div>
                 )}
              </div>

              <button
                onClick={() =>
                  setExpandedOrder(
                    expandedOrder === order.id ? null : order.id
                  )
                }
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {expandedOrder === order.id
                  ? 'Hide Items'
                  : `Show Items (${order.items.length})`}
              </button>

              {expandedOrder === order.id && (
                <div className="mb-2 pt-1 border-t border-dashed">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-600 border-b">
                        <th className="text-left py-1">Product</th>
                        <th className="text-right py-1">Qty</th>
                        <th className="text-right py-1">Price</th>
                        <th className="text-right py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-1">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{item.name}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.weight && (
                                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                    Weight: {item.weight}
                                  </span>
                                )}
                                {item.flavor && (
                                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                    Flavor: {item.flavor}
                                  </span>
                                )}
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-bold">
                                  Price: ৳{item.price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">৳{item.price.toFixed(2)}</td>
                          <td className="text-right font-medium">
                            ৳
                            {(item.price * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(order.statusReason || order.cancelReason) && (
                <div className={`mt-1 p-1.5 border rounded text-sm ${
                  order.status === 'cancelled' ? 'bg-red-50 border-red-100 text-red-700' :
                  order.status === 'damaged' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                  order.status === 'lost' ? 'bg-gray-50 border-gray-100 text-gray-700' : 
                  'bg-blue-50 border-blue-100 text-blue-700'
                }`}>
                  <strong className="capitalize">{order.status} Reason:</strong> {order.statusReason || order.cancelReason}
                </div>
              )}

              {/* Order Logs */}
              <div className="mt-2 pt-1 border-t">
                <div className="flex justify-between items-center mb-1">
                   <h4 className="text-sm font-semibold text-gray-900">Order Status History</h4>
                   {order.orderLogs && order.orderLogs.length > 5 && (
                      <button 
                         onClick={() => setShowAllLogs(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                         className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                         {showAllLogs[order.id] ? 'Minimize Logs' : `See Full Logs (${order.orderLogs.length})`}
                      </button>
                   )}
                </div>
                <div className="space-y-2">
                  {order.orderLogs && order.orderLogs.length > 0 ? (
                    (() => {
                        const sortedLogs = [...order.orderLogs].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
                        const displayedLogs = showAllLogs[order.id] ? sortedLogs : sortedLogs.slice(0, 5);
                        
                        return displayedLogs.map((log, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                            <div className="flex-1">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{log.fromStatus}</span>
                                <span className="text-gray-300">→</span>
                                <span className="text-[9px] font-black text-red-600 uppercase tracking-wider bg-red-50 px-1.5 py-0.5 rounded border border-red-100/50 shadow-sm shadow-red-100/10">
                                  {log.toStatus}
                                </span>
                                {log.reason && (
                                  <span className="text-[10px] text-gray-500 italic ml-1 leading-tight max-w-full">
                                    (Reason: {log.reason})
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-70">
                                by {log.changedBy} • {new Date(log.changedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ));
                    })()
                  ) : (
                    <p className="text-xs text-gray-400">No status changes yet</p>
                  )}
                </div>
              </div>


            </Card>
          )
        })
      ) : (
          <Card className="p-6 text-center text-gray-600">
            <p>No orders found</p>
          </Card>
        )}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white p-4 border border-gray-100 rounded-xl shadow-sm mt-6">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => {
              const p = i + 1;
              if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
                return (
                  <Button
                    key={p}
                    onClick={() => setPage(p)}
                    variant={page === p ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 w-8 p-0 text-[10px] font-bold ${page === p ? 'bg-blue-600 text-white border-blue-600' : ''}`}
                  >
                    {p}
                  </Button>
                );
              }
              if (p === page - 3 || p === page + 3) {
                return <span key={p} className="text-gray-300">...</span>;
              }
              return null;
            })}
            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
