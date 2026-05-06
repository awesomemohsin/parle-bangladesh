'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { BellRing } from 'lucide-react'
import { useRef } from 'react'

interface DashboardStats {
  totalProducts: number
  totalOrders: number
  todaysOrders: number
  orderStatuses: {
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
  }
  totalUsers: number
  totalCategories: number
  warehouse: {
    totalStock: number
    totalOnHold: number
    totalDelivered: number
    totalLost: number
    totalDamaged: number
  }
  recentOrders: any[]
}

export default function AdminDashboard() {
  const router = useRouter()
  const { logout } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Notification refs
  const lastProcessingCount = useRef<number | null>(null)
  const lastTotalCount = useRef<number | null>(null)
  const isFirstLoad = useRef(true)
  const [userRole, setUserRole] = useState('')

  const fetchStats = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else if (response.status === 401) {
        // Force logout if unauthorized
        logout()
        toast.error('Session expired. Please login again.')
      } else {
        const errData = await response.json()
        setError(errData.error || 'Failed to connect to server')
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setError('Connection failed. Please check your internet or retry.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStatsSilent = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        
        // Notification Logic
        const role = userRole || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').role : '')
        
        if (!isFirstLoad.current) {
            if (role === 'moderator') {
                const currentProc = data.orderStatuses?.processing || 0
                if (lastProcessingCount.current !== null && currentProc > lastProcessingCount.current) {
                    toast.success('New order assigned to your queue!', {
                        description: "An order has been moved to 'Processing' for your attention.",
                        icon: <BellRing className="w-4 h-4 text-emerald-500" />,
                        duration: 8000
                    })
                    try { new Audio('/sounds/notification.mp3').play().catch(() => {}) } catch(e) {}
                }
                lastProcessingCount.current = currentProc
            } else if (['admin', 'super_admin', 'owner'].includes(role)) {
                if (lastTotalCount.current !== null && data.totalOrders > lastTotalCount.current) {
                    toast.success('New order received!', {
                        description: `Total orders: ${data.totalOrders}`,
                        icon: <BellRing className="w-4 h-4 text-emerald-500" />,
                        duration: 8000
                    })
                    try { new Audio('/sounds/notification.mp3').play().catch(() => {}) } catch(e) {}
                }
                lastTotalCount.current = data.totalOrders
            }
        } else {
            lastProcessingCount.current = data.orderStatuses?.processing || 0
            lastTotalCount.current = data.totalOrders
            isFirstLoad.current = false
        }

        setStats(data)
      }
    } catch (error) {
      console.error('Background fetch failed:', error)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Set user role
    if (typeof window !== 'undefined') {
        const u = JSON.parse(localStorage.getItem('user') || '{}')
        setUserRole(u.role || '')
    }

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
        fetchStatsSilent()
    }, 30000)

    return () => clearInterval(interval)
  }, [router])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Establishing Secure Sync...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="p-4 bg-red-50 rounded-3xl text-red-600">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Sync Interrupted</h2>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">{error}</p>
        </div>
        <button
          onClick={fetchStats}
          className="bg-black hover:bg-red-600 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl shadow-gray-200"
        >
          Force Manual Sync
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Dashboard Overview</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Stats • Recent Activity</p>
        </div>
        <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 self-start md:self-auto">
            <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Real-time Sync Active (30s)
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-6 border-none shadow-sm bg-white rounded-xl">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Products</div>
          <div className="text-4xl font-black text-gray-900 tabular-nums">
            {stats?.totalProducts || 0}
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm bg-white rounded-xl">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Orders</div>
          <div className="text-4xl font-black text-gray-900 tabular-nums">
            {stats?.totalOrders || 0}
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm bg-white rounded-xl">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Categories</div>
          <div className="text-4xl font-black text-gray-900 tabular-nums">
            {stats?.totalCategories || 0}
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm bg-white rounded-xl">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Users</div>
          <div className="text-4xl font-black text-gray-900 tabular-nums">
            {stats?.totalUsers || 0}
          </div>
        </Card>
      </div>

      {/* Order Lifecycle Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight italic">Order Lifecycle</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="bg-white/80 p-6 rounded-xl border-none shadow-lg transform hover:scale-[1.02] transition-all">
            <div className="text-black-500 text-[10px] font-black uppercase tracking-widest mb-1">Today's Orders</div>
            <div className="text-4xl font-black tabular-nums">{stats?.todaysOrders || 0}</div>
          </Card>

          <Card className="p-6 bg-white rounded-xl border-none shadow-sm border-l-4 border-l-amber-500">
            <div className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Pending</div>
            <div className="text-4xl font-black text-gray-900 tabular-nums">{stats?.orderStatuses?.pending || 0}</div>
          </Card>

          <Card className="p-6 bg-white rounded-xl border-none shadow-sm border-l-4 border-l-blue-500">
            <div className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Processing</div>
            <div className="text-4xl font-black text-gray-900 tabular-nums">{stats?.orderStatuses?.processing || 0}</div>
          </Card>

          <Card className="p-6 bg-white rounded-xl border-none shadow-sm border-l-4 border-l-indigo-500">
            <div className="text-indigo-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Shipped</div>
            <div className="text-4xl font-black text-gray-900 tabular-nums">{stats?.orderStatuses?.shipped || 0}</div>
          </Card>

          <Card className="p-6 bg-white rounded-xl border-none shadow-sm border-l-4 border-l-emerald-500">
            <div className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Delivered</div>
            <div className="text-4xl font-black text-gray-900 tabular-nums">{stats?.orderStatuses?.delivered || 0}</div>
          </Card>

          <Card className="p-6 bg-white rounded-xl border-none shadow-sm border-l-4 border-l-red-500">
            <div className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Cancelled</div>
            <div className="text-4xl font-black text-gray-900 tabular-nums">{stats?.orderStatuses?.cancelled || 0}</div>
          </Card>
        </div>
      </div>

      {/* Warehouse Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight italic">Warehouse Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-slate-900 text-white rounded-xl border-none shadow-md">
            <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Units In Stock</div>
            <div className="text-4xl font-black tabular-nums">{stats?.warehouse?.totalStock || 0}</div>
          </Card>

          <Card className="p-6 bg-white rounded-xl border-none shadow-sm">
            <div className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1">On Hold/Pending</div>
            <div className="text-4xl font-black text-gray-900 tabular-nums">{stats?.warehouse?.totalOnHold || 0}</div>
          </Card>

          <Card className="p-6 bg-white rounded-xl border-none shadow-sm">
            <div className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-1">Lost Units</div>
            <div className="text-4xl font-black text-gray-900 tabular-nums">{stats?.warehouse?.totalLost || 0}</div>
          </Card>

          <Card className="p-6 bg-white rounded-xl border-none shadow-sm">
            <div className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-1">Damaged</div>
            <div className="text-4xl font-black text-gray-900 tabular-nums">{stats?.warehouse?.totalDamaged || 0}</div>
          </Card>
        </div>
      </div>

      {/* Recent Orders */}
      <Card className="p-6 rounded-xl border-none shadow-sm bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-tight italic">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">ID</th>
                <th className="px-4 py-3 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Customer</th>
                <th className="px-4 py-3 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Value</th>
                <th className="px-4 py-3 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-right font-black text-gray-400 text-[10px] uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats?.recentOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 font-black text-gray-900 uppercase italic">
                    #{order.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-4 font-bold text-gray-600">{order.customerName}</td>
                  <td className="px-4 py-4 font-black text-gray-900 tabular-nums text-lg italic">
                    ৳{order.total.toFixed(0)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${order.status === 'delivered' ? 'bg-green-50 text-green-600' :
                      'bg-amber-50 text-amber-600'
                      }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-gray-400 font-bold italic text-[10px]">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
            <div className="py-10 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">No recent activity logged</div>
          )}
        </div>
      </Card>
    </div>
  )
}
