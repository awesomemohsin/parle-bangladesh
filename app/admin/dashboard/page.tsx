'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'

interface DashboardStats {
  totalProducts: number
  totalOrders: number
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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Dashboard Overview</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Stats • Recent Activity</p>
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
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Orders</div>
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
                    #{order.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-4 py-4 font-bold text-gray-600">{order.customerName}</td>
                  <td className="px-4 py-4 font-black text-gray-900 tabular-nums text-lg italic">
                    ৳{order.total.toFixed(0)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                      order.status === 'delivered' ? 'bg-green-50 text-green-600' :
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
