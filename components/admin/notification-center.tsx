'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, Check, Package, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Notification {
  _id: string
  title: string
  message: string
  type: 'order' | 'approval' | 'system' | 'alert'
  targetLink?: string
  isRead: boolean
  createdAt: string
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const unreadCount = notifications.filter(n => !n.isRead).length
  const [isOpen, setIsOpen] = useState(false)
  const [showFullAlert, setShowFullAlert] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<number>(0)
  const [user, setUser] = useState<any>(null)

  const fetchNotifs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 20000)
    return () => clearInterval(interval)
  }, [fetchNotifs])

  const [taskCounts, setTaskCounts] = useState({ pendingOrders: 0, processingOrders: 0, pendingApprovals: 0 })

  const fetchTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTaskCounts(data)
        
        // Show modal if any tasks are identified for the current user's role
        if (user) {
          if (user.role === 'super_admin' || user.role === 'owner') {
             if (data.pendingApprovals > 0) setShowFullAlert(true)
          } else if (user.role === 'moderator') {
             if (data.processingOrders > 0) setShowFullAlert(true)
          } else if (user.role === 'admin') {
             if (data.pendingOrders > 0) setShowFullAlert(true)
          }
        }
      }
    } catch (e) {}
  }, [user])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchNotifs()
    const intervalNotifs = setInterval(fetchNotifs, 30000)
    return () => clearInterval(intervalNotifs)
  }, [fetchNotifs])

  useEffect(() => {
    if (user) {
      fetchTasks()
      const intervalTasks = setInterval(fetchTasks, 60000)
      return () => clearInterval(intervalTasks)
    }
  }, [user, fetchTasks])

  const markRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchNotifs()
    } catch (e) {}
  }

  return (
    <>
      {/* LIGHT POPUP ALERT - USER RESPONSIBILITIES */}
      {showFullAlert && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="max-w-md w-full bg-gray-900 border border-red-900/50 rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in slide-in-from-bottom-10 duration-500">
              <Button 
                onClick={() => setShowFullAlert(false)}
                variant="ghost" 
                className="absolute top-4 right-4 text-gray-500 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 p-0 z-20"
              >
                <X className="w-5 h-5" />
              </Button>
              
              <div className="p-8 text-center space-y-6">
                <div className="relative inline-block">
                   <div className="absolute inset-0 bg-red-600 blur-[40px] opacity-20 animate-pulse"></div>
                   {user?.role === 'super_admin' || user?.role === 'owner' ? (
                     <ShieldCheck className="w-16 h-16 text-red-500 mx-auto relative z-10" />
                   ) : (
                     <Package className="w-16 h-16 text-blue-500 mx-auto relative z-10" />
                   )}
                </div>
                
                <div className="space-y-3">
                   <h2 className="text-2xl font-bold text-white tracking-tight">
                      {user?.role === 'super_admin' || user?.role === 'owner' ? 'Wait for your decision!' : 'New task for you!'}
                   </h2>
                   <p className="text-red-500 font-bold uppercase tracking-widest text-[9px]">Check your new tasks!</p>
                   
                   <p className="text-gray-400 text-sm leading-relaxed px-4">
                      {user?.role === 'super_admin' || user?.role === 'owner' ? (
                        <>You have <span className="text-white font-bold">{taskCounts.pendingApprovals}</span> items that need your approval to be updated.</>
                      ) : user?.role === 'moderator' ? (
                        <>You have <span className="text-white font-bold">{taskCounts.processingOrders}</span> orders ready to be processed for shipping.</>
                      ) : (
                        <>There are <span className="text-white font-bold">{taskCounts.pendingOrders}</span> new orders waiting for you to check them.</>
                      )}
                   </p>
                </div>

                <div className="pt-2">
                   <Link href={user?.role === 'super_admin' || user?.role === 'owner' ? "/admin/approvals" : "/admin/orders"} onClick={() => setShowFullAlert(false)}>
                      <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl h-12 shadow-xl shadow-red-900/20 border-none">
                         Open Tasks →
                      </Button>
                   </Link>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* PERSISTENT NOTIFICATION ICON */}
      <div className="relative">
        <Button 
          onClick={() => setIsOpen(!isOpen)}
          variant="ghost" 
          className="relative text-gray-400 hover:text-white hover:bg-gray-800 h-10 w-10 p-0"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
          )}
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></span>
          )}
        </Button>

        {isOpen && (
          <div className="absolute left-0 top-12 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Neural Notifications</span>
              {unreadCount > 0 && <span className="bg-red-600/10 text-red-500 text-[9px] font-black px-2 py-0.5 rounded uppercase">{unreadCount} New</span>}
            </div>
            
            <div className="max-h-[400px] overflow-auto py-2">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Check className="w-6 h-6 text-gray-800 mx-auto" />
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Protocol Clean</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n._id} 
                    className={`p-4 border-b border-gray-800 hover:bg-white/5 transition-colors group relative ${!n.isRead ? 'bg-red-600/5' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!n.isRead ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}></div>
                      <div className="space-y-1">
                        <h4 className={`text-xs font-black uppercase tracking-tight ${!n.isRead ? 'text-white' : 'text-gray-400'}`}>{n.title}</h4>
                        <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{n.message}</p>
                        {n.targetLink && (
                          <Link 
                            href={n.targetLink} 
                            onClick={() => { setIsOpen(false); markRead(n._id); }}
                            className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] pt-2 inline-block hover:text-red-400"
                          >
                            Execute Link →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {notifications.length > 0 && (
               <Button className="w-full rounded-none bg-black/30 hover:bg-black/50 text-[9px] font-black uppercase tracking-widest text-gray-500 py-3 border-t border-gray-800">
                  Dismiss Communications History
               </Button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
