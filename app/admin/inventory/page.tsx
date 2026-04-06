"use client";

import { useEffect, useState } from "react";
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  Trash2, 
  ChevronRight, 
  Search,
  ArrowUpRight,
  RefreshCw,
  Box,
  PauseCircle
} from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/10 font-sans p-6 lg:p-12">
      {/* Header section with metrics highlights */}
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-12 h-1 bg-gray-900 rounded-full"></span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Read-Only Archive</span>
            </div>
            <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none">Stock Ledger</h1>
            <p className="text-gray-500 font-medium max-w-xl">View real-time physical stock and hold logs. <span className="text-red-600 font-black">Stock updates must be requested via the Product Engine.</span></p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="SEARCH PRODUCTS..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 pr-6 h-14 bg-white border-2 border-transparent focus:border-red-600 rounded-2xl shadow-sm outline-none text-[11px] font-bold uppercase transition-all w-64 lg:w-96"
                />
             </div>
             <button 
               onClick={fetchInventory}
               className="p-4 bg-white shadow-sm rounded-2xl border-2 border-transparent hover:border-red-600 transition-all text-gray-400 hover:text-red-600 group"
             >
               <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : "group-active:rotate-180 transition-transform duration-500"}`} />
             </button>
          </div>
        </div>

        {/* Global Stats Summary Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {[ 
             { label: "On Hold", value: products.reduce((acc, p) => acc + (p.variations ? p.variations.reduce((vAcc: number, v: any) => vAcc + (v.holdStock || 0), 0) : 0), 0), icon: PauseCircle, color: "text-amber-500", bg: "bg-amber-50" },
             { label: "Delivered", value: products.reduce((acc, p) => acc + (p.variations ? p.variations.reduce((vAcc: number, v: any) => vAcc + (v.deliveredCount || 0), 0) : 0), 0), icon: Truck, color: "text-emerald-500", bg: "bg-emerald-50" },
             { label: "Physical", value: products.reduce((acc, p) => acc + (p.variations ? p.variations.reduce((vAcc: number, v: any) => vAcc + (v.stock || 0), 0) : 0), 0), icon: Box, color: "text-blue-500", bg: "bg-blue-50" },
             { label: "Lost", value: products.reduce((acc, p) => acc + (p.variations ? p.variations.reduce((vAcc: number, v: any) => vAcc + (v.lostCount || 0), 0) : 0), 0), icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
             { label: "Damaged", value: products.reduce((acc, p) => acc + (p.variations ? p.variations.reduce((vAcc: number, v: any) => vAcc + (v.damagedCount || 0), 0) : 0), 0), icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50" }
           ].map((stat, i) => (
             <div key={i} className="p-5 bg-white shadow-sm rounded-3xl border border-gray-100 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2.5 ${stat.bg} ${stat.color} rounded-xl`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</span>
                  <span className="text-2xl font-black text-gray-900 tabular-nums leading-none tracking-tighter">{stat.value}</span>
                </div>
             </div>
           ))}
        </div>

        {/* Main Stock Table */}
        <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-xl shadow-gray-100/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 backdrop-blur-md">
                  <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">PRODUCT & SKU</th>
                  <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">WAREHOUSE FLOW</th>
                  <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">LOSS METRICS</th>
                  <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">SUPPLY LOG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="bg-white hover:bg-slate-50/50 transition-colors group">
                    <td className="p-8 min-w-[320px]">
                       <div className="flex items-center gap-5">
                          <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-sm border border-gray-50 group-hover:scale-105 transition-transform overflow-hidden relative">
                            <img 
                              src={product.variations?.[0]?.image || "/placeholder.svg"} 
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-red-600 uppercase tracking-[0.25em]">{product.brand || 'Parle'}</span>
                            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight leading-none">{product.name}</h3>
                            <div className="flex gap-2">
                               <span className="text-[9px] font-bold text-gray-400 uppercase bg-gray-50 px-2 py-0.5 rounded-md">{product.category}</span>
                               <a 
                                 href={`/admin/products/${product.slug}`}
                                 className="text-[9px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-md hover:bg-black hover:text-white transition-colors"
                               >
                                  EDIT →
                               </a>
                            </div>
                          </div>
                       </div>
                    </td>
                    <td colSpan={3} className="p-0">
                       <table className="w-full">
                          <tbody>
                            {product.variations?.map((v: any, vIdx: number) => (
                              <tr key={vIdx} className="border-t first:border-t-0 border-gray-50 hover:bg-white transition-colors">
                                <td className="p-8 w-1/4">
                                   <div className="flex flex-col gap-1.5">
                                      <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                                         {[v.weight, v.flavor].filter(Boolean).join(" ") || "STANDARD SKU"}
                                      </span>
                                      <div className="flex gap-3">
                                         <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Physical Free</span>
                                            <span className="text-sm font-black text-gray-900">{v.stock}</span>
                                         </div>
                                         <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">On Hold</span>
                                            <span className="text-sm font-black text-amber-500">{v.holdStock || 0}</span>
                                         </div>
                                      </div>
                                   </div>
                                </td>
                                
                                <td className="p-8 text-center w-1/5 border-l border-gray-50/50">
                                   <div className="flex flex-col items-center">
                                      <div className={`text-2xl font-black tabular-nums transition-colors ${v.stock > 10 ? 'text-emerald-600' : (v.stock > 0 ? 'text-amber-600' : 'text-red-500')}`}>
                                         {v.stock}
                                      </div>
                                      <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1 text-center leading-none">Ready for New Orders</div>
                                   </div>
                                </td>

                                <td className="p-8 w-1/5 border-l border-gray-50/50">
                                   <div className="flex flex-col gap-2">
                                      <MetricRow label="Hold" value={v.holdStock} color="amber" />
                                      <MetricRow label="Delivered" value={v.deliveredCount} color="emerald" />
                                      <MetricRow label="Damaged" value={v.damagedCount} color="rose" />
                                      <MetricRow label="Lost Item" value={v.lostCount} color="red" />
                                   </div>
                                </td>

                                <td className="p-8 w-1/5 border-l border-gray-50/50">
                                   <div className="flex flex-col gap-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                      {v.stockHistory && v.stockHistory.length > 0 ? (
                                        v.stockHistory.slice().reverse().map((log: any, lIdx: number) => (
                                          <div key={lIdx} className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col gap-0.5">
                                             <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black text-emerald-600">+{log.amount} Units</span>
                                                <span className="text-[7px] font-bold text-gray-400">{new Date(log.date).toLocaleDateString()}</span>
                                             </div>
                                             <span className="text-[7px] font-medium text-gray-500 uppercase leading-tight truncate">{log.reason || 'Restocked'}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-center py-2">
                                           <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest italic">No Supply Logs</span>
                                        </div>
                                      )}
                                   </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                       </table>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

function MetricRow({ label, value, color }: any) {
  const colors: any = {
    emerald: "text-emerald-600 bg-emerald-50",
    rose: "text-rose-600 bg-rose-50",
    red: "text-red-500 bg-red-50",
    amber: "text-amber-500 bg-amber-50"
  };
  return (
    <div className="flex justify-between items-center">
       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{label}</span>
       <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tabular-nums ${colors[color]}`}>{value || 0}</span>
    </div>
  );
}
