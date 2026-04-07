'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, Package, ShieldCheck, AlertCircle, ChevronRight } from 'lucide-react'
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
  const [user, setUser] = useState<any>(null)
  const [taskCounts, setTaskCounts] = useState({ pendingOrders: 0, processingOrders: 0, pendingApprovals: 0 })
  const [recentToast, setRecentToast] = useState<{title: string, msg: string} | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevCounts = useRef({ pendingOrders: 0, pendingApprovals: 0, processingOrders: 0 })

  const playSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      }
      audioRef.current.play().catch(e => console.log('Audio play blocked by browser. Click anywhere to enable.'))
    } catch (e) {}
  }

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

  const fetchTasks = useCallback(async (isInitial = false) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        if (!isInitial) {
           let newItems = [];
           if (data.pendingOrders > prevCounts.current.pendingOrders) newItems.push('New Order Received');
           if (data.pendingApprovals > prevCounts.current.pendingApprovals) newItems.push('New Approval Request');
           
           if (newItems.length > 0) {
              setRecentToast({ title: 'Attention Admin', msg: newItems[0] });
              playSound();
              setTimeout(() => setRecentToast(null), 5000);
           }
        }

        prevCounts.current = data;
        setTaskCounts(data);
        
        const isDismissed = sessionStorage.getItem('tasks_alert_dismissed');
        if (!isDismissed && isInitial && user) {
          let hasTasks = false;
          const totalApprovals = data.pendingApprovals || 0;
          const totalOrders = (data.pendingOrders || 0) + (data.processingOrders || 0);

          if (user.role === 'super_admin' || user.role === 'owner') {
             if (totalApprovals > 0 || totalOrders > 0) hasTasks = true;
          } else if (user.role === 'moderator' || user.role === 'admin') {
             if (totalOrders > 0) hasTasks = true;
          }
          
          if (hasTasks) {
            console.log("[NOTIF] Critical Tasks Detected. Triggering Alert Modal.");
            setShowFullAlert(true);
          }
        }
      }
    } catch (e) {}
  }, [user]);

  const closeAlert = () => {
    setShowFullAlert(false);
    sessionStorage.setItem('tasks_alert_dismissed', 'true');
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifs();
      fetchTasks(true);
      
      const intervalNotifs = setInterval(() => {
        if (document.visibilityState === 'visible') fetchNotifs();
      }, 60000); // 60s polling
      
      const intervalTasks = setInterval(() => {
        if (document.visibilityState === 'visible') fetchTasks(false);
      }, 60000); // 60s polling
      
      return () => {
        clearInterval(intervalNotifs);
        clearInterval(intervalTasks);
      };
    }
  }, [user, fetchNotifs, fetchTasks]);

  const markRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifs();
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchNotifs();
      }
    } catch (e) {}
  };

  return (
    <>
      {/* REAL-TIME TOAST ALERT (TOP-RIGHT NEAR ICON) */}
      <AnimatePresence>
        {recentToast && (
          <motion.div 
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="fixed top-24 right-8 z-[110] w-72 bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden flex"
          >
             <div className="w-2 bg-red-600"></div>
             <div className="p-4 flex-1">
                <div className="flex items-center justify-between mb-1">
                   <h5 className="text-[10px] font-black uppercase text-red-600 tracking-widest">{recentToast.title}</h5>
                   <Button onClick={() => setRecentToast(null)} variant="ghost" className="h-4 w-4 p-0 text-gray-300 hover:text-red-600">
                      <X className="w-3 h-3" />
                   </Button>
                </div>
                <p className="text-sm font-black text-gray-900 tracking-tight italic">{recentToast.msg}</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PERSISTENT NOTIFICATION ICON */}
      <div className="relative" ref={dropdownRef}>
        <Button 
          onClick={() => setIsOpen(!isOpen)}
          variant="ghost" 
          className="relative text-gray-400 hover:text-red-600 hover:bg-red-50 h-14 w-14 p-0 rounded-2xl border border-transparent hover:border-red-100 shadow-sm transition-all"
        >
          <Bell className="w-7 h-7" />
          {unreadCount > 0 && (
            <span className="absolute top-3.5 right-3.5 w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
          )}
          {unreadCount > 0 && (
            <span className="absolute top-3.5 right-3.5 w-3 h-3 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)] border-2 border-white"></span>
          )}
        </Button>

        {isOpen && (
          <div className="absolute right-0 top-16 w-80 bg-white border border-gray-100 rounded-[2rem] shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">New Notifications</span>
              {unreadCount > 0 ? (
                 <button 
                   onClick={markAllAsRead}
                   className="text-[9px] font-black text-blue-600 uppercase hover:underline"
                 >
                   Mark all as read
                 </button>
              ) : (
                 <span className="bg-gray-100 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Caught Up</span>
              )}
            </div>
            
            <div className="max-h-[400px] overflow-auto py-2">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Check className="w-6 h-6 text-gray-200 mx-auto" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">All Clear</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n._id} 
                    className={`p-5 border-b border-gray-50 hover:bg-slate-50 transition-colors group relative ${!n.isRead ? 'bg-red-50/20' : ''}`}
                  >
                    <div className="flex gap-4">
                      <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.isRead ? 'bg-red-600' : 'bg-gray-200'}`}></div>
                      <div className="space-y-1">
                        <h4 className={`text-xs font-black uppercase tracking-tight ${!n.isRead ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</h4>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-2">{n.message}</p>
                        {n.targetLink && (
                          <Link 
                            href={n.targetLink} 
                            onClick={() => { setIsOpen(false); markRead(n._id); }}
                            className="text-[9px] font-black text-red-600 uppercase tracking-[0.2em] pt-3 inline-block hover:underline"
                          >
                            View details →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {notifications.length > 0 && (
               <Button className="w-full rounded-none bg-white hover:bg-red-50 text-[9px] font-black uppercase tracking-widest text-gray-400 py-4 border-t border-gray-50 hover:text-red-600 transition-all">
                  Clear All History
               </Button>
            )}
          </div>
        )}
      </div>
      {/* MODAL / LIGHTBOX ALERT - CENTERED & BLURRED */}
      <AnimatePresence mode="wait">
        {showFullAlert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6"
          >
            {/* Dark Backdrop with heavy blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAlert}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-xl"
            />

            {/* Modal Content - Artificially Centered Card */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.2)] overflow-hidden border border-white"
            >
               <div className="absolute top-0 left-0 w-full h-3 bg-red-600"></div>
               
               <Button 
                 onClick={closeAlert}
                 variant="ghost" 
                 className="absolute top-8 right-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl w-12 h-12 p-0 z-20 transition-all font-black text-xl"
               >
                 <X className="w-8 h-8" />
               </Button>
               
               <div className="p-12 text-center">
                  <div className="mb-10 inline-flex items-center justify-center">
                     <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center relative rotate-6 scale-110 shadow-lg shadow-red-100/50">
                        <AlertCircle className="w-12 h-12 text-red-600 -rotate-6" />
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-black animate-bounce border-4 border-white">!</div>
                     </div>
                  </div>
                  
                  <div className="space-y-6">
                     <div>
                        <h2 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
                           Pending <span className="text-red-600 underline decoration-red-600/20 underline-offset-[12px]">Tasks</span>
                        </h2>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mt-8">Action Required Immediately</p>
                     </div>
                     
                     <div className="space-y-4 pt-10 text-left">
                        {/* Approval Task Link */}
                        {(user?.role === 'super_admin' || user?.role === 'owner') && taskCounts.pendingApprovals > 0 && (
                          <Link href="/admin/approvals" onClick={closeAlert} className="block group">
                            <div className="bg-slate-50 p-6 rounded-[2.2rem] border border-slate-100 flex items-center justify-between group-hover:bg-white group-hover:shadow-2xl group-hover:scale-[1.02] transition-all border-l-8 border-l-blue-600">
                               <div className="flex items-center gap-6">
                                  <div className="w-14 h-14 bg-white shadow-sm ring-1 ring-slate-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                     <ShieldCheck className="w-7 h-7" />
                                  </div>
                                  <div>
                                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Waiting for Approval</p>
                                     <span className="text-lg font-black text-gray-900 uppercase tracking-tight italic">Product Changes ({taskCounts.pendingApprovals})</span>
                                  </div>
                               </div>
                               <ChevronRight className="w-6 h-6 text-gray-300 group-hover:translate-x-1 transition-all" />
                            </div>
                          </Link>
                        )}

                        {/* Order Task Link */}
                        {(taskCounts.pendingOrders > 0 || taskCounts.processingOrders > 0) && (
                          <Link href="/admin/orders" onClick={closeAlert} className="block group">
                            <div className="bg-slate-50 p-6 rounded-[2.2rem] border border-slate-100 flex items-center justify-between group-hover:bg-white group-hover:shadow-2xl group-hover:scale-[1.02] transition-all border-l-8 border-l-red-600">
                               <div className="flex items-center gap-6">
                                  <div className="w-14 h-14 bg-white shadow-sm ring-1 ring-slate-100 text-red-600 rounded-2xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
                                     <Package className="w-7 h-7" />
                                  </div>
                                  <div>
                                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">New Orders</p>
                                     <span className="text-lg font-black text-gray-900 uppercase tracking-tight italic">Sales List ({taskCounts.pendingOrders + taskCounts.processingOrders})</span>
                                  </div>
                               </div>
                               <ChevronRight className="w-6 h-6 text-gray-300 group-hover:translate-x-1 transition-all" />
                            </div>
                          </Link>
                        )}
                     </div>
                  </div>

                  <div className="pt-12">
                     <button 
                       onClick={closeAlert}
                       className="group text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] hover:text-red-600 transition-all flex items-center justify-center gap-2 mx-auto"
                     >
                       <span className="w-12 h-[1px] bg-slate-200 group-hover:bg-red-300 transition-all" />
                       Close Alert
                       <span className="w-12 h-[1px] bg-slate-200 group-hover:bg-red-300 transition-all" />
                     </button>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
