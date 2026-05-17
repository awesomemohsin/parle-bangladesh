"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  Package, 
  Search, 
  Filter, 
  ArrowLeft,
  Calendar,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StockLogsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [admin, setAdmin] = useState("");
  const [date, setDate] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalReplenishments, setTotalReplenishments] = useState(0);
  const [totalDeductions, setTotalDeductions] = useState(0);
  const limit = 20;

  const fetchLogs = async (pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", String(pageNum));
      params.append("limit", String(limit));
      if (search) params.append("q", search);
      if (reason) params.append("reason", reason);
      if (admin) params.append("admin", admin);
      if (date) params.append("date", date);

      const res = await fetch(`/api/admin/stock-logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (res.status === 401) {
        logout();
        toast.error('Session expired. Please login again.');
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load stock logs");
      }
      
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalLogs(data.pagination?.total || 0);
      setTotalReplenishments(data.statistics?.replenishments || 0);
      setTotalDeductions(data.statistics?.deductions || 0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Connection interrupted. Could not load stock logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    setPage(1);
  }, [search, reason, admin, date]);

  const handleResetFilters = () => {
    setSearch("");
    setReason("");
    setAdmin("");
    setDate("");
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button 
            onClick={() => router.push("/admin/inventory")}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-rose-500 transition-colors uppercase tracking-wider mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Ledger
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 font-outfit">Stock Audit Logs</h1>
          <p className="text-sm text-neutral-500 mt-1">Real-time tracker of all physical stock additions, reservations, and cancellations.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchLogs(page)} 
            disabled={loading}
            className="border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border border-neutral-100 bg-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Transactions</p>
            <p className="text-3xl font-extrabold text-neutral-900 font-outfit">{totalLogs}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 text-neutral-600">
            <Activity className="w-6 h-6" />
          </div>
        </Card>
        
        <Card className="p-5 border border-neutral-100 bg-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Replenishments</p>
            <p className="text-3xl font-extrabold text-emerald-600 font-outfit">
              {totalReplenishments}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border border-neutral-100 bg-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Deductions / Sales</p>
            <p className="text-3xl font-extrabold text-rose-600 font-outfit">
              {totalDeductions}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Filter Controls */}
      <Card className="p-5 border border-neutral-100 bg-white shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Product Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search product..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-rose-500 transition-colors bg-neutral-50/50"
            />
          </div>

          {/* Reason Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
            <select 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-rose-500 transition-colors bg-neutral-50/50 appearance-none text-neutral-600 font-medium cursor-pointer"
            >
              <option value="">All Reason Categories</option>
              <option value="Replenishment">Inventory Replenishment</option>
              <option value="Order Placed">Order Placed (Sale reserved)</option>
              <option value="Order Cancelled">Order Cancelled (Stock returned)</option>
              <option value="Direct">Direct adjustments</option>
              <option value="Undo">Undo Reverts</option>
            </select>
          </div>

          {/* Admin Email Search */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search by Admin Email..." 
              value={admin} 
              onChange={e => setAdmin(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-rose-500 transition-colors bg-neutral-50/50"
            />
          </div>

          {/* Date Picker */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-rose-500 transition-colors bg-neutral-50/50 text-neutral-600 font-medium cursor-pointer"
            />
          </div>
        </div>

        {(search || reason || admin || date) && (
          <div className="flex justify-end">
            <button 
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-500 hover:underline transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* Logs Table */}
      <Card className="border border-neutral-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-neutral-300 animate-spin" />
            <p className="text-sm font-medium text-neutral-400">Syncing audit database...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-medium text-rose-500">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchLogs(page)}>Retry Connection</Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-12 h-12 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">No stock logs match your current search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <th className="py-4 px-6">Product Details</th>
                  <th className="py-4 px-6">Variant / Option</th>
                  <th className="py-4 px-6">Adjustment</th>
                  <th className="py-4 px-6">Ending Stock</th>
                  <th className="py-4 px-6">Reason & Info</th>
                  <th className="py-4 px-6">Audited By</th>
                  <th className="py-4 px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((log) => {
                  const isPositive = log.amount > 0;
                  return (
                    <tr key={log.id} className="hover:bg-neutral-50/50 transition-colors text-sm text-neutral-700">
                      <td className="py-4.5 px-6 font-semibold text-neutral-900">{log.productName}</td>
                      <td className="py-4.5 px-6">
                        <div className="flex flex-wrap gap-1">
                          {log.weight && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                              {log.weight}
                            </span>
                          )}
                          {log.flavor && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                              {log.flavor}
                            </span>
                          )}
                          {!log.weight && !log.flavor && (
                            <span className="text-[11px] text-neutral-400 italic">Standard</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4.5 px-6 font-extrabold font-outfit">
                        <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                          {isPositive ? `+${log.amount}` : log.amount}
                        </span>
                      </td>
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-neutral-400 font-medium">{log.oldStock}</span>
                          <span className="text-xs text-neutral-300">→</span>
                          <span className="font-bold text-neutral-800">{log.newStock}</span>
                        </div>
                      </td>
                      <td className="py-4.5 px-6">
                        <div className="max-w-xs truncate font-medium text-neutral-700" title={log.reason}>
                          {log.reason}
                        </div>
                      </td>
                      <td className="py-4.5 px-6 text-neutral-500 text-xs font-mono">
                        {log.adminEmail || <span className="text-neutral-300 italic">System Auto</span>}
                      </td>
                      <td className="py-4.5 px-6 text-right text-xs text-neutral-500 font-medium">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/50 px-6 py-4">
            <span className="text-xs font-semibold text-neutral-500">
              Showing page {page} of {totalPages} ({totalLogs} total entries)
            </span>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1 || loading}
                onClick={() => {
                  setPage(p => p - 1);
                  fetchLogs(page - 1);
                }}
                className="border-neutral-200 text-neutral-700"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === totalPages || loading}
                onClick={() => {
                  setPage(p => p + 1);
                  fetchLogs(page + 1);
                }}
                className="border-neutral-200 text-neutral-700"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
