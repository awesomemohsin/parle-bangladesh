"use client";

import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  Calendar,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  DollarSign,
  Clock,
  Filter,
  RefreshCw,
  Search,
  FileText,
  RotateCcw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
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
    productSlug: "all"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.startDate) query.append("startDate", filters.startDate);
      if (filters.endDate) query.append("endDate", filters.endDate);
      if (filters.productSlug !== "all") query.append("productSlug", filters.productSlug);

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

    const headers = ["Order ID", "Date", "Product", "SKU", "Unit Price", "Quantity", "Total"];
    const rows = data.logs.map((log: any) => [
      `#${log.orderId.slice(-6)}`,
      new Date(log.date).toLocaleDateString(),
      log.productName,
      log.productSlug,
      log.price,
      log.quantity,
      log.total
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
      productSlug: "all"
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
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-12 h-1 bg-red-600 rounded-full"></span>
            <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Sales Reports</span>
          </div>
          <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none">Sales Overview</h1>
          <p className="text-gray-500 font-medium max-w-xl">
            Track your daily sales and see how much money you made. <span className="text-red-600 font-black italic underline decoration-2">Shows actual price at the time of sale.</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none"
              />
            </div>
            <div className="text-gray-300">to</div>
            <div className="flex items-center gap-1.5 px-3">
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none"
              />
            </div>
            <button
              onClick={handleReset}
              title="Reset Dates"
              className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 px-4">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={filters.productSlug}
              onChange={(e) => setFilters({ ...filters, productSlug: e.target.value })}
              className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-4"
            >
              <option value="all">ALL PRODUCTS</option>
              {products.map(p => <option key={p.slug} value={p.slug}>{p.name.toUpperCase()}</option>)}
            </select>
          </div>

          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-4 bg-black text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all group"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Today's Sales", value: `৳${data?.daily?.totalRevenue.toLocaleString()}`, sub: `${data?.daily?.totalOrders} Orders Today`, icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Selected Period Sales", value: `৳${data?.range?.totalRevenue.toLocaleString()}`, sub: `${data?.range?.totalOrders} Orders in Selection`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Avg per Order", value: `৳${Math.round(data?.range?.totalRevenue / (data?.range?.totalOrders || 1)).toLocaleString()}`, sub: "For Selected Period", icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Lifetime Total Sale", value: `৳${data?.lifetime?.totalRevenue.toLocaleString()}`, sub: `${data?.lifetime?.totalOrders} Total Orders`, icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="p-8 bg-white shadow-xl shadow-gray-200/40 rounded-[2.5rem] border border-gray-100 flex flex-col gap-6"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3.5 ${stat.bg} ${stat.color} rounded-2xl`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Growth</span>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full">+12.5%</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block italic">{stat.label}</span>
              <p className="text-3xl font-black text-gray-900 tracking-tighter tabular-nums">{stat.value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.sub}</p>
            </div>
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

          <div className="h-[350px] w-full">
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
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Sold Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
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
                        <span className="text-xs font-black text-gray-900">{new Date(log.date).toLocaleDateString()}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(log.date).toLocaleTimeString()}</span>
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
