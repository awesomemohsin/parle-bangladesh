'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import NotificationCenter from '@/components/admin/notification-center'

interface User {
  id: string
  email: string
  name?: string
  role: 'super_admin' | 'admin' | 'moderator' | 'owner'
}

export default function AdminSidebar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [pendingCount, setPendingCount] = useState<number>(0)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  useEffect(() => {
    if (user && (user.role === 'super_admin' || user.role === 'owner')) {
      fetchPendingCount()
      const interval = setInterval(fetchPendingCount, 30000) // Update every 30s
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchPendingCount = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/approvals?status=pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setPendingCount(data.requests?.length || 0)
      }
    } catch (e) {}
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/admin/login')
  }

  const isOwner = user?.role === 'owner'
  const isSuperAdmin = user?.role === 'super_admin' || isOwner
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const isModerator = user?.role === 'moderator' || isAdmin

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-2xl font-bold">Parle Admin</h2>
        <p className="text-sm text-gray-400 mt-1">Control Panel</p>
      </div>

      {/* User Info */}
      <div className="p-4 bg-gray-800 mx-4 mt-4 rounded-lg flex items-center gap-4">
        <NotificationCenter />
        <div className="flex-1 overflow-hidden">
          <p className="text-xs text-gray-400">Logged in as</p>
          <p className="font-semibold text-sm truncate">{user?.name || user?.email}</p>
          <p className="text-xs text-gray-400 mt-1 capitalize">
            {user?.role.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <Link href="/admin/dashboard">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
          >
            Dashboard
          </Button>
        </Link>

        {isAdmin && (
          <>
            <Link href="/admin/products">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              >
                Products
              </Button>
            </Link>

            <Link href="/admin/categories">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              >
                Categories
              </Button>
            </Link>
          </>
        )}

        {isModerator && (
          <Link href="/admin/orders">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Orders
            </Button>
          </Link>
        )}

        {isSuperAdmin && (
          <>
            <Link href="/admin/users">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              >
                Users
              </Button>
            </Link>

            <Link href="/admin/promo-codes">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              >
                Promo Codes
              </Button>
            </Link>

            <Link href="/admin/activities">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              >
                Activity Logs
              </Button>
            </Link>
          </>
        )}

        {(isSuperAdmin || isOwner) && (
          <div className="mt-8 pt-4 border-t border-gray-800">
            <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] mb-4 ml-4">Verification System</p>
            <div className="space-y-1">
              <Link href="/admin/approvals">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 relative group"
                >
                  Approvals
                  {pendingCount > 0 && (
                    <span className="absolute right-4 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-900/20 group-hover:bg-red-500">
                      {pendingCount}
                    </span>
                  )}
                </Button>
              </Link>

              <Link href="/admin/approvals/logs">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  Approval Logs
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full text-gray-300 border-gray-600 hover:bg-red-600 hover:text-white hover:border-red-600"
        >
          Logout
        </Button>
      </div>
    </div>
  )
}
