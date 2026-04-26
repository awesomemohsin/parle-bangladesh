'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { Shield, History } from 'lucide-react'
import { toast } from 'sonner'

interface LogEntry {
  _id: string
  ipAddress?: string
  userAgent?: string
  status?: 'success' | 'failed' | 'otp_requested' | 'password_changed'
  createdAt: string
  role?: string
  email?: string
}

export default function AdminSessionsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/sessions?mode=history')
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      toast.error('Failed to load security logs')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Security Logs</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Audit trail for authentication events</p>
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-xl bg-white overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing security data...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">IP Address</th>
                  <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Device</th>
                  <th className="px-6 py-4 text-right font-black text-gray-400 text-[10px] uppercase tracking-widest">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${
                        log.status === 'success' ? 'bg-green-50 text-green-600' :
                        log.status === 'failed' ? 'bg-red-50 text-red-600' :
                        log.status === 'otp_requested' ? 'bg-blue-50 text-blue-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {log.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-bold text-[11px] text-gray-900">{log.email}</td>
                    <td className="px-6 py-5 font-mono text-[11px] text-gray-600">{log.ipAddress || 'Unknown'}</td>
                    <td className="px-6 py-5 text-[11px] text-gray-500 max-w-[200px] truncate italic" title={log.userAgent}>
                      {log.userAgent || 'Unknown Device'}
                    </td>
                    <td className="px-6 py-5 text-right text-gray-400 font-bold italic text-[10px]">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
               <div className="py-20 text-center text-gray-300 font-black uppercase tracking-[0.2em] text-[10px]">
                  No security events detected
               </div>
            )}
          </div>
        )}
      </Card>
      
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex gap-4 items-start">
         <Shield className="w-6 h-6 text-gray-400 mt-1 shrink-0" />
         <div className="flex flex-col gap-1">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Audit Policy</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
               This log tracks all successful and failed authentication attempts to ensure system integrity. Session revocation is disabled in current security tier.
            </p>
         </div>
      </div>
    </div>
  )
}
