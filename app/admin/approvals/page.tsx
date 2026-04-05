'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ApprovalDashboardPage() {
  const [stats, setStats] = useState({ products: 0, orders: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [prodRes, orderRes] = await Promise.all([
          fetch('/api/approvals?type=product&status=pending', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          fetch('/api/approvals?type=order&status=pending', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        ])
        const prodData = await prodRes.json()
        const orderData = await orderRes.json()
        setStats({ products: prodData.requests?.length || 0, orders: orderData.requests?.length || 0 })
      } catch (e) {}
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Consensus Control</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Multi-Tier Identity Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link href="/admin/approvals/products">
           <Card className="p-8 border-2 border-gray-100 hover:border-black transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full -translate-y-12 translate-x-12 scale-150 transition-transform group-hover:scale-[2] duration-500"></div>
              <div className="space-y-4 relative z-10">
                 <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-1 rounded tracking-widest">Inventory Level</span>
                    <span className="text-4xl font-black text-gray-900">{stats.products}</span>
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase">Product Changes</h2>
                    <p className="text-gray-400 text-xs font-medium leading-relaxed italic">Requires Anindo, Saiful, and Razu's triple consensus for Price & Stock adjustments.</p>
                 </div>
                 <div className="flex items-center gap-2 text-gray-300 group-hover:text-black transition-colors font-black text-[9px] uppercase tracking-widest pt-4">
                    Enter Verification Terminal →
                 </div>
              </div>
           </Card>
        </Link>

        <Link href="/admin/approvals/orders">
           <Card className="p-8 border-2 border-gray-100 hover:border-black transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-black/5 rounded-full -translate-y-12 translate-x-12 scale-150 transition-transform group-hover:scale-[2] duration-500"></div>
              <div className="space-y-4 relative z-10">
                 <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase text-black bg-gray-100 px-2 py-1 rounded tracking-widest">Operations Level</span>
                    <span className="text-4xl font-black text-gray-900">{stats.orders}</span>
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase">Order Statuses</h2>
                    <p className="text-gray-400 text-xs font-medium leading-relaxed italic">Restricted status modifications requiring triple-user consensus.</p>
                 </div>
                 <div className="flex items-center gap-2 text-gray-300 group-hover:text-black transition-colors font-black text-[9px] uppercase tracking-widest pt-4">
                    Enter Verification Terminal →
                 </div>
              </div>
           </Card>
        </Link>
      </div>

      <Card className="p-8 border-2 border-gray-50 bg-gray-50/20 rounded-2xl relative overflow-hidden">
         <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center font-black text-2xl shadow-xl">!</div>
            <div className="space-y-1">
               <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Security Protocol Enforcement</h3>
               <p className="text-gray-500 text-xs leading-relaxed max-w-2xl">All product modifications regarding pricing or stock levels initiated by general admins are held in temporary storage. No changes are applied to the live database until Anindo, Saiful (Superadmins), and Razu (Owner) have provided individual digital signatures.</p>
            </div>
         </div>
      </Card>
    </div>
  )
}
