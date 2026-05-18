"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Download, ShieldCheck, HelpCircle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
}

interface Batch {
  _id: string;
  productId: string;
  productName: string;
  count: number;
  generatedBy: string;
  createdAt: string;
}

interface User {
  email: string;
  name?: string;
  role: string;
}

export default function VerifyCodesAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [count, setCount] = useState<number>(100);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    // 1. Authorization check
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.email === "mdmohsin.work@gmail.com") {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } else {
      setIsAuthorized(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized === true) {
      fetchData();
    }
  }, [isAuthorized]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [prodRes, batchRes] = await Promise.all([
        fetch("/api/products?limit=100"),
        fetch("/api/admin/verify-codes", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        setBatches(batchData.batches || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      toast.error("Failed to load verification logs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }
    if (!count || count <= 0 || count > 5000) {
      toast.error("Please enter a valid amount between 1 and 5000");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmGeneration = async () => {
    setShowConfirmModal(false);
    setIsGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/verify-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: selectedProductId,
          count,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully generated ${count} authentic codes!`);
        setSelectedProductId("");
        setCount(100);
        
        // Refresh batches history log
        fetchData();

        // Automatically trigger CSV download of newly generated codes
        downloadCSV(data.batch.productName, data.codes);
      } else {
        toast.error(data.error || "Failed to generate codes");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadBatch = async (batchId: string, productName: string) => {
    setDownloadingBatchId(batchId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/verify-codes/download?batchId=${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const codesList = data.codes.map((c: any) => c.code);
        downloadCSV(productName, codesList);
        toast.success("Codes downloaded successfully!");
      } else {
        toast.error(data.error || "Failed to retrieve codes");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error retrieving batch codes");
    } finally {
      setDownloadingBatchId(null);
    }
  };

  const downloadCSV = (productName: string, codes: string[]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Product Name,Verification Code", ...codes.map(c => `"${productName}","${c}"`)].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const cleanProdName = productName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    link.setAttribute("download", `verify-codes-${cleanProdName}-${Date.now()}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isAuthorized === false) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 bg-slate-50 font-sans">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100 shadow-sm mb-4">
          <svg className="w-8 h-8 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">404 - Page Not Found</h1>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">The page you are looking for does not exist.</p>
        <Button onClick={() => router.push("/admin/dashboard")} className="mt-6 bg-gray-900 text-white hover:bg-black rounded-xl font-bold uppercase text-[10px] tracking-widest py-3">Back to Control Panel</Button>
      </div>
    );
  }

  if (isAuthorized === null || isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 bg-slate-50 font-sans">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-4">Piping Authentication Center...</p>
      </div>
    );
  }

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-white/5 shadow-xl text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase leading-none">Product Authenticity</h1>
              <p className="text-[9px] font-black uppercase text-emerald-400 tracking-[0.2em] mt-1.5">Anti-Counterfeiting Code Console</p>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Superadmin Mode Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Generator Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 bg-white rounded-[2rem] border-gray-100 shadow-xl shadow-slate-200/50 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center gap-2 border-b pb-4">
                <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">Generate Verification Set</h2>
              </div>

              <form onSubmit={handleGenerateClick} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Target Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-[10px] font-black uppercase text-gray-600 border-2 border-gray-50 rounded-lg bg-white focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">Select Target Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Quantity to Generate</label>
                  <input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    min={1}
                    max={5000}
                    required
                    className="w-full h-10 px-3 text-[10px] font-black uppercase text-gray-600 border-2 border-gray-50 rounded-lg bg-white focus:border-emerald-500 outline-none transition-all"
                  />
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider ml-1 mt-1">Recommended: 100 - 1000 codes per batch</p>
                </div>

                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full h-12 bg-emerald-500 text-white hover:bg-black font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-none transition-all"
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Secure Codes...</span>
                    </div>
                  ) : (
                    "Initialize Codes"
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* History Logs Table */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-white rounded-[2rem] border-gray-100 shadow-xl shadow-slate-200/50 space-y-6 overflow-hidden">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                  <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">History & Generation Logs</h2>
                </div>
                <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 tracking-widest uppercase">
                  {batches.length} Batches Generated
                </span>
              </div>

              {batches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[1.5rem] border border-dashed border-gray-200">
                  <HelpCircle className="w-10 h-10 text-gray-300" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3">No codes have been generated yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                        <th className="py-3 px-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Count</th>
                        <th className="py-3 px-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Generated By</th>
                        <th className="py-3 px-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                        <th className="py-3 px-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => (
                        <tr key={batch._id} className="border-b border-gray-50 hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-4 font-black text-xs text-gray-900 uppercase tracking-tight italic">
                            {batch.productName}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-md">
                              {batch.count}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-tight">
                            {batch.generatedBy}
                          </td>
                          <td className="py-4 px-4 text-xs font-bold text-gray-400">
                            {new Date(batch.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Button
                              onClick={() => handleDownloadBatch(batch._id, batch.productName)}
                              disabled={downloadingBatchId !== null}
                              variant="outline"
                              className="h-8 px-3 text-[9px] font-black uppercase text-emerald-600 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-600 hover:text-white rounded-lg transition-all flex items-center gap-1.5 ml-auto"
                            >
                              {downloadingBatchId === batch._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>CSV</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white rounded-[2rem] border-none shadow-2xl relative animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Confirm Code Generation</h3>
            </div>

            <div className="py-5 space-y-3 text-xs text-gray-500 font-bold uppercase tracking-wide leading-relaxed">
              <p>You are initializing cryptographically secure verification codes for packaging and authenticity:</p>
              
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-gray-600 font-black">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="text-gray-900 italic">{selectedProduct?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span className="text-emerald-600">{count} codes</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-[10px]">
                  <span>Authorized By:</span>
                  <span className="text-gray-900">{user?.email}</span>
                </div>
              </div>
              
              <p className="text-[10px] text-amber-500 italic mt-2">Note: This action will insert {count} unique keys into the database immediately. Confirm to proceed.</p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="ghost"
                className="h-10 px-4 rounded-xl text-gray-400 hover:text-gray-900 font-black uppercase text-[10px] tracking-widest"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmGeneration}
                className="h-10 px-6 rounded-xl bg-emerald-500 text-white hover:bg-black font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/10"
              >
                Confirm & Generate
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
