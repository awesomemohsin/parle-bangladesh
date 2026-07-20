'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Minus,
  Trash2,
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
import { Button } from '@/components/ui/button'
import { useCart, getItemKey } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'
const NotificationCenter = dynamic(() => import('@/components/admin/notification-center'), { ssr: false })
import Image from 'next/image'

export default function Navbar() {
  const { 
    items, 
    subtotal, 
    total, 
    discountAmount, 
    circleDiscount, 
    itemCount, 
    updateQuantity, 
    removeItem, 
    cart, 
    applyCircleDiscount, 
    removeCircleDiscount,
    circleCampaignActive,
    circleDiscountPercent,
    partnerUrl
  } = useCart()
  const { user, isAuthenticated: isLoggedIn, logout: handleLogout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)
  const [isCartClosing, setIsCartClosing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tickerOffers, setTickerOffers] = useState<any[]>([])

  const [showCircleSection, setShowCircleSection] = useState(false)
  const [circlePhone, setCirclePhone] = useState('')
  const [circleBillingId, setCircleBillingId] = useState('')
  const [isVerifyingCircle, setIsVerifyingCircle] = useState(false)
  const [circleError, setCircleError] = useState('')
  const [circleSuccess, setCircleSuccess] = useState('')
  const [shakingFields, setShakingFields] = useState<Record<string, boolean>>({})

  const handleVerifyCircleNetwork = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    const shakeMap: Record<string, boolean> = {}
    if (!circlePhone.trim()) shakeMap.circlePhone = true
    if (!circleBillingId.trim()) shakeMap.circleBillingId = true

    if (Object.keys(shakeMap).length > 0) {
      setShakingFields(shakeMap)
      setCircleError('Please enter Phone Number & Customer ID')
      setTimeout(() => setShakingFields({}), 500)
      return
    }

    setCircleError('')
    setCircleSuccess('')
    setIsVerifyingCircle(true)

    try {
      const res = await fetch('/api/discounts/verify-circle-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactNumber: circlePhone.trim(),
          billingId: circleBillingId.trim()
        })
      })

      const data = await res.json()
      if (res.ok) {
        applyCircleDiscount(data.client.id, data.client.contact_number)
        setCircleSuccess('Circle 10% Discount Applied!')
        setCirclePhone('')
        setCircleBillingId('')
        setShowCircleSection(false)
      } else {
        setCircleError(data.error || 'Verification failed. Please check inputs.')
        setShakingFields({ circlePhone: true, circleBillingId: true })
        setTimeout(() => setShakingFields({}), 500)
      }
    } catch (err) {
      setCircleError('Unable to reach validation server.')
      setShakingFields({ circlePhone: true, circleBillingId: true })
      setTimeout(() => setShakingFields({}), 500)
    } finally {
      setIsVerifyingCircle(false)
    }
  }

  const handleRemoveCircleDiscount = () => {
    removeCircleDiscount()
    setCircleSuccess('')
    setCircleError('')
  }

  useEffect(() => {
    if (!cart?.circleNetworkDiscount) {
      setCircleSuccess('')
    }
  }, [cart?.circleNetworkDiscount])

  const closeCartDrawer = () => {
    setIsCartClosing(true)
    setTimeout(() => {
      setIsCartDrawerOpen(false)
      setIsCartClosing(false)
    }, 300)
  }

  useEffect(() => {
    setIsCartDrawerOpen(false)
    setIsCartClosing(false)
  }, [pathname])

  const isAdminRoute = pathname.startsWith('/admin')

  useEffect(() => {
    setMounted(true)
    const scrollHandler = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', scrollHandler)
    return () => {
      window.removeEventListener('scroll', scrollHandler)
    }
  }, [])

  useEffect(() => {
    if (isAdminRoute) return;
    const fetchTickerOffers = async () => {
      try {
        const res = await fetch('/api/offers', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setTickerOffers(data)
        }
      } catch (err) {
        console.error('Failed to load ticker offers', err)
      }
    }
    fetchTickerOffers()
  }, [isAdminRoute])

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

  const userRole = user?.role || 'customer'
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
    { label: 'Manage Offers', href: '/admin/offers', icon: <Tag className="w-4 h-4" />, hide: !isAdmin, isSpecial: false },
    { label: 'Action Logs', href: '/admin/activities', icon: <Shield className="w-4 h-4" />, hide: !isSuperAdmin, isSpecial: false },
    { label: 'Profile & Security', href: '/admin/profile', icon: <Lock className="w-4 h-4" />, isSpecial: false },
    { label: 'Back to Site', href: '/', icon: <ShoppingBag className="w-4 h-4" />, isSpecial: true }
  ]

  const userLinks = [
    { label: 'Shop', href: '/shop', icon: <ShoppingBag className="w-4 h-4" />, isSpecial: false },
    { label: 'Cart', href: '/shop/cart', icon: <ShoppingCart className="w-4 h-4" />, isSpecial: false },
    { label: 'Track Order', href: '/shop/track', icon: <Truck className="w-4 h-4" />, hide: isLoggedIn, isSpecial: false },
    { label: 'Orders', href: '/orders', icon: <Clock className="w-4 h-4" />, hide: !isLoggedIn, isSpecial: false },
    { label: 'Offers', href: '/offers', icon: <Tag className="w-4 h-4" />, isSpecial: false }
  ]

  const renderTickerContent = (isDuplicate: boolean = false) => {
    const items: React.ReactNode[] = [];
    if (tickerOffers.length > 0) {
      // Repeat offers list to ensure it covers screens and loops seamlessly
      const repeatCount = Math.max(3, Math.ceil(12 / tickerOffers.length));
      for (let r = 0; r < repeatCount; r++) {
        tickerOffers.forEach((offer, idx) => {
          const content = (
            <>
              <span className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded text-[8px] font-black tracking-normal shrink-0">
                🔥 HOT DEAL
              </span>
              <span className="text-red-700 font-black tracking-wider uppercase text-[11px] sm:text-[12px] shrink-0">
                {offer.title}
              </span>
              <span className="text-amber-500 text-[10px] animate-pulse">★</span>
              <span className="text-gray-700 normal-case tracking-normal font-semibold text-[10px] sm:text-[11px]">
                {offer.description}
              </span>
            </>
          );

          if (isDuplicate) {
            items.push(
              <div
                key={`${offer._id || idx}-${r}`}
                className="flex items-center gap-3 select-none pointer-events-none"
              >
                {content}
              </div>
            );
          } else {
            items.push(
              <Link
                key={`${offer._id || idx}-${r}`}
                href={`/offers/${offer.slug}`}
                className="flex items-center gap-3 hover:underline cursor-pointer"
              >
                {content}
              </Link>
            );
          }
        });
      }
    } else {
      // Repeat welcome messages to fill the screen width
      for (let r = 0; r < 8; r++) {
        const content = (
          <>
            <span className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-0.5 rounded text-[8px] font-black tracking-normal shrink-0">
              ✨ WELCOME
            </span>
            <span className="text-emerald-700 font-black tracking-wider uppercase text-[11px] sm:text-[12px] shrink-0">
              Official Parle Bangladesh Shop
            </span>
            <span className="text-amber-500 text-[10px] animate-pulse">★</span>
            <span className="text-gray-700 normal-case tracking-normal font-semibold text-[10px] sm:text-[11px]">
              Bite into Pure Joy - Order online for home delivery!
            </span>
          </>
        );

        if (isDuplicate) {
          items.push(
            <div
              key={`welcome-${r}`}
              className="flex items-center gap-3 select-none pointer-events-none"
            >
              {content}
            </div>
          );
        } else {
          items.push(
            <Link
              key={`welcome-${r}`}
              href="/shop"
              className="flex items-center gap-3 hover:underline cursor-pointer"
            >
              {content}
            </Link>
          );
        }
      }
    }
    return items;
  };

  const currentLinks = isAdminRoute ? adminLinks : userLinks

  if (isAdminRoute) return null;

  return (
    <>
      <nav className={`
        fixed top-0 left-0 right-0 z-[200] transition-all duration-300
        ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white'}
        border-b border-gray-100
      `}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${isScrolled ? 'py-1' : 'py-2'}`}>
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
              <Link href="/" aria-label="Parle Bangladesh Home">
                <Image src="/logo.png" alt="Parle Bangladesh Logo" width={160} height={40} priority style={{ width: 'auto' }} className="h-10 object-contain" />
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {isAdminRoute ? (
                <NotificationCenter />
              ) : (
                <button 
                  onClick={() => setIsCartDrawerOpen(true)}
                  className="relative p-3 text-gray-700 hover:text-red-600 transition-colors" 
                  aria-label="View Shopping Cart"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {mounted && itemCount > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      {itemCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2.5 text-gray-900 border-2 border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition-all shadow-sm"
                aria-label="Open mobile menu"
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
              <Image src="/logo.png" alt="Logo" width={176} height={44} priority style={{ width: 'auto' }} className="h-11 object-contain transition-transform group-hover:scale-105 duration-300" />
            </Link>

            {/* Center: Essential Links (Absolutely Centered) - Hidden on Admin Routes */}
            {!isAdminRoute && (
              <div className="flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
                <Link href="/shop" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all font-sans">
                  <ShoppingBag className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> Shop
                </Link>
                <button 
                  onClick={() => setIsCartDrawerOpen(true)}
                  className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] relative hover:text-red-600 transition-all font-sans"
                >
                  <ShoppingCart className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> Cart
                  {mounted && itemCount > 0 && (
                    <span className="absolute -top-1 -right-5 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow-lg shadow-red-200">
                      {itemCount}
                    </span>
                  )}
                </button>
                {!isLoggedIn ? (
                  <Link href="/shop/track" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all font-sans">
                    <Truck className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> Track
                  </Link>
                ) : (
                  <Link href="/orders" className="group flex items-center gap-2 text-[13px] font-black text-gray-900 uppercase tracking-[0.15em] hover:text-red-600 transition-all font-sans">
                    <Clock className="w-4 h-4 text-gray-300 group-hover:text-red-600 transition-colors" /> Orders
                  </Link>
                )}
                <Link href="/offers" className="group flex items-center gap-2 text-[12px] font-black text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white px-4 py-2 rounded-full border border-amber-200 uppercase tracking-[0.15em] transition-all duration-300 font-sans shadow-sm shadow-amber-100">
                  <Tag className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" /> Offers
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                  </span>
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
                    <Button size="sm" className="bg-gray-900 text-white font-black uppercase text-[9px] tracking-widest h-10 px-4 rounded-xl border-2 border-gray-900 hover:bg-white hover:text-gray-900 transition-all">
                      Admin Panel
                    </Button>
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
                      <Link href="/admin/profile" className="text-[10px] font-black text-gray-900 uppercase tracking-widest truncate max-w-[180px] font-sans hover:text-red-600 transition-colors">
                        {user?.name}
                      </Link>
                    ) : (
                      <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest truncate max-w-[180px] font-sans">{user?.name}</span>
                    )}
                    {user?.mobile && (
                      <span className="text-[9px] font-bold text-gray-500 font-sans mt-0.5">{user.mobile}</span>
                    )}
                    <button onClick={handleLogout} className="text-[10px] font-black text-red-600 uppercase hover:underline transition-all font-sans leading-none mt-1">Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Slim News/Offer Ticker (Scrolling Marquee) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tickerMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-ticker-marquee {
          display: inline-flex;
          animation: tickerMarquee 120s linear infinite;
        }
        .marquee-container:hover .animate-ticker-marquee {
          animation-play-state: paused;
        }
      `}} />
      
      <div 
        className="marquee-container block border-t border-gray-100 bg-white py-1 z-[190] relative overflow-hidden select-none hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex overflow-hidden whitespace-nowrap">
          <div className="animate-ticker-marquee text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-16 pr-16 shrink-0">
            {renderTickerContent()}
          </div>
          <div className="animate-ticker-marquee text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-16 pr-16 shrink-0" aria-hidden="true">
            {renderTickerContent(true)}
          </div>
        </div>
      </div>
    </nav>

    {/* Mobile Menu Sidebar */}
    <div className={`lg:hidden fixed inset-0 z-[10000] flex justify-end transition-all duration-300 ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
      {/* Backdrop */}
      <div 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Sidebar Panel */}
      <div
        className={`relative w-80 bg-white h-full shadow-2xl flex flex-col border-l border-gray-100 transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-black text-gray-900 uppercase tracking-[0.3em]">
            {isAdminRoute ? 'Admin Engine' : 'Menu Navigation'}
          </span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors" aria-label="Close menu">
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
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 ml-1 italic">Catalogue</p>
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
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 ml-1 italic">System Control</p>
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
            currentLinks.map((item) => {
              const isOffers = item.href === '/offers';
              return (
                !item.hide && (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      if (item.href === '/shop/cart') {
                        e.preventDefault();
                        setIsMobileMenuOpen(false);
                        setIsCartDrawerOpen(true);
                      } else {
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    className={`flex items-center justify-between p-5 rounded-2xl transition-all border group shadow-sm ${
                      item.isSpecial 
                        ? 'bg-red-600 border-red-500 text-white shadow-red-100' 
                        : isOffers
                        ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-amber-50/50'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${item.isSpecial ? 'text-white' : isOffers ? 'text-amber-600' : 'text-gray-400 group-hover:text-red-600'} transition-colors`}>
                        {item.icon}
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${item.isSpecial ? 'text-white' : isOffers ? 'text-amber-800' : 'text-gray-900'}`}>
                        {item.label}
                      </span>
                    </div>
                    {isOffers && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                      </span>
                    )}
                  </Link>
                )
              );
            })
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
            {isLoggedIn ? (
              <div className="flex flex-col gap-3">
                <div className="p-5 bg-gray-900 rounded-3xl border border-gray-800 shadow-2xl overflow-hidden relative group">
                  <div className="relative z-10">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 italic opacity-60">Connected Account</p>
                    <p className="text-xs font-black text-white truncate font-sans mb-0.5">{user?.name}</p>
                    {user?.mobile && (
                      <p className="text-[10px] font-medium text-gray-400 font-sans mb-4">{user.mobile}</p>
                    )}

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
      </div>
    </div>
      
    {/* Slide-out Cart Drawer Overlay */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-[10000] flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={closeCartDrawer}
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
              isCartClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'
            }`}
          />

          {/* Drawer Panel */}
          <div className={`relative w-[85vw] sm:w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-gray-100 transition-transform duration-300 ease-out z-10 ${
            isCartClosing ? 'translate-x-full' : 'translate-x-0 animate-in slide-in-from-right duration-300'
          }`}>
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-red-600 animate-pulse" />
                <span className="text-xs font-black text-gray-900 uppercase tracking-[0.3em]">
                  Your Shopping Cart
                </span>
              </div>
              <button 
                onClick={closeCartDrawer}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors" 
                aria-label="Close cart drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <ShoppingCart className="w-16 h-16 text-slate-100 animate-bounce" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Your cart is empty!
                  </p>
                  <Button 
                    onClick={() => { setIsCartDrawerOpen(false); router.push('/shop'); }}
                    className="mt-2 bg-red-600 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest px-6 h-10 rounded-xl"
                  >
                    Start Shopping
                  </Button>
                </div>
              ) : (
                items.map((item, idx) => {
                  const itemKey = getItemKey(item);
                  return (
                    <div key={idx} className="flex gap-4 p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all duration-200">
                      {/* Product Thumbnail */}
                      <div className="relative w-16 h-16 bg-white border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                        {item.image ? (
                          <Image 
                            src={item.image} 
                            alt={item.productName} 
                            fill 
                            sizes="64px"
                            className="object-contain p-1"
                          />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-gray-300" />
                        )}
                      </div>

                      {/* Product Details & Actions */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-black text-gray-900 leading-tight line-clamp-1">
                              {item.productName}
                            </h4>
                            <button 
                              onClick={() => removeItem(itemKey)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                            {item.weight || 'Std Unit'} • {item.flavor || 'Original'}
                          </p>
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          {/* Quantity Selector */}
                          <div className="flex items-center border border-slate-200/80 bg-white rounded-lg overflow-hidden h-7 shrink-0">
                            <button
                              onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                              className="px-2 text-gray-400 hover:text-red-600 hover:bg-slate-50 transition-colors h-full flex items-center justify-center"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 font-mono font-black text-[10px] text-gray-900 border-x border-slate-100 min-w-8 text-center select-none">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                              className="px-2 text-gray-400 hover:text-emerald-600 hover:bg-slate-50 transition-colors h-full flex items-center justify-center"
                              title="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Price */}
                          <span className="font-mono font-black text-xs text-gray-900">
                            ৳{(item.price * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Summary & Checkout Footer */}
            {items.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-slate-50/50 space-y-4">
                {/* Circle Network Campaign Feature */}
                {circleCampaignActive !== false && (
                  cart?.circleNetworkDiscount ? (
                    <div className="bg-[#FDBC1F]/10 border border-[#FDBC1F]/30 p-3 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-[#FDBC1F]/20 flex items-center justify-center shrink-0">
                          <Image src="/circle-logo-en.svg" alt="Circle" width={28} height={28} className="h-6 w-auto object-contain" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FDBC1F] animate-pulse shrink-0" />
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-wider truncate">
                              Circle Network {circleDiscountPercent || 10}% Off Applied
                            </p>
                          </div>
                          <p className="text-[9px] font-mono font-bold text-[#FDBC1F] truncate">
                            ID: {cart.circleNetworkDiscount.id} | Phone: {cart.circleNetworkDiscount.number}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCircleDiscount}
                        className="text-[9px] font-black text-red-600 hover:text-red-800 bg-white hover:bg-red-50 border border-red-200 px-2 py-1 rounded-lg transition-colors shrink-0 uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-[#FDBC1F]/15 to-yellow-50/30 border border-[#FDBC1F]/30 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Image src="/circle-logo-en.svg" alt="Circle Network" width={38} height={38} className="h-8 w-auto object-contain shrink-0" />
                          <div>
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-wider leading-tight">
                              Circle Network Client?
                            </p>
                            <p className="text-[9px] font-bold text-[#FDBC1F] leading-tight">
                              Get Flat {circleDiscountPercent || 10}% Off on your order
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCircleSection(!showCircleSection)}
                          className="text-[9px] font-black uppercase tracking-wider text-gray-950 bg-[#FDBC1F] hover:bg-[#e5a91a] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-xs"
                        >
                          {showCircleSection ? 'Close' : 'Apply Discount'}
                        </button>
                      </div>

                      {showCircleSection && (
                        <form onSubmit={handleVerifyCircleNetwork} className="pt-2 border-t border-[#FDBC1F]/30 space-y-2">
                          <p className="text-[8px] font-bold text-gray-700 uppercase tracking-widest">
                            Enter registered Circle details:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className={shakingFields.circlePhone ? 'animate-shake' : ''}>
                              <input
                                type="text"
                                placeholder="Phone Number"
                                value={circlePhone}
                                onChange={(e) => setCirclePhone(e.target.value)}
                                className={`w-full bg-white border ${
                                  shakingFields.circlePhone ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 focus:border-[#FDBC1F]'
                                } rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none transition-all`}
                              />
                            </div>
                            <div className={shakingFields.circleBillingId ? 'animate-shake' : ''}>
                              <input
                                type="text"
                                placeholder="Customer ID"
                                value={circleBillingId}
                                onChange={(e) => setCircleBillingId(e.target.value)}
                                className={`w-full bg-white border ${
                                  shakingFields.circleBillingId ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 focus:border-[#FDBC1F]'
                                } rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none transition-all`}
                              />
                            </div>
                          </div>

                          {circleError && (
                            <p className="text-[8px] font-black text-red-600 uppercase tracking-wider">{circleError}</p>
                          )}
                          {circleSuccess && (
                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-wider">{circleSuccess}</p>
                          )}

                          <button
                            type="submit"
                            disabled={isVerifyingCircle}
                            className="w-full bg-[#FDBC1F] hover:bg-[#e5a91a] text-gray-950 font-black text-[9px] uppercase tracking-widest py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                          >
                            {isVerifyingCircle ? (
                              <span className="w-3 h-3 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              `Verify & Apply ${circleDiscountPercent || 10}% Off`
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  )
                )}

                <div className="space-y-1.5 text-xs text-gray-600 font-bold uppercase tracking-wide">
                  <div className="flex justify-between items-center">
                    <span>Subtotal</span>
                    <span className="font-mono font-black text-gray-900">৳{subtotal.toFixed(0)}</span>
                  </div>
                  {circleDiscount !== undefined && circleDiscount > 0 && cart?.circleNetworkDiscount && (
                    <div className="flex justify-between items-center text-[#FDBC1F]">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FDBC1F]" />
                        Circle Discount ({circleDiscountPercent || 10}%)
                      </span>
                      <span className="font-mono font-black">- ৳{circleDiscount.toFixed(0)}</span>
                    </div>
                  )}
                  {((discountAmount || 0) - (cart?.circleNetworkDiscount ? (circleDiscount || 0) : 0)) > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span>Promo / Campaign Discount</span>
                      <span className="font-mono font-black">- ৳{((discountAmount || 0) - (cart?.circleNetworkDiscount ? (circleDiscount || 0) : 0)).toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-1">
                    <span className="text-gray-900 font-black tracking-widest text-[10px] uppercase">Grand Total</span>
                    <span className="font-mono font-black text-red-600 text-sm">৳{total.toFixed(0)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button 
                    variant="outline"
                    onClick={() => { setIsCartDrawerOpen(false); router.push('/shop/cart'); }}
                    className="w-full h-11 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-black text-[9px] uppercase tracking-widest transition-all"
                  >
                    View Cart
                  </Button>
                  <Button 
                    onClick={() => { setIsCartDrawerOpen(false); router.push('/shop/checkout'); }}
                    className="w-full h-11 rounded-xl bg-red-600 hover:bg-black text-white font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-red-100"
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </>
  )
}
