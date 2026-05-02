"use client";

import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  Calendar,
  Package,
  BarChart3,
  DollarSign,
  Clock,
  Filter,
  RefreshCw,
  FileText,
  RotateCcw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    productId: "all"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.startDate) query.append("startDate", filters.startDate);
      if (filters.endDate) query.append("endDate", filters.endDate);
      if (filters.productId !== "all") query.append("productId", filters.productId);

      const res = await fetch(`/api/admin/analytics/revenue?${query.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.logs || data.logs.length === 0) return;

    const headers = ["Order ID", "Sale Date", "Product", "SKU", "Unit Price", "Quantity", "Total Money", "Status"];
    const rows = data.logs.map((log: any) => [
      `#${log.orderId.slice(-6)}`,
      new Date(log.date).toLocaleString('en-GB'),
      log.productName,
      log.productSlug,
      log.price,
      log.quantity,
      log.total,
      log.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any) => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `revenue_report_${filters.startDate}_to_${filters.endDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFilters({
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      productId: "all"
    });
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=100");
      if (res.ok) {
        const json = await res.json();
        setProducts(json.products || []);
      }
    } catch (e) { }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const chartData = useMemo(() => {
    if (!data?.logs) return [];

    // Group logs by date for chart
    const groups: { [key: string]: number } = {};
    data.logs.forEach((log: any) => {
      const date = new Date(log.date).toLocaleDateString();
      groups[date] = (groups[date] || 0) + log.total;
    });

    return Object.entries(groups).map(([date, amount]) => ({
      date,
      revenue: amount
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compiling Financial Ledger...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white/50 p-6 lg:p-12 space-y-12">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-8 md:w-12 h-1 bg-red-600 rounded-full"></span>
            <span className="text-[9px] md:text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Sales Reports</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none">Sales Overview</h1>
          <p className="text-xs md:text-gray-500 font-medium max-w-xl">
            Track your daily sales and see how much money you made. <span className="text-red-600 font-black italic underline decoration-2">Shows actual price at the time of sale.</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-1 md:gap-2">
            <div className="flex items-center gap-1.5 px-2 md:px-3">
              <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none w-24 md:w-auto"
              />
            </div>
            <div className="text-gray-300 text-[10px]">to</div>
            <div className="flex items-center gap-1.5 px-2 md:px-3">
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none w-24 md:w-auto"
              />
            </div>
            <button
              onClick={handleReset}
              title="Reset Dates"
              className="p-1.5 md:p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </button>
          </div>

          <div className="bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 px-3 md:px-4 flex-1 md:flex-none justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
              <select
                value={filters.productId}
                onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-2 md:pr-4"
              >
                <option value="all">ALL PRODUCTS</option>
                {products.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-3 md:p-4 bg-black text-white rounded-xl md:rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all group"
          >
            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {[
          { 
            label: "Pending Sales", 
            value: `৳${(data?.pending?.totalRevenue || 0).toLocaleString()}`, 
            sub: `${data?.pending?.totalOrders || 0} Orders in Pipeline`, 
            icon: RefreshCw, 
            color: "text-amber-600", 
            bg: "bg-amber-50",
            tag: "In Progress"
          },
          { 
            label: "Today's Sales", 
            value: `৳${(data?.daily?.totalRevenue || 0).toLocaleString()}`, 
            sub: `${data?.daily?.totalOrders || 0} Delivered Today`, 
            icon: Clock, 
            color: "text-emerald-600", 
            bg: "bg-emerald-50",
            tag: "Delivered Only"
          },
          { 
            label: "Selected Period", 
            value: `৳${(data?.range?.totalRevenue || 0).toLocaleString()}`, 
            sub: `${data?.range?.totalOrders || 0} Delivered in Range`, 
            icon: DollarSign, 
            color: "text-blue-600", 
            bg: "bg-blue-50",
            tag: "Delivered Only"
          },
          { 
            label: "Avg Order Value", 
            value: `৳${Math.round((data?.range?.totalRevenue || 0) / (data?.range?.totalOrders || 1)).toLocaleString()}`, 
            sub: "Delivered Orders Avg", 
            icon: BarChart3, 
            color: "text-indigo-600", 
            bg: "bg-indigo-50",
            tag: "Analytics"
          },
          { 
            label: "Lost & Damaged", 
            value: `৳${(data?.loss?.totalRevenue || 0).toLocaleString()}`, 
            sub: `${data?.loss?.totalOrders || 0} Reported Incidents`, 
            icon: Package, 
            color: "text-gray-600", 
            bg: "bg-gray-100",
            tag: "System Loss"
          },
          { 
            label: "Lifetime Sale", 
            value: `৳${(data?.lifetime?.totalRevenue || 0).toLocaleString()}`, 
            sub: `${data?.lifetime?.totalOrders || 0} Lifetime Delivered`, 
            icon: TrendingUp, 
            color: "text-red-600", 
            bg: "bg-red-50",
            tag: "Delivered Only"
          },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="p-4 md:p-8 bg-white shadow-xl shadow-gray-200/40 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 flex flex-col gap-4 md:gap-6 relative overflow-hidden group"
          >
            <div className="flex justify-between items-start relative z-10">
              <div className={`p-2.5 md:p-4 ${stat.bg} ${stat.color} rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-2">Security</span>
                <span className={`text-[9px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border ${
                  stat.tag === 'Delivered Only' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  stat.tag === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  stat.tag === 'System Loss' ? 'bg-red-50 text-red-600 border-red-100' :
                  'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {stat.tag}
                </span>
              </div>
            </div>
            <div className="relative z-10">
              <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block italic">{stat.label}</span>
              <p className="text-xl md:text-4xl font-black text-gray-900 tracking-tighter tabular-nums">{stat.value}</p>
              <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 md:mt-2 flex items-center gap-1 md:gap-2">
                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                {stat.sub}
              </p>
            </div>
            {/* Background Accent */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.bg} opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`} />
          </motion.div>
        ))}
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border-2 border-gray-50 shadow-2xl shadow-gray-200/30 rounded-[3rem] overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600"></div>
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Sales Chart</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Money made over time</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Live Data</span>
              </div>
            </div>
          </div>

          <div className="h-[200px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                  tickFormatter={(val) => `৳${val}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#dc2626' }}
                  labelStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#dc2626"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 border-2 border-gray-50 shadow-2xl shadow-gray-200/30 rounded-[3rem] space-y-8">
          <div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">Top Products</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Sales by product</p>
          </div>

          <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {data?.range?.items?.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-400 text-xs border border-gray-100 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{item.productName}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.totalQuantity} Units Sold</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-red-600 tabular-nums leading-none">৳{item.totalRevenue.toLocaleString()}</p>
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">PROFITABLE</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Itemized Audit Log */}
      <Card className="border-2 border-gray-50 shadow-2xl shadow-gray-200/30 rounded-[3rem] overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">Sales List</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Shows actual price when sold</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 border-gray-100 hover:border-black transition-all active:scale-95"
            >
              <FileText className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Sold Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Money</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {data?.logs?.map((log: any, i: number) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={`${log.orderId}-${i}`}
                    className="group hover:bg-gray-50/30 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-gray-400 uppercase font-mono">#{log.orderId.slice(-6)}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900">
                          {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-tighter mt-1">
                          {new Date(log.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none group-hover:text-red-600 transition-colors">{log.productName}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">SKU: {log.productSlug}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="text-sm font-black text-gray-600 tabular-nums">৳{log.price}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="text-sm font-black text-gray-400 tabular-nums">x{log.quantity}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${
                          log.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {log.status}
                        </span>
                        {log.status === 'delivered' && (
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                            {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(log.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-lg font-black text-red-600 tabular-nums leading-none">৳{log.total.toLocaleString()}</span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e2e8f0;
        }
      `}</style>
    </div>
  );
}
