'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

interface Session {
  _id: string
  ipAddress: string
  userAgent: string
  status: 'success' | 'failed' | 'otp_requested'
  createdAt: string
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/admin/sessions', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          setSessions(data)
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSessions()
  }, [])

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Session Audit Log</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monitor your recent login activity</p>
      </div>

      <Card className="p-6 rounded-xl border-none shadow-sm bg-white overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">
            Loading audit logs...
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
            No session data found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">IP Address</th>
                  <th className="px-4 py-3 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Device / Browser</th>
                  <th className="px-4 py-3 text-right font-black text-gray-400 text-[10px] uppercase tracking-widest">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((session) => (
                  <tr key={session._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                        session.status === 'success' ? 'bg-green-50 text-green-600' :
                        session.status === 'failed' ? 'bg-red-50 text-red-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-600">{session.ipAddress}</td>
                    <td className="px-4 py-4 text-xs text-gray-500 max-w-xs truncate" title={session.userAgent}>
                      {session.userAgent}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-400 font-bold italic text-[10px]">
                      {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
