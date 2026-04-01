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
  ownerComment?: string
  createdAt: string
}

export default function OrderApprovalsPage() {
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
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Order Approvals</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Owner Authorization Terminal</p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Querying Pending Requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-gray-100">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No pending order status changes require authorization</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map(request => (
            <Card key={request._id} className="p-6 border-2 border-gray-50 shadow-sm relative overflow-hidden group">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-white bg-black px-2 py-1 rounded uppercase tracking-wider">
                      {request.field} change
                    </span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Requested by: {request.requesterEmail}
                    </span>
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
                       <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Old Status</span>
                       <span className="text-sm font-black text-gray-400 uppercase bg-gray-50 px-2 py-1 rounded-md shadow-inner">{request.oldValue}</span>
                    </div>
                    <div className="w-8 h-px bg-gray-100 italic font-black text-gray-200 text-[10px] flex items-center justify-center">→</div>
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-red-600 uppercase tracking-widest leading-none mb-1">Proposed Status</span>
                       <span className="text-sm font-black text-red-600 uppercase bg-red-50 px-2 py-1 rounded-md shadow-inner tracking-widest">{request.newValue}</span>
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
                     className="bg-red-600 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] h-10 shadow-lg shadow-red-50"
                   >
                     {isProcessing[request._id] ? "Processing..." : "Authorize Change"}
                   </Button>
                   <Button 
                     disabled={isProcessing[request._id]}
                     onClick={() => handleProcess(request._id, 'declined')}
                     className="bg-gray-200 hover:bg-gray-800 hover:text-white text-gray-500 font-black uppercase tracking-widest text-[10px] h-10 transition-all font-bold"
                   >
                     Decline Status Change
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
