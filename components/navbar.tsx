'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'
import { motion } from 'framer-motion'

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
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 flex-shrink-0 group">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-18 w-auto object-contain brightness-100 transition-transform group-hover:scale-105 duration-300" 
            />
            <div className="flex flex-col -space-y-1">
              <span className="text-2xl font-black text-red-600 tracking-tighter uppercase italic leading-none">Parle</span>
              <span className="text-[11px] font-bold text-gray-900 uppercase tracking-[0.25em] leading-none">Bangladesh</span>
            </div>
          </Link>

          {/* Navigation Links - Centered */}
          <div className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
            <Link href="/shop" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
              Shop
            </Link>
            
            {isLoggedIn && user?.role === 'customer' && (
              <Link href="/orders" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                Orders
              </Link>
            )}

            <Link href="/shop/cart" className="text-gray-700 hover:text-red-600 font-medium relative group transition-colors">
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cart
              </span>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  className="absolute -top-2 -right-3 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 shadow-sm"
                >
                  {itemCount}
                </motion.span>
              )}
            </Link>

            {isLoggedIn && user?.role?.includes('admin') && (
              <>
                <Link href="/admin/dashboard" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                  Admin
                </Link>
                <Link href="/admin/orders" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                  Orders
                </Link>
              </>
            )}
          </div>

          {/* User Menu - Right */}
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
