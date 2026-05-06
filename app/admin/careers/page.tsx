'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Filter, User, Briefcase, Calendar, Phone, Mail, FileText, ChevronRight, MessageSquare } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function AdminCareersPage() {
  const { logout } = useAuth()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/careers?position=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
        // Trigger sidebar update to clear the badge
        window.dispatchEvent(new CustomEvent('refreshAdminCounts'))
      } else if (response.status === 401) {
        logout()
        toast.error('Session expired. Please login again.')
      } else {
        toast.error('Failed to fetch applications')
      }
    } catch (error) {
      toast.error('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [filter])

  // Get unique positions for filter
  const positions = ['all', ...Array.from(new Set(applications.map(app => app.position)))]

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
            Career <span className="text-red-600">Applications</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium">Review and manage job candidate submissions.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto max-w-full">
           <Filter className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
           {['all', 'Territory Sales Officer', 'Logistics Coordinator', 'Brand Executive', 'General Application'].map((pos) => (
             <button
               key={pos}
               onClick={() => setFilter(pos === 'all' ? 'all' : pos)}
               className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filter === pos ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
             >
               {pos}
             </button>
           ))}
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 shadow-sm">
           <User className="w-12 h-12 text-gray-200 mx-auto mb-4" />
           <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No applications found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applications.map((app) => (
            <Card key={app._id} className="overflow-hidden border-none shadow-xl shadow-gray-100 rounded-[2rem] group transition-all hover:scale-[1.005]">
              <div className="h-1.5 w-full bg-red-600/10 group-hover:bg-red-600 transition-colors"></div>
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Candidate Info */}
                  <div className="flex-1 space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                           <User className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-gray-900 leading-tight uppercase tracking-tight">{app.fullname}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-red-100 text-red-600 bg-red-50/50">
                              {app.position}
                            </Badge>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(app.createdAt), 'dd MMM yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-gray-400 group-hover/item:bg-red-50 group-hover/item:text-red-600 transition-colors">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-600 truncate">{app.email}</span>
                      </div>
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-gray-400 group-hover/item:bg-red-50 group-hover/item:text-red-600 transition-colors">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">{app.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-gray-400 group-hover/item:bg-red-50 group-hover/item:text-red-600 transition-colors">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Exp: {app.experience || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-gray-400 group-hover/item:bg-red-50 group-hover/item:text-red-600 transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">CV Received</span>
                      </div>
                    </div>
                  </div>

                  {/* Message & Action */}
                  <div className="flex-[1.2] flex flex-col gap-4">
                    <div className="flex-1 bg-slate-50 rounded-2xl p-6 relative">
                      <MessageSquare className="absolute top-4 right-4 w-6 h-6 text-slate-200" />
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 italic leading-none">Candidate Message</p>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed italic">
                        "{app.message || 'No additional message provided'}"
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                       <Button variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 border-slate-200 hover:bg-slate-50">
                          Mark as Reviewed
                       </Button>
                       <a href={`mailto:${app.email}?subject=Regarding your application for ${app.position}`}>
                          <Button className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 bg-black hover:bg-red-600 transition-colors">
                            Contact Candidate
                          </Button>
                       </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
