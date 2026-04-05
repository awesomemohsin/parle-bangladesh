'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

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
}

export default function OrderApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reviewComment, setReviewComment] = useState<{ [key: string]: string }>({})
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({})
  const [user, setUser] = useState<any>(null)

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
      <div className="flex gap-2">
        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${hasAnindo ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>
          Superadmin: Anindo {hasAnindo && '✓'}
        </div>
        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${hasSaiful ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>
          Superadmin: Saiful {hasSaiful && '✓'}
        </div>
        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${hasRazu ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>
          Owner: Razu {hasRazu && '✓'}
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
        <div className="flex justify-between items-end">
           <div>
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">Order Approvals</h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Triple-Verification Protocol Active</p>
           </div>
           {user && (
              <div className="text-right">
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Active Identity</p>
                <p className="text-sm font-black text-red-600 uppercase tracking-tight">{user.name || user.email}</p>
              </div>
           )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Querying Pending Order Requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-gray-100">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No pending order changes require authorization</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {requests.map(request => (
            <Card key={request._id} className="p-6 border-2 border-gray-50 shadow-sm relative overflow-hidden group">
               {request.stage === 'owner' && <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>}
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-white bg-black px-2 py-1 rounded uppercase tracking-wider">
                        {request.field} change
                      </span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Requested by: {request.requesterEmail}
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

                  <div className="flex items-center gap-6 py-2">
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 text-center">Previous</span>
                       <span className="text-sm font-black text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-md shadow-inner">{request.oldValue}</span>
                    </div>
                    <div className="w-8 h-px bg-gray-100 italic font-black text-gray-200 text-[10px] flex items-center justify-center">→</div>
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-red-600 uppercase tracking-widest leading-none mb-1 text-center">New</span>
                       <span className="text-sm font-black text-red-600 uppercase bg-red-50 px-3 py-1 rounded-md shadow-inner tracking-widest">{request.newValue}</span>
                    </div>
                  </div>

                  {request.comments && request.comments.length > 0 && (
                     <div className="space-y-2 py-2 border-t border-gray-50">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Historical Context</p>
                        <div className="space-y-2">
                           {request.comments.map((c, i) => (
                             <div key={i} className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex justify-between items-center">
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
                      className="border-gray-100 text-xs h-9 bg-gray-50/50"
                      disabled={!canApprove(request)}
                    />
                  </div>
                </div>

                <div className="md:w-56 flex flex-col gap-2 justify-center border-l md:pl-6 border-gray-100">
                   {!canApprove(request) ? (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Status</p>
                         <p className="text-[10px] font-bold text-gray-500 uppercase leading-tight">
                            {request.stage === 'superadmin' ? 'Waiting for Triple-Admin Consensus' : 'Waiting for Final Owner Approval'}
                         </p>
                      </div>
                   ) : (
                      <>
                        <Button 
                          disabled={isProcessing[request._id]}
                          onClick={() => handleProcess(request._id, 'approved')}
                          className="bg-black hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] h-12 shadow-lg transition-all shadow-red-50"
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
