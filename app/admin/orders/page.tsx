'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react'

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
  deliveryMethod?: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 10

  // Unsaved status changes
  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: string }>({})
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, sortBy])

  useEffect(() => {
    fetchOrders()
  }, [debouncedSearch, statusFilter, page, sortBy])

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('q', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('sort', sortBy)
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      params.append('adminContext', 'true')

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
      if (reason === null) return;
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
          alert("✓ Sync Initiated: This status change has been queued for authoritative verification.");
        }
        setOrders(
          orders.map((o) => (o.id === orderId ? { ...data.order, pendingApproval: data.pendingApproval } : o))
        )
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

  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 italic uppercase">Orders List</h1>
        <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">
          Total orders: {orders.length} (Page {page} of {totalPages})
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, Customer Name, Phone, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
          />
        </div>
        <div className="w-full md:w-48 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm font-bold uppercase"
          >
            <option value="all">Statuses</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="damaged">Damaged</option>
            <option value="lost">Lost</option>
          </select>
        </div>
        <div className="w-full md:w-48 relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
           <select
             value={sortBy}
             onChange={(e) => setSortBy(e.target.value)}
             className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm font-bold uppercase"
           >
             <option value="newest">Newest First</option>
             <option value="oldest">Oldest First</option>
             <option value="total-high">Price: High to Low</option>
             <option value="total-low">Price: Low to High</option>
           </select>
        </div>
      </div>

      <div className="space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => {
            const currentStatus = pendingChanges[order.id] || order.status;
            const hasChange = !!pendingChanges[order.id];
            return (
              <Card key={order.id} className="p-4 shadow-sm border-gray-100/60 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">
                      Order ID: {order.id.slice(-8).toUpperCase()}
                    </h3>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-none pt-4 sm:pt-0">
                    <p className="text-2xl font-black text-gray-900 tracking-tighter">
                      ৳{order.total.toFixed(0)}
                    </p>
                    {(order.discountAmount || 0) > 0 && (
                      <div className="text-[10px] font-black text-green-600 mt-1 uppercase tracking-tighter italic">
                        Promo Applied (-৳{(order.discountAmount || 0).toFixed(0)})
                      </div>
                    )}
                    {order.pendingApproval && (
                      <div className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-3 py-1.5 rounded shadow-sm animate-pulse border border-amber-300 mt-2 flex items-center gap-2 justify-center italic">
                        Pending Final Verification
                      </div>
                    )}
                    <div className="flex flex-col items-start sm:items-end gap-2 mt-3">
                      <div className="flex gap-2 w-full sm:w-auto">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={order.pendingApproval || isSaving[order.id]}
                          className={`flex-1 sm:flex-none px-3 py-2 border rounded-lg text-xs font-black uppercase tracking-widest focus:outline-none transition-all ${hasChange ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
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
                            className="bg-green-600 hover:bg-green-700 text-white font-black text-[10px] h-9 px-4 rounded-lg shadow-sm"
                          >
                            {isSaving[order.id] ? 'Saving...' : 'SAVE'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 pt-4 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Details</p>
                    <p className="text-sm font-bold text-gray-900">{order.customerName}</p>
                    <p className="text-[11px] font-medium text-gray-500">{order.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Link</p>
                    <p className="text-sm font-bold text-gray-900 font-mono tracking-tighter">{order.customerPhone}</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Billing Destination</p>
                    <p className="text-sm font-bold text-gray-600 leading-tight">
                      {order.address}, {order.city} - {order.postalCode}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-dashed border-gray-100">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      {order.deliveryMethod === 'pickup' ? 'Delivery Method (Pickup)' : 'Shipping Address'}
                    </p>
                    <p className="text-sm font-bold text-gray-600 leading-tight">
                      {order.deliveryMethod === 'pickup' 
                        ? 'Collection Point Pickup' 
                        : `${order.shippingAddress || order.address}, ${order.shippingCity || order.city} - ${order.shippingPostalCode || order.postalCode}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {order.instruction && (
                      <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Staff Instructions</p>
                        <p className="text-xs font-bold text-amber-800 leading-tight">
                          {order.instruction}
                        </p>
                      </div>
                    )}
                    {order.statusReason && (
                      <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                        <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">Status Reason</p>
                        <p className="text-xs font-bold text-red-800 leading-tight">
                          {order.statusReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="text-blue-600 hover:text-blue-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    {expandedOrder === order.id ? 'Hide Details' : `View Order Items (${order.items.length})`}
                  </button>
                  <span className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em] italic">Staff Only</span>
                </div>

                {expandedOrder === order.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 bg-slate-50/50 p-4 rounded-xl space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b border-white/50 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-gray-900">{item.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">{item.weight || 'Std Unit'} • {item.flavor || 'Original'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 italic">৳{(item.price * item.quantity).toFixed(0)}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}

                    {order.orderLogs && order.orderLogs.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Status History</p>
                        <div className="space-y-2">
                          {order.orderLogs.slice().reverse().map((log, idx) => (
                            <div key={idx} className="text-[10px] bg-white p-2 rounded-lg border border-gray-100 flex justify-between items-center">
                              <span className="text-gray-600">From <span className="font-bold">{log.fromStatus}</span> → <span className="font-bold text-red-600">{log.toStatus}</span> by {log.changedBy}</span>
                              <span className="text-gray-400 italic">12:30 PM</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">No orders matching the current filter identified</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8 pb-10">
          <Button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            variant="outline"
            className="rounded-xl font-bold uppercase text-xs px-6"
          >
            Previous
          </Button>
          <span className="text-sm font-bold text-gray-600">
            {page} / {totalPages}
          </span>
          <Button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            variant="outline"
            className="rounded-xl font-bold uppercase text-xs px-6"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
