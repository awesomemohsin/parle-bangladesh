'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Filter, CheckCircle, XCircle, Clock } from 'lucide-react'

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

export default function PromoCodeApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reviewComment, setReviewComment] = useState<{ [key: string]: string }>({})
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({})
  const [user, setUser] = useState<any>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')

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
      const response = await fetch('/api/approvals?type=promo-code&status=pending', {
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
          L2: Anindo {hasAnindo && '✓'}
        </div>
        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${hasSaiful ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>
          L2: Saiful {hasSaiful && '✓'}
        </div>
        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${hasRazu ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>
          Final: Razu {hasRazu && '✓'}
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
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">Promo Code Approvals</h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Level 2 Verification Protocol</p>
           </div>
           
           <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm ml-auto">
                <Filter className="w-3.5 h-3.5 text-gray-300" />
                <select 
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-[9px] font-black uppercase tracking-widest text-gray-500 focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
           </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Querying Pending Promo Codes...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No pending promo codes require authorization</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sortedRequests.map(request => (
            <Card key={request._id} className="p-6 border-2 border-gray-50 shadow-sm relative overflow-hidden group rounded-[2rem]">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                        New {request.targetDetails?.type === 'promo' ? 'Promo Code' : 'Flat Discount'}
                      </span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        By: {request.requesterEmail}
                      </span>
                    </div>
                    {getConsentStatus(request)}
                  </div>

                  <div className="bg-amber-50/30 border border-amber-100/50 rounded-2xl p-4">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
                      {request.targetName}
                    </h3>
                    
                    {request.targetDetails && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Discount</p>
                          <p className="text-sm font-black text-amber-600">
                            {request.targetDetails.discountAmount}
                            {request.targetDetails.discountType === 'percentage' ? '%' : ' ৳'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Max Usage</p>
                          <p className="text-sm font-black text-gray-700">{request.targetDetails.maxUsage}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Applicability</p>
                          <p className="text-sm font-black text-gray-700">
                            {request.targetDetails.allProducts ? 'All Products' : `${request.targetDetails.applicableProducts?.length || 0} Products`}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Expires</p>
                          <p className="text-sm font-black text-gray-700">
                            {request.targetDetails.expiresAt ? new Date(request.targetDetails.expiresAt).toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {request.comments && request.comments.length > 0 && (
                     <div className="space-y-2 py-2 border-t border-gray-50">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Comments</p>
                        <div className="space-y-2">
                           {request.comments.map((c, i) => (
                             <div key={i} className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex justify-between items-center">
                                <p className="text-[10px] font-medium text-gray-600"><span className="font-black uppercase text-amber-600 text-[9px]">{c.user}:</span> {c.text}</p>
                             </div>
                           ))}
                        </div>
                     </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Approval Note</label>
                    <Input 
                      placeholder={canApprove(request) ? "Add a comment..." : "Unauthorized"}
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
                         <p className="text-[10px] font-bold text-gray-400 uppercase leading-tight">
                            Waiting for Level 2 verification
                         </p>
                      </div>
                   ) : (
                      <>
                        <Button 
                          disabled={isProcessing[request._id]}
                          onClick={() => handleProcess(request._id, 'approved')}
                          className="bg-amber-600 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] h-12 shadow-lg transition-all rounded-xl"
                        >
                          {isProcessing[request._id] ? "Processing..." : "Approve & Go Live"}
                        </Button>
                        <Button 
                          disabled={isProcessing[request._id]}
                          onClick={() => handleProcess(request._id, 'declined')}
                          variant="ghost"
                          className="text-gray-400 hover:text-red-600 font-black uppercase tracking-widest text-[9px] h-10 transition-all underline"
                        >
                          Decline
                        </Button>
                      </>
                   )}
                   <p className="text-[8px] text-gray-300 font-bold uppercase tracking-tighter text-center mt-2">
                     Requested: {new Date(request.createdAt).toLocaleString()}
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
