'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart,
  Menu,
  X,
  ShoppingBag,
  Info,
  Mail,
  Clock,
  LayoutDashboard,
  Package,
  Shield,
  Tag,
  ListFilter,
  Users,
  Lock,
  Truck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'
import NotificationCenter from '@/components/admin/notification-center'

interface User {
  id: string
  email: string
  role: 'user' | 'admin' | 'moderator' | 'super_admin' | 'owner'
  name?: string
}

export default function Navbar() {
  const { itemCount } = useCart()
  const pathname = usePathname()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const isAdminRoute = pathname.startsWith('/admin')

  const syncAuth = useCallback(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setIsLoggedIn(true)
      try {
        setUser(JSON.parse(userData))
      } catch (e) {
        setUser(null)
      }
    } else {
      setIsLoggedIn(false)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const scrollHandler = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', scrollHandler)
    syncAuth()
    window.addEventListener('storage', syncAuth)
    
    return () => {
      window.removeEventListener('scroll', scrollHandler)
      window.removeEventListener('storage', syncAuth)
    }
  }, [syncAuth])

  // Simplified Scroll Lock
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('no-scroll')
      document.documentElement.classList.add('no-scroll')
    } else {
      document.body.classList.remove('no-scroll')
      document.documentElement.classList.remove('no-scroll')
    }
    return () => {
      document.body.classList.remove('no-scroll')
      document.documentElement.classList.remove('no-scroll')
    }
  }, [isMobileMenuOpen])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.clear()
    syncAuth()
    setIsMobileMenuOpen(false)
    router.push('/auth/login')
  }

  const userRole = user?.role || 'user'
  const isOwner = userRole === 'owner'
  const isSuperAdmin = userRole === 'super_admin' || isOwner
  const isAdmin = userRole === 'admin' || isSuperAdmin
  const isModerator = userRole === 'moderator' || isAdmin

  const adminLinks = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, isSpecial: false },
    { label: 'Orders', href: '/admin/orders', icon: <Package className="w-4 h-4" />, hide: !isModerator, isSpecial: false },
    { label: 'Approvals', href: '/admin/approvals', icon: <Shield className="w-4 h-4" />, hide: !isSuperAdmin, isSpecial: false },
    { label: 'Historical Logs', href: '/admin/approvals/logs', icon: <Clock className="w-4 h-4" />, hide: !isSuperAdmin, isSpecial: false },
    { label: 'Contact Inquiries', href: '/admin/contacts', icon: <Mail className="w-4 h-4" />, hide: !isAdmin, isSpecial: false },
    { label: 'Inventory', href: '/admin/inventory', icon: <ShoppingCart className="w-4 h-4" />, hide: !isAdmin, isSpecial: false },
    { label: 'Products', href: '/admin/products', icon: <Tag className="w-4 h-4" />, hide: !isAdmin, isSpecial: false },
    { label: 'Categories', href: '/admin/categories', icon: <ListFilter className="w-4 h-4" />, hide: !isAdmin, isSpecial: false },
    { label: 'Manage Users', href: '/admin/users', icon: <Users className="w-4 h-4" />, hide: !isSuperAdmin, isSpecial: false },
    { label: 'Promo Codes', href: '/admin/promo-codes', icon: <Tag className="w-4 h-4" />, hide: !isSuperAdmin, isSpecial: false },
    { label: 'Action Logs', href: '/admin/activities', icon: <Shield className="w-4 h-4" />, hide: !isSuperAdmin, isSpecial: false },
    { label: 'Profile & Security', href: '/admin/profile', icon: <Lock className="w-4 h-4" />, isSpecial: false },
    { label: 'Back to Site', href: '/', icon: <ShoppingBag className="w-4 h-4" />, isSpecial: true }
  ]

  const userLinks = [
    { label: 'Shop', href: '/shop', icon: <ShoppingBag className="w-4 h-4" />, isSpecial: false },
    { label: 'Cart', href: '/shop/cart', icon: <ShoppingCart className="w-4 h-4" />, isSpecial: false },
    { label: 'Track Order', href: '/shop/track', icon: <Truck className="w-4 h-4" />, hide: isLoggedIn, isSpecial: false },
    { label: 'Orders', href: '/orders', icon: <Clock className="w-4 h-4" />, hide: !isLoggedIn, isSpecial: false },
    { label: 'About', href: '/about', icon: <Info className="w-4 h-4" />, isSpecial: false },
    { label: 'Contact', href: '/contact', icon: <Mail className="w-4 h-4" />, isSpecial: false }
  ]

  const currentLinks = isAdminRoute ? adminLinks : userLinks

  if (isAdminRoute) return null;

  return (
    <>
      <nav className={`
        fixed top-0 left-0 right-0 z-[200] transition-all duration-300
        ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' : 'bg-white py-2'}
        border-b border-gray-100
      `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-16">

          {/* Mobile Header Branding & Controls */}
          <div className="flex items-center lg:hidden w-full gap-4">
            <div className="shrink-0">
              <Link href="/" className="flex flex-col">
                <h3 className="text-[18px] font-black text-red-600 uppercase tracking-tighter italic leading-none">Parle</h3>
                <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest leading-none mt-1">Bangladesh</span>
              </Link>
            </div>

            <div className="flex-1 flex justify-center">
              <Link href="/">
                <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {isAdminRoute ? (
                <NotificationCenter />
              ) : (
                <Link href="/shop/cart" className="relative p-2 text-gray-700 hover:text-red-600 transition-colors">
                  <ShoppingCart className="w-6 h-6" />
                  {itemCount > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-gray-900 border-2 border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition-all shadow-sm"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* 🐅 Desktop Navigation (Restored to Original production layout) */}
          <div className="hidden lg:flex items-center justify-between w-full h-full relative">
            {/* Left: Brand Identity */}
            <Link href="/" className="flex items-center gap-10 group shrink-0">
              <div className="flex flex-col -space-y-1">
                <span className="text-4xl font-black text-red-600 tracking-tighter uppercase italic leading-none">Parle</span>
                <span className="text-xs font-bold text-gray-900 uppercase tracking-[0.25em] leading-none mt-1">Bangladesh</span>
              </div>
              <img src="/logo.png" alt="Logo" className="h-11 w-auto transition-transform group-hover:scale-105 duration-300" />
            </Link>

            {/* Center: Essential Links (Absolutely Centered) - Hidden on Admin Routes */}
            {!isAdminRoute && (
              <div className="flex items-center space-x-12 absolute left-1/2 -translate-x-1/2">
                <Link href="/shop" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all font-sans">
                  <ShoppingBag className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> Shop
                </Link>
                <Link href="/shop/cart" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] relative hover:text-red-600 transition-all font-sans">
                  <ShoppingCart className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> Cart
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-5 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow-lg shadow-red-200">
                      {itemCount}
                    </span>
                  )}
                </Link>
                {!isLoggedIn ? (
                  <Link href="/shop/track" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all font-sans">
                    <Truck className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> Track
                  </Link>
                ) : (
                  <Link href="/orders" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all font-sans">
                    <Clock className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> Orders
                  </Link>
                )}
                <Link href="/about" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all font-sans">
                  <Info className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> About
                </Link>
                <Link href="/contact" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all font-sans">
                  <Mail className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> Contact
                </Link>
              </div>
            )}

            {/* Right: Action Hub (Admin, Notifs, Auth) */}
            <div className="flex items-center gap-6 shrink-0">
              {isAdminRoute && isLoggedIn && pathname !== '/auth/login' ? (
                <NotificationCenter />
              ) : (
                isModerator && (
                  <Link href="/admin/dashboard">
                    <Button size="sm" className="bg-gray-900 text-white font-black uppercase text-[9px] tracking-widest h-10 px-4 rounded-xl border-2 border-gray-900 hover:bg-white hover:text-gray-900 transition-all">Admin Panel</Button>
                  </Link>
                )
              )}

              {!isLoggedIn ? (
                <div className="flex items-center gap-6">
                  <Link href={`/auth/login?callbackUrl=${pathname}`} className="text-[11px] font-black text-gray-900 uppercase tracking-widest hover:text-red-600 transition-colors font-sans">Login</Link>
                  <Link href="/auth/signup">
                    <Button size="sm" className="bg-red-600 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] px-6 h-11 rounded-xl shadow-xl shadow-red-100">Sign Up</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    {isModerator ? (
                      <Link href="/admin/profile" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[180px] font-sans hover:text-red-600 transition-colors">
                        {user?.email}
                      </Link>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[180px] font-sans">{user?.email}</span>
                    )}
                    <button onClick={handleLogout} className="text-[10px] font-black text-red-600 uppercase hover:underline transition-all font-sans leading-none mt-0.5">Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>

    <AnimatePresence>
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[10000] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-80 bg-white h-full shadow-2xl flex flex-col border-l border-gray-100"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-black text-gray-900 uppercase tracking-[0.3em]">
                {isAdminRoute ? 'Admin Engine' : 'Menu Navigation'}
              </span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-6 bg-white">
              {isAdminRoute ? (
                <>
                  {(isSuperAdmin || isOwner) && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-[0.2em] mb-3 ml-1 italic">Approval Center</p>
                      <div className="flex flex-col gap-2">
                        <Link href="/admin/approvals" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-red-50/50 rounded-2xl border border-red-100 group shadow-sm transition-all">
                          <Shield className="w-4 h-4 text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Pending Approvals</span>
                        </Link>
                        <Link href="/admin/approvals/logs" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                          <Clock className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Historical Logs</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1 italic">Daily Operations</p>
                    <div className="flex flex-col gap-2">
                      <Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                        <LayoutDashboard className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Dashboard</span>
                      </Link>
                      {isModerator && (
                        <Link href="/admin/orders" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                          <Package className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Order Management</span>
                        </Link>
                      )}
                      {isAdmin && (
                        <Link href="/admin/contacts" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                          <Mail className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Contact Inquiries</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1 italic">Catalogue</p>
                      <div className="flex flex-col gap-2">
                        <Link href="/admin/inventory" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                          <ShoppingCart className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Inventory Management</span>
                        </Link>
                        <Link href="/admin/products" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                          <Tag className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Products List</span>
                        </Link>
                        <Link href="/admin/categories" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                          <ListFilter className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Categories</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {isSuperAdmin && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1 italic">System Control</p>
                      <div className="flex flex-col gap-2">
                        <Link href="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                          <Users className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Manage Users</span>
                        </Link>
                        <Link href="/admin/promo-codes" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                          <Tag className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Promo Codes</span>
                        </Link>
                        <Link href="/admin/activities" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm transition-all">
                          <Shield className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">System Logs</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-5 bg-red-600 text-white rounded-2xl shadow-xl shadow-red-100/50 group active:scale-95 transition-all">
                      <ShoppingBag className="w-5 h-5 text-white" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em]">Back to Site</span>
                    </Link>
                  </div>
                </>
              ) : (
                currentLinks.map((item) => (
                  !item.hide && (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-4 p-5 rounded-2xl transition-all border group shadow-sm ${item.isSpecial ? 'bg-red-600 border-red-500 text-white shadow-red-100' : 'bg-gray-50 hover:bg-gray-100 border-gray-100'}`}
                    >
                      <div className={`${item.isSpecial ? 'text-white' : 'text-gray-400 group-hover:text-red-600'} transition-colors`}>
                        {item.icon}
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${item.isSpecial ? 'text-white' : 'text-gray-900'}`}>
                        {item.label}
                      </span>
                    </Link>
                  )
                ))
              )}

              <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                {isLoggedIn ? (
                  <div className="flex flex-col gap-3">
                    <div className="p-5 bg-gray-900 rounded-3xl border border-gray-800 shadow-2xl overflow-hidden relative group">
                      <div className="relative z-10">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 italic opacity-60">Connected Account</p>
                        <p className="text-xs font-black text-white truncate font-sans mb-4">{user?.name || user?.email}</p>

                        <div className="grid grid-cols-1 gap-2">
                          {isModerator && (
                            <Link href="/admin/profile" onClick={() => setIsMobileMenuOpen(false)}>
                              <Button className="w-full h-11 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-xl border border-white/10">
                                My Profile & Security
                              </Button>
                            </Link>
                          )}
                          {isModerator && !isAdminRoute && (
                            <Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                              <Button className="w-full h-11 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl border-none shadow-xl shadow-red-900/20">
                                Admin Panel
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-[60px] pointer-events-none" />
                    </div>
                    <Button onClick={handleLogout} variant="ghost" className="w-full text-red-600 font-black uppercase text-[10px] h-14 rounded-2xl bg-red-50 hover:bg-red-600 hover:text-white transition-all tracking-widest">Logout</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <Link href="/auth/signup" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-red-600 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest h-14 rounded-2xl shadow-xl shadow-red-100">Sign Up</Button>
                    </Link>
                    <Link href={`/auth/login?callbackUrl=${pathname}`} onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full bg-white text-gray-900 border-gray-200 font-black uppercase text-[11px] tracking-widest h-14 rounded-2xl shadow-sm">Login</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  )
}
