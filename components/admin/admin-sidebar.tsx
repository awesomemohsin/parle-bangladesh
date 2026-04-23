'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface User {
  id: string
  email: string
  name?: string
  role: 'super_admin' | 'admin' | 'moderator' | 'owner'
}

export default function AdminSidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [counts, setCounts] = useState({ pendingOrders: 0, processingOrders: 0, pendingApprovals: 0, unseenContacts: 0, pendingApplications: 0 })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen])

  useEffect(() => {
    if (user) {
      fetchCounts()

      const refreshListener = () => fetchCounts();
      window.addEventListener('refreshAdminCounts', refreshListener);

      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') fetchCounts()
      }, 60000)

      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshAdminCounts', refreshListener);
      }
    }
  }, [user])

  const fetchCounts = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setCounts(data)
      }
    } catch (e) { }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.clear()
    router.push('/admin/login')
  }

  const isOwner = user?.role === 'owner'
  const isSuperAdmin = user?.role === 'super_admin' || isOwner
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const isModerator = user?.role === 'moderator' || isAdmin

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed lg:static inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col h-full z-[150]
          transition-transform duration-300 ease-in-out transform
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold italic tracking-tighter">Parle <span className="text-red-600">Admin</span></h2>
            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mt-1">Control Panel</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 bg-gray-800/50 mx-4 mt-6 rounded-2xl flex items-center gap-4 border border-white/5">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-900/20">
            <svg className="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Admin User</p>
            <p className="font-black text-sm truncate uppercase tracking-tight italic">{user?.name || 'Authorized User'}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-8 overflow-y-auto custom-scrollbar">

          {/* SECTION 1: APPROVAL CENTER */}
          {isAdmin && (
            <div className="bg-red-950/20 rounded-[1.5rem] p-2 border border-red-500/10">
              <div className="px-4 pb-2 pt-1 border-b border-white/5 mb-2">
                <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] italic">Approval Center</p>
              </div>

              {(isSuperAdmin || isOwner) && (
                <Link href="/admin/approvals" onClick={onClose}>
                  <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 relative group italic">
                    Pending Approvals
                    {counts.pendingApprovals > 0 && (
                      <span className="absolute right-4 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-900/20 group-hover:scale-110 transition-transform">
                        {counts.pendingApprovals}
                      </span>
                    )}
                  </Button>
                </Link>
              )}

              <Link href="/admin/approvals/logs" onClick={onClose}>
                <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 italic">
                  Approval History
                </Button>
              </Link>
            </div>
          )}

          {/* SECTION 2: DAILY OPERATIONS */}
          <div className="bg-white/5 rounded-[1.5rem] p-2 border border-white/5">
            <div className="px-4 pb-2 pt-1 border-b border-white/5 mb-2">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Daily Tasks</p>
            </div>

            <Link href="/admin/dashboard" onClick={onClose}>
              <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 italic">
                Dashboard
              </Button>
            </Link>

            {isModerator && (
              <Link href="/admin/orders" onClick={onClose}>
                <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 relative group italic">
                  Order Hub
                  {(counts.pendingOrders + counts.processingOrders) > 0 && (
                    <span className="absolute right-4 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-900/20 group-hover:scale-110 transition-transform">
                      {counts.pendingOrders + counts.processingOrders}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {isAdmin && (
              <Link href="/admin/contacts" onClick={onClose}>
                <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 relative group italic">
                  Contact Inquiries
                  {counts.unseenContacts > 0 && (
                    <span className="absolute right-4 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-900/20 group-hover:scale-110 transition-transform">
                      {counts.unseenContacts}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {isAdmin && (
              <Link href="/admin/careers" onClick={onClose}>
                <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 relative group italic">
                  Career Applications
                  {counts.pendingApplications > 0 && (
                    <span className="absolute right-4 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-900/20 group-hover:scale-110 transition-transform">
                      {counts.pendingApplications}
                    </span>
                  )}
                </Button>
              </Link>
            )}
          </div>

          {/* SECTION 3: PRODUCT CATALOGUE */}
          {isAdmin && (
            <div className="bg-white/5 rounded-[1.5rem] p-2 border border-white/5">
              <div className="px-4 pb-2 pt-1 border-b border-white/5 mb-2">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Product Catalogue</p>
              </div>

              <Link href="/admin/inventory" onClick={onClose}>
                <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 italic">
                  Inventory
                </Button>
              </Link>

              <Link href="/admin/categories" onClick={onClose}>
                <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 italic">
                  Categories
                </Button>
              </Link>

              <Link href="/admin/products" onClick={onClose}>
                <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 italic">
                  Products
                </Button>
              </Link>
            </div>
          )}

          {/* SECTION 4: SYSTEM */}
          {isSuperAdmin && (
            <div className="bg-white/5 rounded-[1.5rem] p-2 border border-white/5">
              <div className="px-4 pb-2 pt-1 border-b border-white/5 mb-2">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] italic">System</p>
              </div>
              <Link href="/admin/users" onClick={onClose}><Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 italic">Manage Users</Button></Link>
              <Link href="/admin/careers/circulars" onClick={onClose}><Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 italic">Manage Circulars</Button></Link>
              <Link href="/admin/promo-codes" onClick={onClose}><Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 italic">Promo Codes</Button></Link>
              <Link href="/admin/activities" onClick={onClose}><Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase text-[11px] tracking-widest py-3 italic">Action Logs</Button></Link>
            </div>
          )}
        </nav>

        {/* System Health Status */}
        <div className="px-6 py-4 border-t border-gray-800 bg-black/20">
           <SystemStatusIndicator />
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full text-gray-400 border-gray-700 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-xl font-black uppercase text-[10px] py-4 transition-all"
          >
            LOGOUT
          </Button>
        </div>
      </div>
    </>
  )
}

function SystemStatusIndicator() {
  const [status, setStatus] = useState({ online: true, database: 'Connected', latency: '...' });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setStatus({ online: true, database: data.database, latency: data.latency });
        } else {
          setStatus(s => ({ ...s, online: false, database: 'Error' }));
        }
      } catch {
        setStatus(s => ({ ...s, online: false }));
      }
    };

    checkHealth();
    const timer = setInterval(checkHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3">
       <div className={`w-2 h-2 rounded-full ${status.online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'} shadow-[0_0_8px_rgba(16,185,129,0.5)]`}></div>
       <div className="flex flex-col">
          <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic">System Status</span>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
            {status.online ? 'Cloud Synchronized' : 'Sync Interrupted'}
          </span>
       </div>
       <div className="ml-auto flex flex-col items-end">
          <span className="text-[7px] font-black text-gray-600 uppercase italic">Ping</span>
          <span className="text-[9px] font-black text-gray-400 italic leading-none">{status.latency}</span>
       </div>
    </div>
  );
}

