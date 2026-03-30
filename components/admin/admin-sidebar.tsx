'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'moderator'
}

export default function AdminSidebar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/admin/login')
  }

  const isSuperAdmin = user?.role === 'super_admin'
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
      <div className="p-4 bg-gray-800 mx-4 mt-4 rounded-lg">
        <p className="text-xs text-gray-400">Logged in as</p>
        <p className="font-semibold text-sm truncate">{user?.email}</p>
        <p className="text-xs text-gray-400 mt-1 capitalize">
          {user?.role.replace('_', ' ')}
        </p>
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
