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
  targetSlug?: string
  field: string
  oldValue: string
  newValue: string
  weight?: string
  flavor?: string
  variationIndex?: number
  status: string
  ownerComment?: string
  createdAt: string
}

export default function ProductApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [ownerComment, setOwnerComment] = useState<{ [key: string]: string }>({})
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/approvals?type=product&status=pending', {
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
          ownerComment: ownerComment[id] || "" 
        })
      })

      if (response.ok) {
        setRequests(requests.filter(r => r._id !== id))
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Product Approvals</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Owner Authorization Terminal</p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Querying Pending Requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-gray-100">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No pending product changes require authorization</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map(request => (
            <Card key={request._id} className="p-6 border-2 border-gray-50 shadow-sm relative overflow-hidden group">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black text-white px-2 py-1 rounded uppercase tracking-wider ${request.field === 'price' ? 'bg-green-600' : 'bg-amber-500'}`}>
                      {request.field} change
                    </span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Requested by: {request.requesterEmail}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none">
                      {request.targetSlug ? (
                         <a href={`/products/${request.targetSlug}`} target="_blank" className="hover:text-red-600 transition-colors underline decoration-gray-200 decoration-2 underline-offset-4">
                           {request.targetName}
                         </a>
                      ) : request.targetName}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        {request.weight || "N/A"} • {request.flavor || "N/A"}
                      </p>
                      <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest flex items-center">
                        Variation #{request.variationIndex}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-6 py-3 px-4 rounded-xl border-2 ${request.field === 'price' ? 'border-green-50 bg-green-50/10' : 'border-amber-50 bg-amber-50/10'}`}>
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Current {request.field}</span>
                       <span className="text-lg font-black text-gray-300 line-through">
                         {request.field === 'price' && "৳"}{request.oldValue}
                       </span>
                    </div>
                    <div className="w-8 h-px bg-gray-200 italic font-black text-gray-200 text-[10px] flex items-center justify-center">→</div>
                    <div className="flex flex-col">
                       <span className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 ${request.field === 'price' ? 'text-green-600' : 'text-amber-600'}`}>
                         Proposed {request.field}
                       </span>
                       <span className={`text-lg font-black tracking-tighter italic ${request.field === 'price' ? 'text-green-600' : 'text-amber-600'}`}>
                         {request.field === 'price' && "৳"}{request.newValue}
                       </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Review Comment (Optional)</label>
                    <Input 
                      placeholder="Add reason for approval or decline..."
                      value={ownerComment[request._id] || ""}
                      onChange={(e) => setOwnerComment(prev => ({ ...prev, [request._id]: e.target.value }))}
                      className="border-gray-100 text-xs h-9 bg-gray-50/50"
                    />
                  </div>
                </div>

                <div className="md:w-48 flex flex-col gap-2 justify-center border-l md:pl-6 border-gray-100">
                   <Button 
                     disabled={isProcessing[request._id]}
                     onClick={() => handleProcess(request._id, 'approved')}
                     className="bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-[10px] h-10 shadow-lg shadow-green-100"
                   >
                     {isProcessing[request._id] ? "Processing..." : "Approve Change"}
                   </Button>
                   <Button 
                     disabled={isProcessing[request._id]}
                     onClick={() => handleProcess(request._id, 'declined')}
                     className="bg-gray-200 hover:bg-red-600 hover:text-white text-gray-500 font-black uppercase tracking-widest text-[10px] h-10 transition-all"
                   >
                     Decline Request
                   </Button>
                   <p className="text-[8px] text-gray-300 font-bold uppercase tracking-tighter text-center mt-2">
                     Received: {new Date(request.createdAt).toLocaleString()}
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
