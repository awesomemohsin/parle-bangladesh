"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  Trash2, 
  ChevronRight, 
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
  Box,
  PauseCircle,
  X,
  ExternalLink,
  Info,
  LayoutGrid
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Drill-down states
  const [selectedMetric, setSelectedMetric] = useState<{
    product: any | null;
    variation: any | null;
    type: string;
    isGlobal?: boolean;
  } | null>(null);
  const [drillDownOrders, setDrillDownOrders] = useState<any[]>([]);
  const [loadingDrillDown, setLoadingDrillDown] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/auth/login');
        toast.error('Session expired. Please login again.');
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load inventory from server");
      }
      const data = await res.json();
      setProducts(data);
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Connection interrupted. Could not load ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchDrillDownOrders = async (product: any | null, variation: any | null, type: string) => {
    setLoadingDrillDown(true);
    try {
      let status = "all";
      if (type === 'hold' || type === 'On Hold') status = "processing,shipped,pending";
      else if (type === 'delivered' || type === 'Delivered') status = "delivered";
      else if (type === 'lost' || type === 'Lost') status = "lost";
      else if (type === 'damaged' || type === 'Damaged') status = "damaged";

      const params = new URLSearchParams();
      params.append('adminContext', 'true');
      if (product) params.append('productSlug', product.slug);
      if (variation?.weight) params.append('weight', variation.weight);
      if (variation?.flavor) params.append('flavor', variation.flavor);
      params.append('status', status);
      params.append('limit', '50');

      const res = await fetch(`/api/orders?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        let results = data.orders || [];
        
        // Client-side exact filter only if product was specified
        if (product) {
          results = results.filter((o: any) => 
            o.items.some((item: any) => 
              item.productSlug === product.slug &&
              ((!item.weight && !variation.weight) || (item.weight === variation.weight)) &&
              ((!item.flavor && !variation.flavor) || (item.flavor === variation.flavor) || (item.flavor === "" && !variation.flavor) || (!item.flavor && variation.flavor === ""))
            )
          );
        }
        setDrillDownOrders(results);
      }
    } catch (err) {
      console.error("Drill-down error:", err);
      toast.error("Failed to load order details");
    } finally {
      setLoadingDrillDown(false);
    }
  };

  useEffect(() => {
    if (selectedMetric) {
      fetchDrillDownOrders(selectedMetric.product, selectedMetric.variation, selectedMetric.type);
    } else {
      setDrillDownOrders([]);
    }
  }, [selectedMetric]);

  const getProductStock = (p: any) => {
    return p.variations ? p.variations.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) : 0;
  };

  const filteredProducts = products
    .filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "stock-high") return getProductStock(b) - getProductStock(a);
      if (sortBy === "stock-low") return getProductStock(a) - getProductStock(b);
      return 0;
    });

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
                    className="pl-12 pr-6 h-14 bg-white border-2 border-transparent focus:border-red-600 rounded-2xl shadow-sm outline-none text-[11px] font-bold uppercase transition-all w-48 lg:w-64"
                  />
               </div>
               
               <div className="relative group">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="pl-12 pr-6 h-14 bg-white border-2 border-transparent focus:border-red-600 rounded-2xl shadow-sm outline-none text-[10px] font-black uppercase transition-all w-48 lg:w-56 appearance-none cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name-asc">A to Z</option>
                    <option value="name-desc">Z to A</option>
                    <option value="stock-high">Stock: High to Low</option>
                    <option value="stock-low">Stock: Low to High</option>
                  </select>
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
             <div 
               key={i} 
               className={`p-5 bg-white shadow-sm rounded-3xl border border-gray-100 transition-all hover:shadow-md ${stat.label !== 'Physical' ? 'cursor-pointer hover:border-red-200 group/stat' : ''}`}
               onClick={() => stat.label !== 'Physical' && stat.value > 0 && setSelectedMetric({ product: null, variation: null, type: stat.label, isGlobal: true })}
             >
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2.5 ${stat.bg} ${stat.color} rounded-xl group-hover/stat:scale-110 transition-transform`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-gray-900 tabular-nums leading-none tracking-tighter">{stat.value}</span>
                    {stat.label !== 'Physical' && stat.value > 0 && (
                      <ArrowUpRight className="w-3 h-3 text-red-600 opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
             </div>
           ))}
        </div>

          {/* Main Stock Table */}
        <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-xl shadow-gray-100/40">
          {error ? (
            <div className="py-20 flex flex-col items-center justify-center gap-6 text-center">
               <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                  <AlertTriangle className="w-8 h-8" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase">Ledger Sync Error</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{error}</p>
               </div>
               <button 
                 onClick={fetchInventory}
                 className="bg-black hover:bg-red-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
               >
                 Re-establish Connection
               </button>
            </div>
          ) : (
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
              <tbody className="divide-y-8 divide-red-50/50">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="bg-white hover:bg-red-50/10 transition-colors group">
                    <td className="p-8 min-w-[320px] align-top border-r border-red-100/50">
                       <div className="flex items-center gap-5">
                          <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-sm border border-red-50 group-hover:scale-105 transition-transform overflow-hidden relative">
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
                       <table className="w-full border-collapse">
                          <tbody>
                            {product.variations?.map((v: any, vIdx: number) => (
                              <tr key={vIdx} className="border-t border-red-100/30 hover:bg-red-50/20 transition-colors">
                                <td className="p-8 w-1/4">
                                   <div className="flex flex-col gap-1.5">
                                      <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest bg-red-50/50 w-fit px-2 py-0.5 rounded border border-red-100/50">
                                         {[v.weight, v.flavor].filter(Boolean).join(" ") || "STANDARD SKU"}
                                      </span>
                                      <div className="flex gap-3">
                                         <div className="flex flex-col cursor-help" title="Physical stock ready to sell">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Physical Free</span>
                                            <span className="text-sm font-black text-gray-900">{v.stock}</span>
                                         </div>
                                         <div 
                                           className="flex flex-col cursor-pointer group/hold hover:bg-amber-100/50 p-1 rounded-md transition-colors"
                                           onClick={() => v.holdStock > 0 && setSelectedMetric({ product, variation: v, type: 'hold' })}
                                         >
                                            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter group-hover/hold:underline">On Hold</span>
                                            <span className="text-sm font-black text-amber-500">{v.holdStock || 0}</span>
                                         </div>
                                      </div>
                                   </div>
                                </td>
                                
                                <td className="p-8 text-center w-1/5 border-l border-red-100/30">
                                   <div className="flex flex-col items-center">
                                      <div className={`text-2xl font-black tabular-nums transition-colors ${v.stock > 10 ? 'text-emerald-600' : (v.stock > 0 ? 'text-amber-600' : 'text-red-500')}`}>
                                         {v.stock}
                                      </div>
                                      <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1 text-center leading-none">Ready for New Orders</div>
                                   </div>
                                </td>
                                <td className="p-8 w-1/5 border-l border-red-100/30">
                                   <div className="flex flex-col gap-2">
                                      <MetricRow 
                                        label="Hold" 
                                        value={v.holdStock} 
                                        color="amber" 
                                        onClick={() => v.holdStock > 0 && setSelectedMetric({ product, variation: v, type: 'hold' })}
                                      />
                                      <MetricRow 
                                        label="Delivered" 
                                        value={v.deliveredCount} 
                                        color="emerald" 
                                        onClick={() => v.deliveredCount > 0 && setSelectedMetric({ product, variation: v, type: 'delivered' })}
                                      />
                                      <MetricRow 
                                        label="Damaged" 
                                        value={v.damagedCount} 
                                        color="rose" 
                                        onClick={() => v.damagedCount > 0 && setSelectedMetric({ product, variation: v, type: 'damaged' })}
                                      />
                                      <MetricRow 
                                        label="Lost Item" 
                                        value={v.lostCount} 
                                        color="red" 
                                        onClick={() => v.lostCount > 0 && setSelectedMetric({ product, variation: v, type: 'lost' })}
                                      />
                                   </div>
                                </td>
                                <td className="p-8 w-1/5 border-l border-red-100/30">
                                   <div className="flex flex-col gap-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                      {v.stockHistory && v.stockHistory.length > 0 ? (
                                        v.stockHistory.slice().reverse().map((log: any, lIdx: number) => (
                                          <div key={lIdx} className="bg-slate-50 p-2 rounded-lg border border-red-100/20 flex flex-col gap-0.5 shadow-[0_2px_4px_rgba(220,38,38,0.02)]">
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
          )}
        </div>
      </div>

      {/* Drill-down Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300">
           <Card className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg">
                       {(selectedMetric.type === 'hold' || selectedMetric.type === 'On Hold') && <PauseCircle className="w-7 h-7" />}
                       {(selectedMetric.type === 'delivered' || selectedMetric.type === 'Delivered') && <Truck className="w-7 h-7" />}
                       {(selectedMetric.type === 'lost' || selectedMetric.type === 'Lost') && <Trash2 className="w-7 h-7" />}
                       {(selectedMetric.type === 'damaged' || selectedMetric.type === 'Damaged') && <AlertTriangle className="w-7 h-7" />}
                    </div>
                    <div>
                       <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                          {selectedMetric.isGlobal ? `Global ${selectedMetric.type}` : selectedMetric.type} Audit Logs
                       </h2>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                          {selectedMetric.isGlobal ? (
                            <span className="flex items-center gap-2"><LayoutGrid className="w-3 h-3" /> Showing items from ALL products</span>
                          ) : (
                            <span>{selectedMetric.product.name} • {[selectedMetric.variation.weight, selectedMetric.variation.flavor].filter(Boolean).join(" ")}</span>
                          )}
                       </p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setSelectedMetric(null)}
                   className="p-3 hover:bg-gray-200 rounded-full transition-colors"
                 >
                    <X className="w-6 h-6 text-gray-400" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                 {loadingDrillDown ? (
                   <div className="h-64 flex flex-col items-center justify-center gap-4 text-gray-400">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Querying System Ledger...</span>
                   </div>
                 ) : drillDownOrders.length > 0 ? (
                   <div className="space-y-4">
                      {drillDownOrders.map((order: any, idx: number) => {
                        // Find relevant items in the order
                        const relevantItems = selectedMetric.isGlobal 
                          ? order.items 
                          : order.items.filter((i: any) => 
                              i.productSlug === selectedMetric.product.slug &&
                              ((!i.weight && !selectedMetric.variation.weight) || (i.weight === selectedMetric.variation.weight)) &&
                              ((!i.flavor && !selectedMetric.variation.flavor) || (i.flavor === selectedMetric.variation.flavor) || (i.flavor === "" && !selectedMetric.variation.flavor) || (!i.flavor && selectedMetric.variation.flavor === ""))
                            );

                        if (relevantItems.length === 0 && !selectedMetric.isGlobal) return null;

                        return (
                          <div key={order.id || idx} className="p-6 rounded-[32px] border border-gray-100 hover:border-red-200 hover:bg-red-50/5 transition-all group flex flex-col gap-4">
                             <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                   <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Order ID</span>
                                      <span className="text-sm font-black text-gray-900 tabular-nums">#{order.id?.slice(-8).toUpperCase()}</span>
                                   </div>
                                   <div className="w-px h-8 bg-gray-100"></div>
                                   <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Customer</span>
                                      <span className="text-xs font-bold text-gray-700">{order.customerName}</span>
                                   </div>
                                   <div className="w-px h-8 bg-gray-100"></div>
                                   <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Status</span>
                                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest px-2 py-0.5 bg-red-50 rounded-md">{order.status}</span>
                                   </div>
                                </div>

                                <div className="flex items-center gap-6">
                                   <div className="text-right flex flex-col">
                                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Items</span>
                                      <div className="text-xl font-black text-gray-900 leading-none">×{relevantItems.reduce((acc: number, cur: any) => acc + cur.quantity, 0)}</div>
                                   </div>
                                   <button 
                                     onClick={() => router.push(`/admin/orders?q=${order.id}`)}
                                     className="w-12 h-12 bg-gray-50 group-hover:bg-red-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm"
                                   >
                                      <ArrowUpRight className="w-6 h-6" />
                                   </button>
                                </div>
                             </div>

                             {/* Item detail list in the order */}
                             <div className="bg-gray-50/50 rounded-2xl p-4 flex flex-col gap-2">
                                {relevantItems.map((ri: any, riIdx: number) => (
                                  <div key={riIdx} className="flex justify-between items-center border-b border-white/50 last:border-0 pb-2 last:pb-0">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">
                                           {ri.quantity}
                                        </div>
                                        <div>
                                           <p className="text-[11px] font-black text-gray-900 uppercase leading-none">{ri.name}</p>
                                           <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">{ri.weight} • {ri.flavor || 'Original'}</p>
                                        </div>
                                     </div>
                                     <span className="text-[10px] font-black text-gray-900 italic">৳{(ri.price * ri.quantity).toFixed(0)}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                        );
                      })}
                   </div>
                 ) : (
                   <div className="h-64 flex flex-col items-center justify-center gap-6 text-center text-gray-400 grayscale opacity-50">
                      <Box className="w-16 h-16 stroke-1" />
                      <div>
                        <h4 className="text-base font-black text-gray-900 uppercase tracking-tighter">No Linked Orders Found</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-1">No orders currently match this global status criteria.</p>
                      </div>
                   </div>
                 )}
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <Info className="w-4 h-4 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                       {selectedMetric.isGlobal ? "Global summary across all products" : "Variation-specific drill-down"}
                    </span>
                 </div>
                 <Button 
                   onClick={() => setSelectedMetric(null)}
                   variant="outline"
                   className="rounded-2xl font-black text-[10px] uppercase tracking-widest h-12 px-8"
                 >
                    Close Ledger
                 </Button>
              </div>
           </Card>
        </div>
      )}

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

function MetricRow({ label, value, color, onClick }: any) {
  const colors: any = {
    emerald: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100",
    rose: "text-rose-600 bg-rose-50 hover:bg-rose-100",
    red: "text-red-500 bg-red-50 hover:bg-red-100",
    amber: "text-amber-500 bg-amber-50 hover:bg-amber-100"
  };
  
  const isClickable = (value || 0) > 0;

  return (
    <div 
      className={`flex justify-between items-center p-1 rounded-lg transition-colors ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={onClick}
    >
       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{label}</span>
       <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tabular-nums transition-all ${colors[color]} ${isClickable ? 'scale-100 group-hover:scale-110' : ''}`}>
         {value || 0}
       </span>
    </div>
  );
}
