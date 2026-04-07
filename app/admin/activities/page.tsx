'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

interface Activity {
  _id: string
  adminEmail: string
  action: string
  targetId?: string
  targetName?: string
  details?: string
  createdAt: string
}

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  
  // Filters
  const [emailFilter, setEmailFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      if (parsed.role !== 'super_admin' && parsed.role !== 'owner') {
        setError('Forbidden: Authorization Level 4 (Super Admin/Owner) Access Required.')
        setIsLoading(false)
        return
      }
    }
    fetchActivities()
  }, [page, emailFilter, actionFilter, dateFilter])

  const fetchActivities = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      if (emailFilter) params.append('email', emailFilter)
      if (actionFilter) params.append('action', actionFilter)
      if (dateFilter) params.append('date', dateFilter)

      const response = await fetch(`/api/admin/activities?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
        setTotalPages(data.totalPages || 1)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to fetch logs')
      }
    } catch (err) {
      console.error('Fetch activities error:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (user?.role !== 'owner') {
      alert('Access Denied: Only the Owner (Razu) can delete audit records.')
      return
    }
    if (!confirm('Permanent delete this log entry?')) return
    try {
      const response = await fetch(`/api/admin/activities?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        setActivities(activities.filter(a => a._id !== id))
      }
    } catch (err) {
      console.error('Delete activity error:', err)
    }
  }

  const handleClearAll = async () => {
    if (user?.role !== 'owner') {
      alert('Access Denied: Only the Owner (Razu) can clear the total audit log.')
      return
    }
    if (!confirm('EXTREME WARNING: This will permanently clear ALL activity logs. Proceed?')) return
    try {
      const response = await fetch(`/api/admin/activities?all=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        setActivities([])
      }
    } catch (err) {
      console.error('Clear activities error:', err)
    }
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border-2 border-red-100 flex flex-col items-center gap-4">
        <p className="text-red-600 font-black uppercase tracking-widest text-xs">{error}</p>
        <Button onClick={() => window.location.href = '/admin/dashboard'} variant="outline" className="border-red-600 text-red-600">Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter text-center sm:text-left">System Audit Log</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] text-center sm:text-left italic">Administrative Activity Monitoring Protocol</p>
        </div>
        {user?.role === 'owner' && (
          <Button 
            onClick={handleClearAll}
            className="bg-black hover:bg-red-700 text-white font-black uppercase tracking-widest text-[9px] px-4 py-2 h-8 rounded shadow-lg transition-all active:scale-95"
          >
            Clear All Logs
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4 border-2 border-gray-50 flex flex-wrap gap-4 items-end bg-gray-50/30">
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Admin Email</label>
          <Input 
            placeholder="Search email..." 
            value={emailFilter}
            onChange={(e) => { setEmailFilter(e.target.value); setPage(1); }}
            className="h-8 text-[10px] w-48 border-gray-200"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Action Type</label>
          <select 
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="h-8 text-[10px] px-2 w-48 border-2 border-gray-200 rounded-md bg-white focus:outline-none focus:border-red-600"
          >
            <option value="">All Actions</option>
            <option value="create_product">Create Product</option>
            <option value="update_product">Update Product</option>
            <option value="delete_product">Delete Product</option>
            <option value="create_category">Create Category</option>
            <option value="update_order_status">Update Order Status</option>
            <option value="create_admin">Create Admin (User MGMT)</option>
            <option value="delete_admin">Delete Admin (User MGMT)</option>
            <option value="approved_request">Owner Approved</option>
            <option value="declined_request">Owner Declined</option>
            <option value="undo_approval">Owner Undo</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Date</label>
          <Input 
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="h-8 text-[10px] w-48 border-gray-200"
          />
        </div>
        <Button 
          variant="ghost" 
          onClick={() => { setEmailFilter(''); setActionFilter(''); setDateFilter(''); setPage(1); }}
          className="h-8 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600"
        >
          Reset
        </Button>
      </Card>

      <Card className="overflow-hidden border-2 border-gray-100 shadow-sm rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b-2 border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left font-black text-gray-400 uppercase tracking-widest text-[9px]">Admin</th>
                <th className="px-6 py-3 text-left font-black text-gray-400 uppercase tracking-widest text-[9px]">Action</th>
                <th className="px-6 py-3 text-left font-black text-gray-400 uppercase tracking-widest text-[9px]">Target</th>
                <th className="px-6 py-3 text-left font-black text-gray-400 uppercase tracking-widest text-[9px]">Timestamp</th>
                <th className="px-6 py-3 text-right font-black text-gray-400 uppercase tracking-widest text-[9px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Querying Audit Database...</span>
                    </div>
                  </td>
                </tr>
              ) : activities.length > 0 ? (
                activities.map((activity) => (
                  <tr key={activity._id} className={`group hover:bg-gray-50/50 transition-colors ${activity.action === 'delete_admin' ? 'bg-red-50/40 border-l-4 border-red-600' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-black text-gray-900 text-[10px] tracking-tight truncate w-40">{activity.adminEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-red-600 uppercase tracking-wider bg-red-50 px-1.5 py-0.5 rounded w-fit">
                          {activity.action.replace(/_/g, ' ')}
                        </span>
                        <p className="text-[10px] text-gray-500 leading-tight italic">{activity.details}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      {activity.targetName || activity.targetId || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="font-black text-gray-600 text-[10px]">{new Date(activity.createdAt).toLocaleDateString()}</p>
                        <p className="text-[9px] text-gray-400 font-bold">{new Date(activity.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user?.role === 'owner' && (
                        <Button 
                          variant="ghost" 
                          onClick={() => handleDelete(activity._id)}
                          className="h-7 w-7 p-0 flex items-center justify-center font-black text-gray-200 hover:text-red-600 group-hover:text-gray-300 transition-all"
                        >
                          ×
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No activities recorded matching current criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex justify-center items-center gap-4 border-t border-gray-100">
            <Button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
              variant="outline"
              className="h-7 px-3 text-[9px] font-black uppercase tracking-widest border-2"
            >
              Previous
            </Button>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Page {page} of {totalPages}</span>
            <Button 
              disabled={page === totalPages} 
              onClick={() => setPage(page + 1)}
              variant="outline"
              className="h-7 px-3 text-[9px] font-black uppercase tracking-widest border-2"
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
