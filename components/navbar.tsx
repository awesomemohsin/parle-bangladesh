'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'

export default function Navbar() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<any>(null)
  const { itemCount } = useCart()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setIsLoggedIn(true)
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    window.location.href = '/'
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-blue-600">Parle</div>
            <span className="text-sm text-gray-600">Bangladesh</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link href="/shop" className="text-gray-700 hover:text-blue-600 font-medium">
              Shop
            </Link>
            
            {isLoggedIn && user?.role === 'customer' && (
              <Link href="/orders" className="text-gray-700 hover:text-blue-600 font-medium">
                Orders
              </Link>
            )}

            <Link href="/shop/cart" className="text-gray-700 hover:text-blue-600 font-medium relative">
              Cart
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                  {itemCount}
                </span>
              )}
            </Link>

            {isLoggedIn && user?.role?.includes('admin') && (
              <Link href="/admin/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                Admin
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <span className="text-sm text-gray-700">{user?.email}</span>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/auth/login">
                <Button size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
