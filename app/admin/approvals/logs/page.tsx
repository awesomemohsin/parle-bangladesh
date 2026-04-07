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
  declinedBy?: string
  ownerEmail?: string
  ownerComment?: string
  createdAt: string
  updatedAt: string
}

export default function ApprovalLogsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      // Fetch all (including approved/declined)
      const response = await fetch('/api/approvals?status=all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests.filter((r: ApprovalRequest) => r.status !== 'pending') || [])
      }
    } catch (err) {
      console.error('Fetch requests error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUndo = async (id: string) => {
    if (!confirm("Are you sure you want to UNDO this action? This will revert the live data and return the request to pending.")) return;
    
    setIsProcessing(prev => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`/api/approvals/${id}/undo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        setRequests(requests.filter(r => r._id !== id))
        alert("Action undone successfully. The request is now back in the approval list.")
      } else {
        const data = await response.json()
        alert(data.error || "Failed to undo action")
      }
    } catch (err) {
      console.error('Undo error:', err)
    } finally {
      setIsProcessing(prev => ({ ...prev, [id]: false }))
    }
  }

  const isUndoable = (updatedAt: string) => {
    const now = new Date();
    const processedAt = new Date(updatedAt);
    const diffHours = (now.getTime() - processedAt.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Approval History Logs</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Historical Authorization Audit Trail</p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Querying Audit Trail...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-gray-100">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No processed approval logs found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map(request => (
            <Card key={request._id} className={`p-4 border-2 shadow-sm relative overflow-hidden group transition-all ${request.status === 'approved' ? 'border-green-100 bg-green-50/5' : 'border-red-100 bg-red-50/5'}`}>
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-[8px] font-black text-white px-2 py-0.5 rounded uppercase tracking-wider ${request.status === 'approved' ? 'bg-green-600' : 'bg-red-600'}`}>
                      {request.status}
                    </span>
                    <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded uppercase tracking-widest ${request.field === 'price' ? 'bg-green-600' : 'bg-amber-500'}`}>
                       {request.field}
                    </span>
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter italic">
                        {request.status === 'declined' 
                          ? `Declined by ${request.declinedBy || 'Admin'}` 
                          : `Approved by Consensus (Anindo & Saiful${request.field === 'price' || request.field === 'stock' ? ' & Razu' : ''})`
                        }
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none mb-1">
                      {request.targetSlug ? (
                        <a href={`/products/${request.targetSlug}`} target="_blank" className="hover:text-red-600 transition-colors">
                          {request.targetName}
                        </a>
                      ) : request.targetName}
                    </h3>
                    <div className="flex gap-2">
                      <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded">
                        {request.weight || "N/A"} • {request.flavor || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 py-2 px-3 rounded-lg border ${request.field === 'price' ? 'border-green-50 bg-green-50/10' : 'border-amber-50 bg-amber-50/10'}`}>
                    <div className="flex flex-col">
                       <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">FROM</span>
                       <span className="text-xs font-black text-gray-300 line-through">
                         {request.field === 'price' && "৳"}{request.oldValue}
                       </span>
                    </div>
                    <div className="w-6 h-px bg-gray-100 italic font-black text-gray-200 text-[8px] flex items-center justify-center">→</div>
                    <div className="flex flex-col">
                       <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">TO</span>
                       <span className={`text-xs font-black tracking-tighter italic ${request.field === 'price' ? 'text-green-600' : 'text-amber-600'}`}>
                         {request.field === 'price' && "৳"}{request.newValue}
                       </span>
                    </div>
                  </div>

                  {request.ownerComment && (
                    <div className="bg-gray-50 p-2 rounded border border-gray-100 italic text-[10px] text-gray-500">
                        "{request.ownerComment}"
                    </div>
                  )}
                </div>

                <div className="md:w-32 flex flex-col gap-2 justify-center border-l md:pl-4 border-gray-100">
                   {isUndoable(request.updatedAt) && (
                     <Button 
                       disabled={isProcessing[request._id]}
                       onClick={() => handleUndo(request._id)}
                       className="bg-black hover:bg-red-600 text-white font-black uppercase tracking-widest text-[8px] h-8 shadow-md"
                     >
                       {isProcessing[request._id] ? "..." : "Undo Action"}
                     </Button>
                   )}
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter text-center">
                     Processed {new Date(request.updatedAt).toLocaleString()}
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
