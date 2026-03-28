'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalUsers: number
  totalCategories: number
  recentOrders: any[]
}

export default function AdminDashboard() {
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
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="text-gray-600 text-sm font-medium">Total Products</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {stats?.totalProducts || 0}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-gray-600 text-sm font-medium">Total Orders</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {stats?.totalOrders || 0}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-gray-600 text-sm font-medium">Total Categories</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {stats?.totalCategories || 0}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-gray-600 text-sm font-medium">Admin Users</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {stats?.totalUsers || 0}
          </div>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Orders</h2>
        {stats?.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Order ID
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Customer
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {order.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.customerName}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      ৳{order.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No orders yet</p>
        )}
      </Card>
    </div>
  )
}
