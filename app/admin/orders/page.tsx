'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface OrderLog {
  fromStatus: string
  toStatus: string
  changedBy: string
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
  orderLogs?: OrderLog[]
  items: any[]
  createdAt: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  
  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Unsaved status changes
  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: string }>({})
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
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

    let cancelReason = '';
    if (newStatus === 'cancelled') {
      const reason = window.prompt('Please enter the cancellation reason:');
      if (reason === null) return; // User cancelled the prompt
      cancelReason = reason;
    }

    setIsSaving(prev => ({ ...prev, [orderId]: true }))

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus, cancelReason }),
      })

      if (response.ok) {
        const data = await response.json()
        setOrders(
          orders.map((o) => (o.id === orderId ? data.order : o))
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Loading orders...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
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
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const currentStatus = pendingChanges[order.id] || order.status;
            const hasChange = !!pendingChanges[order.id];
            return (
            <Card key={order.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.id.substring(0, 8).toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ৳{order.total.toFixed(2)}
                  </p>
                  <div className="flex flex-col items-end gap-2">
                    <select
                      value={currentStatus}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value)
                      }
                      className={`mt-2 px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        hasChange ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
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

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-600">Customer</p>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                  <p className="text-gray-600">{order.customerEmail}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{order.customerPhone}</p>
                </div>
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

              {order.status === 'cancelled' && order.cancelReason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-sm">
                  <strong>Cancellation Reason:</strong> {order.cancelReason}
                </div>
              )}

              {/* Order Logs */}
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Order Status History</h4>
                <div className="space-y-3">
                  {order.orderLogs && order.orderLogs.length > 0 ? (
                    order.orderLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div className="flex-1">
                          <span className="font-semibold text-gray-900 capitalize">{log.fromStatus}</span>
                          <span className="mx-2">→</span>
                          <span className="font-semibold text-blue-700 capitalize">{log.toStatus}</span>
                          <span className="ml-3 text-xs text-gray-400">
                            by {log.changedBy} on {new Date(log.changedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">No status changes yet</p>
                  )}
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="mt-6 pt-4 border-t">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-600 border-b">
                        <th className="text-left py-2">Product</th>
                        <th className="text-right py-2">Qty</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">
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
            </Card>
          )
        })
      ) : (
          <Card className="p-6 text-center text-gray-600">
            <p>No orders found</p>
          </Card>
        )}
      </div>
    </div>
  )
}
