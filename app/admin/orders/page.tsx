'use client'

import { useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { ChevronLeft, ChevronRight, Search, Filter, PhoneCall, MessageCircle, Mail, Printer, BellRing, X } from 'lucide-react'
import { OrderInvoice } from '@/components/admin/order-invoice'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'

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
  thana?: string
  shippingAddress?: string
  shippingCity?: string
  shippingPostalCode?: string
  shippingThana?: string
  instruction?: string
  createdAt: string
  pendingApproval?: boolean
  promoCode?: string
  discountAmount?: number
  deliveryMethod?: string
  paymentMethod?: string
  paymentStatus?: string
  paymentDetails?: any
  subtotal?: number
  shippingCost?: number
  ruleDiscount?: number
  promoDiscount?: number
  customerType?: string
  amountPaid?: number
  amountDue?: number
  srDiscountPercent?: number
  srDiscountAmount?: number
}

export default function AdminOrdersPage() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // Notification state
  const lastTotalOrders = useRef<number | null>(null)
  const isFirstLoad = useRef(true)

  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '')
  const debouncedSearch = useDebounce(searchTerm, 500)
  const [statusFilter, setStatusFilter] = useState(() => {
    const urlStatus = searchParams.get('status')
    if (urlStatus) return urlStatus

    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const u = JSON.parse(userStr)
          if (u.role === 'moderator') return 'processing'
        } catch (e) { }
      }
    }
    return 'all'
  })
  const [sortBy, setSortBy] = useState('newest')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  // Unsaved status changes
  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: string }>({})
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({})
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const u = JSON.parse(userStr)
          return u.role
        } catch (e) { }
      }
    }
    return ''
  })

  // URL Parameter sync for back/forward navigation
  useEffect(() => {
    const q = searchParams.get('q')
    const status = searchParams.get('status')

    if (q !== null && q !== searchTerm) {
      setSearchTerm(q)
    }
    if (status !== null && status !== statusFilter) {
      setStatusFilter(status)
    }
  }, [searchParams])

  const clearSearch = () => {
    setSearchTerm('')
    // Optionally clear URL param q without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('q')
      window.history.replaceState({}, '', url.toString())
    }
  }

  useEffect(() => {
    setPage(1)
    isFirstLoad.current = true // Reset for new filter context
  }, [debouncedSearch, statusFilter, sortBy, startDate, endDate])

  useEffect(() => {
    fetchOrders(false, page > 1) // isBackground=false, isAppend=page > 1

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOrders(true, false) // background sync, refresh from start
    }, 30000)

    return () => clearInterval(interval)
  }, [debouncedSearch, statusFilter, page, sortBy, startDate, endDate])

  const handlePrint = (id: string) => {
    window.open(`/admin/orders/${id}/invoice`, '_blank');
  };

  const fetchOrders = async (isBackground = false, isAppend = false) => {
    if (!isBackground && !isAppend) setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('q', debouncedSearch)
      if (statusFilter !== 'all') {
        if (statusFilter === 'attention') {
          if (userRole === 'moderator') {
            params.append('status', 'processing,shipped')
          } else {
            params.append('status', 'pending,processing,shipped')
          }
        } else {
          params.append('status', statusFilter)
        }
      }
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      params.append('sort', sortBy)
      // If we are refreshing in background, we might want to fetch all current items
      // but for simplicity, we'll just fetch the first page to check for new ones.
      params.append('page', isBackground ? '1' : page.toString())
      params.append('limit', isBackground ? (page * limit).toString() : limit.toString())
      params.append('adminContext', 'true')

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const newOrders = data.orders || []
        const newTotal = data.pagination?.total || 0

        // Notification Logic
        if (!isFirstLoad.current && lastTotalOrders.current !== null && newTotal > lastTotalOrders.current) {
          const diff = newTotal - lastTotalOrders.current
          const isModerator = userRole === 'moderator'

          toast.success(isModerator ? `New order assigned to your queue!` : `You have ${diff} new order${diff > 1 ? 's' : ''}!`, {
            description: isModerator
              ? "An order has been moved to 'Processing' for your attention."
              : "Refreshing the list to show latest updates.",
            icon: <BellRing className="w-4 h-4 text-emerald-500" />,
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => {
                setPage(1)
                setSearchTerm('')
                if (isModerator) setStatusFilter('processing')
                else setStatusFilter('all')
              }
            }
          })
        }

        if (isAppend) {
          setOrders(prev => {
            // Filter out any duplicates just in case
            const existingIds = new Set(prev.map(o => o.id))
            const filteredNew = newOrders.filter((o: Order) => !existingIds.has(o.id))
            return [...prev, ...filteredNew]
          })
        } else {
          setOrders(newOrders)
        }

        setTotalPages(data.pagination?.totalPages || 1)
        lastTotalOrders.current = newTotal
        isFirstLoad.current = false
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      if (!isBackground && !isAppend) setIsLoading(false)
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
        if (userRole === 'moderator' && newStatus !== 'processing') {
          setOrders(orders.filter(o => o.id !== orderId));
        } else {
          setOrders(
            orders.map((o) => (o.id === orderId ? { ...o, ...data.order, pendingApproval: data.pendingApproval ? true : o.pendingApproval } : o))
          )
        }

        if (data.pendingApproval) {
          setTimeout(() => {
            alert("✓ Sync Initiated: This status change has been queued for authoritative verification.");
          }, 50);
        }

        const newPending = { ...pendingChanges }
        delete newPending[orderId]
        setPendingChanges(newPending)
      } else {
        let errorMessage = 'Failed to update';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            errorMessage = `Server Error: ${response.status} ${response.statusText}`;
          }
        } catch (e) {
          errorMessage = `Error: ${response.status}`;
        }
        alert(errorMessage)
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
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Sync (30s)
          </div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            Total orders: {lastTotalOrders.current || orders.length} (Page {page} of {totalPages})
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        {/* Search Input - Left side */}
        <div className="w-full xl:flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, Customer Name, Phone, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold bg-gray-50/20"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Date Filter Inputs - Center-Right */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-36 px-2.5 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-gray-700 bg-gray-50/50"
            />
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-36 px-2.5 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-gray-700 bg-gray-50/50"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-[9px] font-black text-red-600 hover:text-red-800 uppercase tracking-wider px-2 py-1.5 rounded-lg border border-red-100 hover:bg-red-50/50 transition-colors flex items-center gap-1 shrink-0"
              title="Clear dates"
            >
              Clear <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Dropdown Filters - Right side */}
        <div className="flex gap-3 w-full xl:w-auto">
          <div className="flex-1 sm:w-36 relative">
            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${statusFilter === 'attention' ? 'text-amber-600' : 'text-gray-400'
              }`} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full pl-9 pr-2 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none text-xs font-bold uppercase cursor-pointer transition-all ${statusFilter === 'attention'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 font-black shadow-sm ring-1 ring-amber-500'
                  : 'border-gray-200 bg-white text-gray-700'
                }`}
            >
              <option value="all">All Statuses</option>
              <option
                value="attention"
                className="bg-amber-50 text-amber-700 font-bold"
                style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 'bold' }}
              >
                Needs Actions
              </option>
              {userRole !== 'moderator' && <option value="pending">Pending</option>}
              <option value="cancelled">Cancelled</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div className="flex-1 sm:w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-9 pr-2 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-xs font-bold uppercase bg-white cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="total-high">Price: (High to Low)</option>
              <option value="total-low">Price: (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => {
            const currentStatus = pendingChanges[order.id] || order.status;
            const hasChange = !!pendingChanges[order.id];
            return (
              <Card
                key={order.id}
                className={`p-4 shadow-sm transition-all duration-300 ${order.customerType?.toLowerCase() === 'dealer'
                    ? 'border-amber-300 bg-amber-50/20 shadow-amber-100/50 hover:border-amber-500'
                    : order.customerType?.toLowerCase() === 'retailer'
                      ? 'border-blue-300 bg-blue-50/20 shadow-blue-100/50 hover:border-blue-500'
                      : order.customerType?.toLowerCase() === 'student'
                        ? 'border-rose-300 bg-rose-50/20 shadow-rose-100/50 hover:border-rose-500'
                        : order.customerType?.toLowerCase() === 'influencer'
                          ? 'border-violet-300 bg-violet-50/20 shadow-violet-100/50 hover:border-violet-500'
                          : order.customerType?.toLowerCase() === 'corporate'
                            ? 'border-indigo-300 bg-indigo-50/20 shadow-indigo-100/50 hover:border-indigo-500'
                            : order.customerType && !['customer', 'guest'].includes(order.customerType.toLowerCase())
                              ? 'border-teal-300 bg-teal-50/20 shadow-teal-100/50 hover:border-teal-500'
                              : 'border-gray-100/60 hover:shadow-md'
                  }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">
                        Order ID: {order.id.slice(-8).toUpperCase()}
                      </h3>
                      {order.customerType && !['customer', 'guest'].includes(order.customerType.toLowerCase()) && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 text-white rounded-lg shadow-sm ${order.customerType.toLowerCase() === 'dealer' ? 'bg-amber-600' :
                            order.customerType.toLowerCase() === 'retailer' ? 'bg-blue-600' :
                              order.customerType.toLowerCase() === 'student' ? 'bg-rose-600' :
                                order.customerType.toLowerCase() === 'influencer' ? 'bg-violet-600' :
                                  order.customerType.toLowerCase() === 'corporate' ? 'bg-indigo-600' :
                                    'bg-teal-600'
                          }`}>
                          <BellRing className="w-3 h-3 animate-pulse" />
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            {order.customerType} Order
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Middle Column: Payment Details (shows on the left of total amount) */}
                  <div className="flex-1 text-left sm:text-right sm:pr-8 flex flex-col justify-center sm:items-end gap-1.5 border-t sm:border-t-0 sm:border-r border-gray-100 pt-3 sm:pt-0">
                    <div className="flex items-center gap-2 justify-start sm:justify-end flex-wrap">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Payment:</span>
                      <span className="text-[10px] font-black uppercase text-gray-900">
                        {order.paymentMethod === 'sslcommerz' ? '💳 Online' : '💵 COD'}
                      </span>
                      {(() => {
                        const isPaid = order.paymentStatus === 'paid' || (order.amountDue !== undefined && order.amountDue <= 0);
                        const isPartial = order.paymentStatus === 'partial' && (order.amountDue !== undefined && order.amountDue > 0);
                        if (isPaid) {
                          return (
                            <span className="px-2 py-0.5 text-[8px] font-black rounded-md uppercase tracking-wider border bg-green-50 text-green-700 border-green-100">
                              PAID ✅
                            </span>
                          );
                        } else if (isPartial) {
                          return (
                            <span className="px-2 py-0.5 text-[8px] font-black rounded-md uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-100">
                              PARTIAL (Due ৳{(order.amountDue || 0).toFixed(0)}) ⏳
                            </span>
                          );
                        } else {
                          const isDelivered = order.status === 'delivered';
                          return (
                            <span className="px-2 py-0.5 text-[8px] font-black rounded-md uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-100">
                              {isDelivered ? 'Payment Pending ✅' : 'UNPAID ⏳'}
                            </span>
                          );
                        }
                      })()}
                    </div>
                    {order.paymentMethod === 'sslcommerz' && order.paymentStatus === 'paid' && (
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tight flex flex-col items-start sm:items-end leading-normal gap-0.5">
                        <div><span className="text-gray-400">Transaction ID:</span> <span className="font-mono font-black text-emerald-600">{order.id}</span></div>
                        {order.paymentDetails?.card_brand && (
                          <div><span className="text-gray-400">Payment Mode:</span> <span className="font-black text-blue-600 uppercase">{order.paymentDetails.card_brand}</span></div>
                        )}
                        {order.paymentDetails?.verifiedAt && (
                          <div><span className="text-gray-400">Payment Time:</span> <span className="font-black text-gray-700">{new Date(order.paymentDetails.verifiedAt).toLocaleString()}</span></div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-none pt-4 sm:pt-0 shrink-0">
                    <p className="text-2xl font-black text-gray-900 tracking-tighter">
                      ৳{order.total.toFixed(0)}
                    </p>
                    <div className="text-[10px] font-black text-gray-500 mt-0.5 uppercase tracking-tighter">
                      Incl. Delivery: ৳{(order.shippingCost || 0).toFixed(0)}
                    </div>
                    {(order.ruleDiscount || 0) > 0 && (
                      <div className="text-[10px] font-black text-amber-600 mt-1 uppercase tracking-tighter italic">
                        Flat Discount (-৳{(order.ruleDiscount || 0).toFixed(0)})
                      </div>
                    )}
                    {(order.promoDiscount || 0) > 0 && (
                      <div className="text-[10px] font-black text-green-600 mt-1 uppercase tracking-tighter italic">
                        Promo Applied {order.promoCode ? `(${order.promoCode})` : ''} (-৳{(order.promoDiscount || 0).toFixed(0)})
                      </div>
                    )}
                    {order.srDiscountAmount !== undefined && order.srDiscountAmount > 0 && (
                      <div className="text-[10px] font-black text-teal-600 mt-1 uppercase tracking-tighter italic">
                        Negotiated Discount ({order.srDiscountPercent}%) (-৳{order.srDiscountAmount.toFixed(0)})
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
                          disabled={['cancelled', 'lost', 'damaged', 'delivered'].includes(order.status) || order.pendingApproval || isSaving[order.id] || (order.paymentMethod === 'sslcommerz' && order.paymentStatus !== 'paid')}
                          className={`flex-1 sm:flex-none px-3 py-2 border rounded-lg text-xs font-black uppercase tracking-widest focus:outline-none transition-all ${hasChange ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            } ${(['cancelled', 'lost', 'damaged', 'delivered'].includes(order.status) || order.pendingApproval || (order.paymentMethod === 'sslcommerz' && order.paymentStatus !== 'paid')) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                        >
                          {userRole !== 'moderator' && <option value="pending">Pending</option>}
                          <option value="cancelled">Cancelled</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="damaged">Damaged</option>
                          <option value="lost">Lost</option>
                        </select>
                        {order.status === 'delivered' && (
                          <div className="mt-1.5 flex flex-col items-start sm:items-end">
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">Delivered On</span>
                            <span className="text-[9px] font-bold text-gray-500 mt-0.5">
                              {(() => {
                                const log = order.orderLogs?.find(l => l.toStatus === 'delivered');
                                const d = log ? new Date(log.changedAt) : new Date(order.createdAt);
                                return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;
                              })()}
                            </span>
                          </div>
                        )}
                        {!['pending', 'cancelled'].includes(currentStatus) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrint(order.id)}
                            className="border-gray-200 text-gray-600 hover:bg-gray-50 font-black text-[10px] h-9 px-4 rounded-lg flex items-center gap-2"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            PRINT INVOICE
                          </Button>
                        )}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 pt-2.5 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Details</p>
                    <p className="text-sm font-bold text-gray-900">{order.customerName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[11px] font-medium text-gray-500">{order.customerEmail}</p>
                      <a
                        href={`mailto:${order.customerEmail}`}
                        className="bg-slate-600 hover:bg-slate-700 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Mail className="w-2.5 h-2.5" />
                        Send Email
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Link</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 font-mono tracking-tighter">{order.customerPhone}</p>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="bg-blue-900 hover:bg-blue-950 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <PhoneCall className="w-2.5 h-2.5" />
                        Call now
                      </a>
                      <a
                        href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '').startsWith('0') ? '88' + order.customerPhone.replace(/[^0-9]/g, '') : order.customerPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <MessageCircle className="w-2.5 h-2.5" />
                        Send Message
                      </a>
                    </div>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Billing Destination</p>
                    <p className="text-sm font-bold text-gray-600 leading-tight">
                      {order.address}{order.thana ? `, PS: ${order.thana}` : ''}, Dist: {order.city} - {order.postalCode}
                    </p>
                  </div>
                  {order.paymentMethod === 'sslcommerz' && order.paymentDetails && (
                    <div className="sm:col-span-2 lg:col-span-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Metadata</p>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-[11px] font-medium text-gray-600 leading-tight">
                        <div><span className="text-gray-400 font-bold uppercase tracking-tight text-[8px]">Transaction ID:</span> <span className="font-mono font-black text-emerald-600">{order.id}</span></div>
                        <div><span className="text-gray-400 font-bold uppercase tracking-tight text-[8px]">Bank Transaction ID:</span> <span className="font-mono font-black text-red-600">{order.paymentDetails.bank_tran_id || 'N/A'}</span></div>
                        <div><span className="text-gray-400 font-bold uppercase tracking-tight text-[8px]">Validation ID:</span> <span className="font-mono font-black text-purple-600">{order.paymentDetails.val_id || 'N/A'}</span></div>
                        {order.paymentDetails.verifiedAt && (
                          <div><span className="text-gray-400 font-bold uppercase tracking-tight text-[8px]">Paid At:</span> <span className="text-gray-700 font-black">{new Date(order.paymentDetails.verifiedAt).toLocaleString()}</span></div>
                        )}
                        {order.paymentDetails.card_brand && (
                          <div><span className="text-gray-400 font-bold uppercase tracking-tight text-[8px]">Card Used:</span> <span className="text-blue-600 font-black uppercase">{order.paymentDetails.card_brand}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2.5 pt-2.5 border-t border-dashed border-gray-100">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      {order.deliveryMethod === 'pickup' ? 'Delivery Method (Pickup)' : 'Shipping Address'}
                    </p>
                    <p className="text-sm font-bold text-gray-600 leading-tight">
                      {order.deliveryMethod === 'pickup'
                        ? 'Collection Point Pickup'
                        : `${order.shippingAddress || order.address}${order.shippingThana || order.thana ? `, PS: ${order.shippingThana || order.thana}` : ''}, Dist: ${order.shippingCity || order.city} - ${order.shippingPostalCode || order.postalCode}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {order.instruction && (
                      <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Order Instructions</p>
                        <p className="text-xs font-bold text-amber-800 leading-tight">
                          {order.instruction}
                        </p>
                      </div>
                    )}
                    {order.statusReason && (
                      <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                        <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">{order.status} Reason</p>
                        <p className="text-xs font-bold text-red-800 leading-tight">
                          {order.statusReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex items-center justify-between">
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
                    <div className="max-w-xl space-y-3">
                      {order.items.map((item, idx) => {
                        const productLink = item.productSlug
                          ? `/shop/products/${item.productSlug}?weight=${encodeURIComponent(item.weight || '')}&flavor=${encodeURIComponent(item.flavor || '')}`
                          : undefined;

                        return (
                          <div key={idx} className="flex justify-between items-center text-sm border-b border-white/50 pb-2 last:border-0 last:pb-0">
                            {productLink ? (
                              <a
                                href={productLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/item-link hover:bg-white/50 p-1.5 -m-1.5 rounded-lg transition-all duration-200 cursor-pointer flex-1 mr-4"
                                title="Click to view product details"
                              >
                                <div>
                                  <p className="font-bold text-gray-900 group-hover/item-link:text-red-600 transition-colors group-hover/item-link:underline">
                                    {item.name}
                                  </p>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase">
                                    {item.weight || 'Std Unit'} • {item.flavor || 'Original'}
                                  </p>
                                </div>
                              </a>
                            ) : (
                              <div>
                                <p className="font-bold text-gray-900">{item.name}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">
                                  {item.weight || 'Std Unit'} • {item.flavor || 'Original'}
                                </p>
                              </div>
                            )}
                            <div className="text-right shrink-0">
                              <p className="font-bold text-gray-900 italic">৳{(item.price * item.quantity).toFixed(0)}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">Qty: {item.quantity} • ৳{item.price.toFixed(0)}/pc</p>
                            </div>
                          </div>
                        );
                      })}

                      <div className="mt-4 pt-4 border-t border-white space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] text-gray-600">
                          <span className="font-bold uppercase tracking-wider">Subtotal (Gross)</span>
                          <span className="font-bold text-gray-900">৳{order.subtotal?.toFixed(0) || (order.total - (order.shippingCost || 0) + (order.discountAmount || 0)).toFixed(0)}</span>
                        </div>
                        {(order.ruleDiscount || 0) > 0 && (
                          <div className="flex justify-between items-center text-[11px] text-amber-600">
                            <span className="font-bold uppercase tracking-wider">Flat Discount</span>
                            <span className="font-bold">- ৳{(order.ruleDiscount || 0).toFixed(0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[11px] text-gray-600">
                          <span className="font-bold uppercase tracking-wider">Delivery Charge</span>
                          <span className="font-bold text-gray-900">৳{(order.shippingCost || 0).toFixed(0)}</span>
                        </div>
                        {(order.promoDiscount || 0) > 0 && (
                          <div className="flex justify-between items-center text-[11px] text-green-600">
                            <span className="font-bold uppercase tracking-wider">Promo Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
                            <span className="font-bold">- ৳{(order.promoDiscount || 0).toFixed(0)}</span>
                          </div>
                        )}
                        {order.srDiscountAmount !== undefined && order.srDiscountAmount > 0 && (
                          <div className="flex justify-between items-center text-[11px] text-teal-600">
                            <span className="font-bold uppercase tracking-wider">Negotiated Discount ({order.srDiscountPercent}%)</span>
                            <span className="font-bold">- ৳{order.srDiscountAmount.toFixed(0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center border-t border-white/50 pt-2 mt-1">
                          <span className="font-black text-xs text-gray-900 uppercase tracking-widest">Grand Total</span>
                          <span className="font-black text-sm text-red-600">৳{order.total.toFixed(0)}</span>
                        </div>
                      </div>

                      {order.orderLogs && order.orderLogs.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-white">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Status History</p>
                          <div className="space-y-2">
                            {order.orderLogs.slice().reverse().map((log, idx) => (
                              <div key={idx} className="text-[10px] bg-white p-2 rounded-lg border border-gray-100 flex justify-between items-center">
                                <span className="text-gray-600">From <span className="font-bold">{log.fromStatus}</span> → <span className="font-bold text-red-600">{log.toStatus}</span> by {log.changedBy}</span>
                                <span className="text-gray-400 italic">{new Date(log.changedAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        ) : (
          <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
            No orders match your current filters.
          </div>
        )}
      </div>

      {page < totalPages && (
        <div className="flex justify-center mt-8 pb-10">
          <Button
            onClick={() => setPage(page + 1)}
            variant="outline"
            className="rounded-xl font-black uppercase text-[10px] tracking-widest px-12 py-6 border-2 border-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
          >
            Show More Orders
          </Button>
        </div>
      )}
      {page === totalPages && orders.length > 0 && (
        <div className="text-center py-10 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
          End of orders list
        </div>
      )}
    </div>
  )
}
