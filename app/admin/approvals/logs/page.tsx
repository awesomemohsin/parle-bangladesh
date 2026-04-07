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
  superadminApprovals?: string[]
  ownerApproved?: boolean
  ownerEmail?: string
  ownerComment?: string
  targetDetails?: any
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
    if (!confirm("Are you sure you want to REVERT this action? Data will be restored and request returned to pending.")) return;
    
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
        alert("Action reverted.")
      }
    } catch (err) {} finally {
      setIsProcessing(prev => ({ ...prev, [id]: false }))
    }
  }

  const isUndoable = (updatedAt: string) => {
    const diffHours = (new Date().getTime() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Auth <span className="text-red-600">Audit Logs</span></h1>
        <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[9px]">Historical Authorization & Consent Trail</p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Querying Registry...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Archive Empty</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {requests.map(request => (
            <Card key={request._id} className={`p-6 border-2 shadow-xl relative overflow-hidden group transition-all rounded-[2rem] ${request.status === 'approved' ? 'border-emerald-50 bg-white' : 'border-rose-50 bg-rose-50/5'}`}>
              <div className="flex flex-col lg:flex-row justify-between gap-8">
                <div className="flex-1 space-y-5">
                  
                  {/* Badge & Status Meta */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-[9px] font-black text-white px-3 py-1 rounded-full uppercase tracking-widest ${request.status === 'approved' ? 'bg-emerald-600 shadow-lg shadow-emerald-200' : 'bg-rose-600 shadow-lg shadow-rose-200'}`}>
                      {request.status}
                    </span>
                    <span className={`text-[9px] font-black text-white px-3 py-1 rounded-full uppercase tracking-widest ${request.type === 'order' ? 'bg-indigo-600 shadow-lg shadow-indigo-200' : (request.field === 'price' ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-amber-500 shadow-lg shadow-amber-200')}`}>
                       {request.type === 'order' ? 'Order' : `${request.field}`} Update
                    </span>
                    <div className="h-4 w-px bg-gray-100 mx-1"></div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter italic">
                       UID: {request._id.slice(-6)}
                    </span>
                  </div>

                  {/* Header: Name and Primary Context */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${request.type === 'order' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                       <span className="text-lg font-black">{request.type === 'order' ? 'O' : 'P'}</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mb-2">
                          {request.type === 'order' ? `Order: ${request.targetName}` : request.targetName}
                        </h3>
                        {request.type === 'order' && request.targetDetails ? (
                           <div className="flex flex-wrap gap-2">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-lg">
                                 {request.targetDetails.customerName}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                                 {request.targetDetails.customerPhone}
                              </span>
                           </div>
                        ) : (
                           <div className="flex flex-wrap gap-2">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg">
                                 {request.weight || "Standard Weight"}
                              </span>
                              {request.flavor && (
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg">
                                   {request.flavor} Flavor
                                </span>
                              )}
                           </div>
                        )}
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-3">
                           Requested by <span className="text-gray-900 italic lowercase">{request.requesterEmail}</span>
                        </p>
                    </div>
                  </div>

                  {/* Detail Context Area (Order Items or Transition) */}
                  <div className={`rounded-[1.5rem] border overflow-hidden ${request.status === 'approved' ? 'border-emerald-100 bg-emerald-50/5' : 'border-rose-100 bg-rose-50/5'}`}>
                    {request.type === 'order' && request.targetDetails?.items ? (
                      <div className="p-4 space-y-3">
                         <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Order Compilation</div>
                         <div className="grid grid-cols-1 gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                            {request.targetDetails.items.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{item.name}</span>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{item.weight} • {item.flavor || 'Original'}</span>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[10px] font-black text-gray-900">x{item.quantity}</span>
                                    <p className="text-[9px] font-bold text-indigo-600">৳{item.price * item.quantity}</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                         <div className="pt-2 border-t border-gray-100 flex justify-between items-center px-1">
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">Transition: {request.oldValue} → {request.newValue}</span>
                            <span className="text-[10px] font-black text-gray-900">Total: ৳{request.targetDetails.total}</span>
                         </div>
                      </div>
                    ) : (
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-6">
                        <div className="flex-1 flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-60 italic text-center sm:text-left">Legacy</span>
                              <span className="text-sm font-black text-gray-400 line-through tracking-tighter">
                                {request.field === 'price' && "৳"}{request.oldValue}
                              </span>
                            </div>
                            <div className="text-gray-200 font-transparent shrink-0">→</div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-60 italic text-center sm:text-left">Live</span>
                              <span className={`text-base font-black tracking-tighter italic ${request.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {request.field === 'price' && "৳"}{request.newValue}
                              </span>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 items-center border-t sm:border-t-0 sm:border-l border-white md:pl-4 pt-4 sm:pt-0">
                           <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mr-2">Authorization:</span>
                           <SignatureBadge name="Anindo" status={request.status === 'approved' || request.superadminApprovals?.includes('anindo')} />
                           <SignatureBadge name="Saiful" status={request.status === 'approved' || request.superadminApprovals?.includes('saiful')} />
                           {['price', 'stock'].includes(request.field) && <SignatureBadge name="Razu" status={request.status === 'approved' || request.superadminApprovals?.includes('razu')} />}
                           <SignatureBadge name="Owner" status={request.ownerApproved} />
                        </div>
                      </div>
                    )}
                  </div>

                  {request.declinedBy && (
                    <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                           <span className="text-rose-600 font-black text-xs">!</span>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Termination Recorded</p>
                           <p className="text-xs font-bold text-rose-900 tracking-tight italic">
                              Denied by <span className="uppercase font-black">{request.declinedBy}</span>
                           </p>
                        </div>
                    </div>
                  )}

                  {request.ownerComment && (
                    <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-dashed border-slate-200">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Authoritative Note</div>
                        <p className="text-[11px] font-bold text-slate-600 italic leading-relaxed">"{request.ownerComment}"</p>
                    </div>
                  )}
                </div>

                {/* Meta Sidebar */}
                <div className="lg:w-48 flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-slate-50 lg:pl-8 pt-6 lg:pt-0">
                   <div className="text-center lg:text-left space-y-1 mb-4">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Stamp Date</p>
                      <p className="text-[11px] text-gray-900 font-bold tracking-tight">
                        {new Date(request.updatedAt).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium tabular-nums">
                        {new Date(request.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                   </div>

                   {isUndoable(request.updatedAt) && request.status === 'approved' && (
                     <Button 
                       disabled={isProcessing[request._id]}
                       onClick={() => handleUndo(request._id)}
                       className="bg-gray-950 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[9px] h-11 rounded-xl shadow-xl hover:shadow-red-200 transition-all active:scale-95"
                     >
                       {isProcessing[request._id] ? "Processing..." : "Revert Action"}
                     </Button>
                   )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function SignatureBadge({ name, status }: { name: string, status?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${status ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
       <div className={`w-1.5 h-1.5 rounded-full ${status ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
       <span className="text-[9px] font-black uppercase tracking-tighter">{name}</span>
    </div>
  )
}
