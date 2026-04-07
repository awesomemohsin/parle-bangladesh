'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'
import { motion } from 'framer-motion'
import { ShoppingBag, ShoppingCart, Clock } from 'lucide-react'

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
    sessionStorage.clear()
    setIsLoggedIn(false)
    window.location.href = '/'
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 lg:gap-10 flex-shrink-0 group">
            <div className="flex flex-col -space-y-1">
              <span className="text-3xl lg:text-4xl font-black text-red-600 tracking-tighter uppercase italic leading-none">Parle</span>
              <span className="text-[11px] lg:text-xs font-bold text-gray-900 uppercase tracking-[0.25em] leading-none mt-1">Bangladesh</span>
            </div>
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-14 lg:h-16 w-auto object-contain brightness-100 transition-transform group-hover:scale-105 duration-300" 
            />
          </Link>

          {/* Navigation Links - Centered (Serial: Shop, Cart, Orders) */}
          <div className="hidden md:flex items-center space-x-12 absolute left-1/2 -translate-x-1/2">
            <Link href="/shop" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all">
              <ShoppingBag className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" />
              Shop
            </Link>
            
            <Link href="/shop/cart" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] relative hover:text-red-600 transition-all">
              <ShoppingCart className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" />
              Cart
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  className="absolute -top-3 -right-5 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow-lg shadow-red-200"
                >
                  {itemCount}
                </motion.span>
              )}
            </Link>

            {isLoggedIn && (
              <Link href="/orders" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all">
                <Clock className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" />
                Orders
              </Link>
            )}

            <Link href="/about" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all">
              About
            </Link>

            <Link href="/contact" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all">
              Contact
            </Link>
          </div>

          {/* User Menu - Right Profile Hub */}
          <div className="flex items-center space-x-6">
            {isLoggedIn ? (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{user?.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-[11px] font-black text-red-600 uppercase tracking-widest hover:underline transition-all"
                  >
                    Logout
                  </button>
                </div>
                {user?.role?.includes('admin') && (
                  <Link href="/admin/dashboard">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-xl shadow-gray-100 active:scale-95">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Admin Dashboard
                    </span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-6">
                 <Link href="/auth/login" className="text-[11px] font-black text-gray-900 uppercase tracking-widest hover:text-red-600 transition-colors">
                    Login
                 </Link>
                 <Link href="/auth/signup">
                    <Button size="sm" className="bg-red-600 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] px-6 h-11 rounded-xl transition-all active:scale-95 shadow-xl shadow-red-100">
                      Sign Up
                    </Button>
                 </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
