'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Filter } from 'lucide-react'

interface ApprovalRequest {
  _id: string
  requesterEmail: string
  type: string
  targetId: string
  targetName: string
  field: string
  oldValue: string
  newValue: string
  status: string
  stage: 'superadmin' | 'owner'
  superadminApprovals: string[]
  ownerApproved: boolean
  createdAt: string
  comments: { user: string; text: string; date: string }[]
  targetDetails?: any
}

export default function OrderApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reviewComment, setReviewComment] = useState<{ [key: string]: string }>({})
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({})
  const [user, setUser] = useState<any>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')

  useEffect(() => {
    fetchRequests()
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser(payload)
      } catch (e) {}
    }
  }, [])

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/approvals?type=order&status=pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
      }
    } catch (err) {
      console.error('Fetch requests error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === 'name-asc') return a.targetName.localeCompare(b.targetName)
      if (sortBy === 'name-desc') return b.targetName.localeCompare(a.targetName)
      return 0
    })
  }, [requests, sortBy])

  const handleProcess = async (id: string, status: 'approved' | 'declined') => {
    setIsProcessing(prev => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`/api/approvals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          status, 
          comment: reviewComment[id] || "" 
        })
      })

      if (response.ok) {
        const data = await response.json()
        const updatedReq = data.request
        
        if (updatedReq.status !== 'pending') {
          setRequests(requests.filter(r => r._id !== id))
        } else {
          setRequests(requests.map(r => r._id === id ? updatedReq : r))
        }
        setReviewComment(prev => ({ ...prev, [id]: '' }))
      } else {
        const data = await response.json()
        alert(data.error || "Failed to process request")
      }
    } catch (err) {
      console.error('Process error:', err)
    } finally {
      setIsProcessing(prev => ({ ...prev, [id]: false }))
    }
  }

  const getConsentStatus = (request: ApprovalRequest) => {
    const hasAnindo = request.superadminApprovals.some(a => a.toLowerCase().includes('anindo'))
    const hasSaiful = request.superadminApprovals.some(a => a.toLowerCase().includes('saiful'))
    const hasRazu = request.ownerApproved

    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${hasAnindo ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>
          Superadmin: Anindo {hasAnindo && '✓'}
        </div>
        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${hasSaiful ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>
          Superadmin: Saiful {hasSaiful && '✓'}
        </div>
        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${hasRazu ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>
          Finalized: Razu {hasRazu && '✓'}
        </div>
      </div>
    )
  }

  const canApprove = (request: ApprovalRequest) => {
    if (!user) return false
    const name = (user.name || '').toLowerCase()
    
    if (request.stage === 'superadmin') {
      if (!name.includes('anindo') && !name.includes('saiful')) return false
      if (request.superadminApprovals.some(a => a.toLowerCase().includes(name))) return false
      return true
    }
    
    if (request.stage === 'owner') {
      return name.includes('razu')
    }
    
    return false
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
           <div>
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">Order Approvals</h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Triple-Verification Protocol Active</p>
           </div>

           <div className="flex items-center gap-4 w-full md:w-auto">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm ml-auto">
                <Filter className="w-3.5 h-3.5 text-gray-300" />
                <select 
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-[9px] font-black uppercase tracking-widest text-gray-500 focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Customer (A-Z)</option>
                  <option value="name-desc">Customer (Z-A)</option>
                </select>
              </div>

              {user && (
                 <div className="hidden sm:block text-right border-l border-gray-100 pl-4">
                   <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Active Identity</p>
                   <p className="text-sm font-black text-red-600 uppercase tracking-tight">{user.name || user.email}</p>
                 </div>
              )}
           </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Querying Pending Order Requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No pending order changes require authorization</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sortedRequests.map(request => (
            <Card key={request._id} className="p-6 border-2 border-gray-50 shadow-sm relative overflow-hidden group rounded-[2rem]">
               {request.stage === 'owner' && <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>}
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[9px] font-black text-white bg-black px-2 py-1 rounded-full uppercase tracking-wider shadow-md shadow-gray-100">
                        {request.field} change
                      </span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">
                        By: {request.requesterEmail}
                      </span>
                    </div>
                    {getConsentStatus(request)}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">
                      {request.targetName}
                    </h3>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                      Target ID: {request.targetId}
                    </p>
                  </div>

                  {request.targetDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-gray-50 my-2">
                       {/* Customer Card */}
                       <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 flex flex-col gap-1.5">
                          <p className="text-[8px] font-black text-red-600 uppercase tracking-[0.2em] mb-1">Customer Insight</p>
                          <p className="text-xs font-black text-gray-900 uppercase">{request.targetDetails.customerName}</p>
                          <div className="flex flex-col gap-0.5">
                             <p className="text-[9px] text-gray-400 font-bold uppercase">{request.targetDetails.customerPhone}</p>
                             <p className="text-[9px] text-gray-400 font-bold uppercase">{request.targetDetails.customerEmail}</p>
                             <p className="text-[8px] text-gray-500 font-medium leading-tight mt-1 line-clamp-2">
                               {request.targetDetails.address}, {request.targetDetails.city}
                             </p>
                          </div>
                       </div>
                       
                       {/* Items Summary */}
                       <div className="bg-white p-3 rounded-2xl border border-gray-100 flex flex-col gap-2">
                          <div className="flex justify-between items-center mb-1">
                             <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Package Payload</p>
                             <p className="text-[10px] font-black text-red-600">৳{request.targetDetails.total}</p>
                          </div>
                          <div className="space-y-1 max-h-[80px] overflow-y-auto pr-2 custom-scrollbar">
                             {request.targetDetails.items?.map((item: any, idx: number) => (
                               <div key={idx} className="flex justify-between text-[10px] items-center border-b border-gray-50 pb-1 last:border-0">
                                  <span className="font-bold text-gray-700 truncate max-w-[140px] uppercase">{item.name}</span>
                                  <span className="text-gray-400 font-black">×{item.quantity}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="flex items-center gap-6 py-4 px-5 rounded-[1.5rem] border-2 border-gray-100 bg-gray-50/20 shadow-inner">
                      <div className="flex-1 flex flex-col items-center">
                         <span className="text-[7px] font-black text-gray-400 border border-gray-100 px-2 py-0.5 rounded-full uppercase tracking-widest mb-2 bg-white">Current State</span>
                         <span className="text-xs font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-xl border border-gray-100 line-through">
                           {request.oldValue}
                         </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                         <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-50 flex items-center justify-center text-gray-200 shadow-sm animate-pulse">→</div>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                         <span className="text-[7px] font-black text-red-600 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-widest mb-2 bg-white">Proposed State</span>
                         <span className="text-xs font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 shadow-sm shadow-red-100/50">
                           {request.newValue}
                         </span>
                      </div>
                    </div>

                    <div className="bg-gray-900/5 p-4 rounded-[1.5rem] border border-gray-100 flex flex-col gap-3">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1 h-1 bg-red-600 rounded-full animate-ping"></span> 
                          Authentication Integrity
                       </p>
                       <div className="space-y-2">
                          <VerificationItem label="Order Record Found" status={!!request.targetId} />
                          <VerificationItem label="Permission Tier Active" status={true} />
                          <Link href="/admin/hub" className="block">
                            <div className="flex justify-between items-center bg-black hover:bg-red-600 transition-colors px-3 py-1.5 rounded-xl text-white">
                               <span className="text-[9px] font-black uppercase tracking-tight">Audit Source Hub →</span>
                               <span className="text-[8px] font-bold opacity-70 italic">Inspect order life</span>
                            </div>
                          </Link>
                       </div>
                    </div>
                  </div>

                  {request.comments && request.comments.length > 0 && (
                     <div className="space-y-2 py-2 border-t border-gray-50">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Historical Context</p>
                        <div className="space-y-2">
                           {request.comments.map((c, i) => (
                             <div key={i} className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex justify-between items-center">
                                <p className="text-[10px] font-medium text-gray-600"><span className="font-black uppercase text-red-600 text-[9px]">{c.user}:</span> {c.text}</p>
                                <span className="text-[8px] text-gray-300 font-bold">{new Date(c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             </div>
                           ))}
                        </div>
                     </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Review Note (Optional)</label>
                    <Input 
                      placeholder={canApprove(request) ? "Add your signature or comment..." : "Waiting for other authorizers..."}
                      value={reviewComment[request._id] || ""}
                      onChange={(e) => setReviewComment(prev => ({ ...prev, [request._id]: e.target.value }))}
                      className="border-gray-100 text-xs h-9 bg-gray-50/50 rounded-xl"
                      disabled={!canApprove(request)}
                    />
                  </div>
                </div>

                <div className="md:w-56 flex flex-col gap-3 justify-center border-l md:pl-6 border-gray-100">
                   {!canApprove(request) ? (
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Status</p>
                         <p className="text-[10px] font-bold text-gray-500 uppercase leading-tight">
                            {request.stage === 'superadmin' ? 'Waiting for Triple-Admin Consensus' : 'Waiting for Final Verification'}
                         </p>
                      </div>
                   ) : (
                      <>
                        <Button 
                          disabled={isProcessing[request._id]}
                          onClick={() => handleProcess(request._id, 'approved')}
                          className="bg-black hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] h-12 shadow-lg transition-all shadow-red-50 rounded-xl"
                        >
                          {isProcessing[request._id] ? "Processing..." : request.stage === 'superadmin' ? "Sign & Verify" : "Authorize Final Update"}
                        </Button>
                        <Button 
                          disabled={isProcessing[request._id]}
                          onClick={() => handleProcess(request._id, 'declined')}
                          variant="ghost"
                          className="text-gray-400 hover:text-red-600 font-black uppercase tracking-widest text-[9px] h-10 transition-all underline underline-offset-4"
                        >
                          Decline Request
                        </Button>
                      </>
                   )}
                   <p className="text-[8px] text-gray-300 font-bold uppercase tracking-tighter text-center mt-2">
                     Protocol Initiated: {new Date(request.createdAt).toLocaleString()}
                   </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function VerificationItem({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-gray-100/50">
       <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">{label}</span>
       <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${status ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
       </div>
    </div>
  )
}
