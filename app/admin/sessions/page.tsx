'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { Shield, LogOut, History, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

interface Session {
  _id: string
  ipAddress?: string
  userAgent?: string
  status?: 'success' | 'failed' | 'otp_requested' | 'password_changed'
  createdAt: string
  role?: string
  userId?: string
  email?: string
}

export default function AdminSessionsPage() {
  const { logout, user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [mode, setMode] = useState<'history' | 'active'>('active')
  const [isLoading, setIsLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/sessions?mode=${mode}`)
      if (res.ok) {
        const data = await res.json()
        if (mode === 'active') setActiveSessions(data)
        else setSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      toast.error('Failed to load session data')
    } finally {
      setIsLoading(false)
    }
  }, [mode])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const revokeSession = async (id: string) => {
    const isCurrent = activeSessions.find(s => s._id === id)?.userId === user?.id && id === user?.sid;
    const confirmMsg = isCurrent 
      ? 'WARNING: You are revoking your CURRENT session. You will be logged out immediately. Continue?'
      : 'Are you sure you want to revoke this session? The device will be forced to log out.';

    if (!confirm(confirmMsg)) return;
    
    try {
      const res = await fetch(`/api/admin/sessions?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const data = await res.json();
        if (data.isSelf) {
          toast.success('Your session was revoked. Logging out...')
          setTimeout(() => logout(), 1500)
          return;
        }
        toast.success('Session revoked successfully')
        fetchSessions()
      } else {
        toast.error('Failed to revoke session')
      }
    } catch (error) {
      toast.error('An error occurred during revocation')
    }
  }

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Security & Sessions</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage active authentication and audit logs</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
           <button 
             onClick={() => setMode('active')}
             className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
           >
             <Activity className="w-3 h-3" />
             Active Sessions
           </button>
           <button 
             onClick={() => setMode('history')}
             className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
           >
             <History className="w-3 h-3" />
             Security Logs
           </button>
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-xl bg-white overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing session data...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  {mode === 'active' ? (
                    <>
                      <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Role</th>
                      <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Email Address</th>
                      <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Created</th>
                      <th className="px-6 py-4 text-right font-black text-gray-400 text-[10px] uppercase tracking-widest">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">IP Address</th>
                      <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Device</th>
                      <th className="px-6 py-4 text-right font-black text-gray-400 text-[10px] uppercase tracking-widest">Time</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(mode === 'active' ? activeSessions : sessions).map((session) => (
                  <tr key={session._id} className="hover:bg-gray-50/50 transition-colors group">
                    {mode === 'active' ? (
                      <>
                        <td className="px-6 py-5">
                          <span className="bg-gray-900 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-tighter shadow-sm">
                            {session.role}
                          </span>
                          {session._id === user?.sid && (
                            <span className="ml-2 bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-tighter shadow-sm">
                              CURRENT SESSION
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 font-mono text-[11px] text-gray-500">{session.email || 'N/A'}</td>
                        <td className="px-6 py-5 text-gray-400 font-bold text-[10px] italic">
                          {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Button 
                            variant="destructive"
                            size="sm"
                            onClick={() => revokeSession(session._id)}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-none text-[9px] font-black uppercase tracking-widest h-8 px-4 rounded-lg transition-all"
                          >
                            <LogOut className="w-3 h-3 mr-1.5" />
                            Revoke
                          </Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${
                            session.status === 'success' ? 'bg-green-50 text-green-600' :
                            session.status === 'failed' ? 'bg-red-50 text-red-600' :
                            session.status === 'otp_requested' ? 'bg-blue-50 text-blue-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {session.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-mono text-[11px] text-gray-600">{session.ipAddress || 'Unknown'}</td>
                        <td className="px-6 py-5 text-[11px] text-gray-500 max-w-[200px] truncate italic" title={session.userAgent}>
                          {session.userAgent || 'Unknown Device'}
                        </td>
                        <td className="px-6 py-5 text-right text-gray-400 font-bold italic text-[10px]">
                          {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {(mode === 'active' ? activeSessions : sessions).length === 0 && (
               <div className="py-20 text-center text-gray-300 font-black uppercase tracking-[0.2em] text-[10px]">
                  No data points detected
               </div>
            )}
          </div>
        )}
      </Card>
      
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4 items-start">
         <Shield className="w-6 h-6 text-amber-600 mt-1 shrink-0" />
         <div className="flex flex-col gap-1">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">Security Advisory</h4>
            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
               Active sessions represent authenticated devices with valid refresh tokens. Revoking a session or logging out will force that device to logout immediately. For maximum security, we recommend periodic password changes.
            </p>
         </div>
      </div>
    </div>
  )
}
