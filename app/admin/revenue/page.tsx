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
  RotateCcw,
  User,
  ShoppingCart,
  X,
  Printer
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
  const [salesRepresentatives, setSalesRepresentatives] = useState<any[]>([]);
  const [selectedChartDate, setSelectedChartDate] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: new Date().toISOString().split('T')[0],
    productId: "all",
    customerType: "all",
    srId: "all"
  });
  const [drillDownModal, setDrillDownModal] = useState<{
    title: string;
    orders: any[];
  } | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const handleOpenReport = async () => {
    setReportModalOpen(true);
    setLoadingReport(true);
    try {
      const query = new URLSearchParams();
      if (filters.startDate) query.append("startDate", filters.startDate);
      if (filters.endDate) query.append("endDate", filters.endDate);

      const res = await fetch(`/api/admin/analytics/report?${query.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReport(false);
    }
  };

  const getReportSummary = () => {
    if (!reportData?.statusStats) return {
      totalOrders: { count: 0, amount: 0, products: 0 },
      delivered: { count: 0, amount: 0, products: 0 },
      pending: { count: 0, amount: 0, products: 0 },
      loss: { count: 0, amount: 0, products: 0 },
      cancelled: { count: 0, amount: 0, products: 0 }
    };

    let totalCount = 0;
    let totalAmt = 0;
    let totalProd = 0;
    let delCount = 0;
    let delAmt = 0;
    let delProd = 0;
    let pendCount = 0;
    let pendAmt = 0;
    let pendProd = 0;
    let lossCount = 0;
    let lossAmt = 0;
    let lossProd = 0;
    let cancCount = 0;
    let cancAmt = 0;
    let cancProd = 0;

    reportData.statusStats.forEach((s: any) => {
      totalCount += s.count;
      totalAmt += s.totalAmount;
      totalProd += (s.totalProducts || 0);

      if (s._id === 'delivered') {
        delCount = s.count;
        delAmt = s.totalAmount;
        delProd = (s.totalProducts || 0);
      } else if (['pending', 'processing', 'shipped'].includes(s._id)) {
        pendCount += s.count;
        pendAmt += s.totalAmount;
        pendProd += (s.totalProducts || 0);
      } else if (['lost', 'damaged'].includes(s._id)) {
        lossCount += s.count;
        lossAmt += s.totalAmount;
        lossProd += (s.totalProducts || 0);
      } else if (s._id === 'cancelled') {
        cancCount = s.count;
        cancAmt = s.totalAmount;
        cancProd = (s.totalProducts || 0);
      }
    });

    return {
      totalOrders: { count: totalCount, amount: totalAmt, products: totalProd },
      delivered: { count: delCount, amount: delAmt, products: delProd },
      pending: { count: pendCount, amount: pendAmt, products: pendProd },
      loss: { count: lossCount, amount: lossAmt, products: lossProd },
      cancelled: { count: cancCount, amount: cancAmt, products: cancProd }
    };
  };

  const getKeyObservations = () => {
    if (!reportData) return [];
    const observations = [];

    const summary = getReportSummary();
    const totalDelivered = summary.delivered.amount;
    const totalCount = summary.delivered.count;
    observations.push(`Overall sales performance remains strong, with a total of ${totalCount.toLocaleString()} delivered orders bringing in ৳${totalDelivered.toLocaleString()} in net revenue.`);

    if (reportData.customerTypeStats && reportData.customerTypeStats.length > 0) {
      const sorted = [...reportData.customerTypeStats].sort((a: any, b: any) => b.totalAmount - a.totalAmount);
      const topSegment = sorted[0];
      observations.push(`The ${getCustomerTypeLabel(topSegment._id).toLowerCase()} segment is currently our most valuable customer channel, generating the highest total order value.`);
    }

    if (reportData.dealerStats && reportData.dealerStats.length > 0) {
      const dealerRev = reportData.dealerStats.reduce((sum: number, d: any) => sum + d.totalAmount, 0);
      const dealerDue = reportData.dealerStats.reduce((sum: number, d: any) => sum + d.amountDue, 0);
      observations.push(`B2B distributors and dealers contributed ৳${dealerRev.toLocaleString()} in total sales, although there is a remaining outstanding balance of ৳${dealerDue.toLocaleString()} that requires collection follow-up.`);
    }

    if (reportData.srStats && reportData.srStats.length > 0) {
      const topSR = reportData.srStats[0];
      observations.push(`Field sales activities are highly productive, led by representative ${topSR.srName || "N/A"} who generated ৳${topSR.totalAmount.toLocaleString()} in total sales volume.`);
    }

    let totalBilled = 0;
    let totalCollected = 0;
    let totalDue = 0;
    reportData.paymentStats.forEach((p: any) => {
      totalBilled += p.totalAmount;
      totalCollected += p.paidAmount;
      totalDue += p.dueAmount;
    });
    if (totalBilled > 0) {
      const efficiency = (totalCollected / totalBilled) * 100;
      observations.push(`Cash collections are running at a ${efficiency.toFixed(1)}% efficiency rate, leaving an overall outstanding receivable of ৳${totalDue.toLocaleString()} across all payment methods.`);
    }

    if (reportData.productStats && reportData.productStats.length > 0) {
      const topProd = reportData.productStats[0];
      observations.push(`Product demand is led by "${topProd.productName}", which stands as the highest-selling product by moving ${topProd.unitsSold.toLocaleString()} units.`);
    }

    return observations;
  };

  const getCustomerTypeLabel = (type: string) => {
    switch (type) {
      case 'customer': return 'Registered Customers';
      case 'guest': return 'Guests';
      case 'retailer': return 'B2B Retailers';
      case 'dealer': return 'B2B Dealers';
      case 'owner': return 'Owner Orders';
      case 'admin': return 'Admin Orders';
      case 'super_admin': return 'Super Admin Orders';
      case 'moderator': return 'Moderator Orders';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const handleExportReportCSV = () => {
    if (!reportData) return;

    const sections = [];
    const dateRangeStr = `${filters.startDate || "LIFETIME"}_to_${filters.endDate}`;

    // Document header
    sections.push([`PARLE BANGLADESH - EXECUTIVE MANAGEMENT REPORT`]);
    sections.push([`Period: ${filters.startDate || "LIFETIME"} to ${filters.endDate}`]);
    sections.push([`Generated At: ${new Date().toLocaleString()}`]);
    sections.push([]);

    // Executive Summary
    sections.push([`--- EXECUTIVE SUMMARY ---`]);
    sections.push([`Metric`, `Count`, `Total Value`]);
    const summary = getReportSummary();
    sections.push([`Total Orders`, `${summary.totalOrders.count} Orders`, summary.totalOrders.amount]);
    sections.push([`Delivered Sales`, `${summary.delivered.count} Orders`, summary.delivered.amount]);
    sections.push([`Pending Pipeline`, `${summary.pending.count} Orders`, summary.pending.amount]);
    sections.push([`Products Sold`, `${reportData.overallStats?.totalUniqueSKUs || 0} SKUs`, `${reportData.overallStats?.totalProductsSold || 0} Units`]);
    sections.push([`New Customers Registered`, reportData.newCustomersCount, `-`]);
    sections.push([]);

    // Customer Type Breakdown
    sections.push([`--- SALES BREAKDOWN BY CUSTOMER TYPE ---`]);
    sections.push([`Customer Segment`, `Orders Placed`, `Products Sold`, `Total Order Value`]);
    reportData.customerTypeStats.forEach((stat: any) => {
      const label = getCustomerTypeLabel(stat._id);
      sections.push([label, stat.count, stat.totalProducts || 0, stat.totalAmount]);
    });
    sections.push([]);

    // Dealer Summary
    sections.push([`--- DEALER PERFORMANCE SUMMARY ---`]);
    sections.push([`Dealer Name`, `Phone`, `Orders Count`, `Products Sold`, `Dues Outstanding`, `Total Sales Value`]);
    (reportData.dealerStats || []).forEach((stat: any) => {
      sections.push([stat.customerName || "N/A", stat.customerPhone || "N/A", stat.count, stat.totalProducts || 0, stat.amountDue, stat.totalAmount]);
    });
    sections.push([]);

    // SR Breakdown
    sections.push([`--- SALES REPRESENTATIVES PERFORMANCE ---`]);
    sections.push([`SR Name`, `Mobile`, `Orders Placed`, `Products Sold`, `Total Sales`]);
    reportData.srStats.forEach((stat: any) => {
      const name = stat.srName || "Unknown SR";
      const mobile = stat.srMobile || "N/A";
      sections.push([name, mobile, stat.count, stat.totalProducts || 0, stat.totalAmount]);
    });
    sections.push([]);

    // Payment Breakdown
    sections.push([`--- PAYMENT METHODS & CASHFLOW COLLECTION ---`]);
    sections.push([`Payment Method`, `Orders Placed`, `Total Value`, `Amount Paid`, `Amount Due`]);
    reportData.paymentStats.forEach((stat: any) => {
      sections.push([stat._id, stat.count, stat.totalAmount, stat.paidAmount, stat.dueAmount]);
    });
    sections.push([]);

    // Order Status Summary
    sections.push([`--- ORDER STATUS SUMMARY ---`]);
    sections.push([`Order Status`, `Orders Count`, `Products Sold`, `Total Status Value`]);
    const statusOrder = ['delivered', 'shipped', 'processing'];
    const sortedStatusStats = [...reportData.statusStats].sort((a: any, b: any) => {
      const aIndex = statusOrder.indexOf(a._id.toLowerCase());
      const bIndex = statusOrder.indexOf(b._id.toLowerCase());
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a._id.localeCompare(b._id);
    });
    sortedStatusStats.forEach((stat: any) => {
      sections.push([stat._id.toUpperCase(), stat.count, stat.totalProducts || 0, stat.totalAmount]);
    });
    sections.push([]);

    // Top Products
    sections.push([`--- TOP PERFORMING PRODUCTS ---`]);
    sections.push([`Product Name`, `Units Sold`, `Total Revenue`]);
    reportData.productStats.slice(0, 10).forEach((stat: any) => {
      sections.push([stat.productName, stat.unitsSold, stat.totalRevenue]);
    });
    sections.push([]);

    // Overall Stats
    sections.push([`--- OVERALL STATISTICS ---`]);
    sections.push([`Total Products Sold`, `${reportData.overallStats?.totalProductsSold || 0} Units`]);
    sections.push([`Total Unique SKUs`, `${reportData.overallStats?.totalUniqueSKUs || 0} SKUs`]);
    sections.push([`Average Products Per Order`, `${(reportData.overallStats?.averageProductsPerOrder || 0).toFixed(2)} Items/Order`]);
    sections.push([`Highest Order Value`, `৳${(reportData.overallStats?.highestOrderValue || 0).toLocaleString()}`]);
    sections.push([`Lowest Order Value`, `৳${(reportData.overallStats?.lowestOrderValue || 0).toLocaleString()}`]);
    sections.push([]);

    // Key Observations
    sections.push([`--- KEY OBSERVATIONS ---`]);
    getKeyObservations().forEach((obs) => {
      sections.push([obs]);
    });

    const csvContent = sections.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `executive_management_report_${dateRangeStr}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printableElement = document.getElementById("report-printable-area");
    if (!printableElement) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the report");
      return;
    }

    let styles = "";
    document.querySelectorAll("link[rel='stylesheet'], style").forEach((styleNode) => {
      styles += styleNode.outerHTML;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Executive Management Report</title>
          ${styles}
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              background: white !important;
              color: black !important;
              padding: 0 10mm 0 10mm !important;
              font-family: ui-sans-serif, system-ui, sans-serif !important;
            }
            .no-print {
              display: none !important;
            }
            
            /* Avoid page-breaks inside sections */
            .report-section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            /* Repeating page header spacer */
            .print-page-header-spacer {
              height: 15mm !important;
            }
            table.print-layout-table {
              width: 100% !important;
              border-collapse: collapse !important;
              border: none !important;
            }
            table.print-layout-table > tbody > tr > td {
              border: none !important;
              padding: 0 !important;
            }
            .print-content {
              display: block !important;
              width: 100% !important;
            }
            
            /* Print Layout Constraints for Portrait View */
            @page {
              size: portrait;
              margin: 0 !important;
            }
            
            /* Force the KPI grid to remain in exactly 1 row of 6 columns */
            #kpi-cards-grid {
              display: grid !important;
              grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
              gap: 8px !important;
              width: 100% !important;
            }
            
            /* Document Header Alignment */
            #report-doc-header {
              display: flex !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: flex-end !important;
              text-align: left !important;
              width: 100% !important;
            }
            #report-period-box {
              text-align: right !important;
            }
            
            /* Typography & Table Styling Enhancements for Premium Look */
            th {
              font-weight: 800 !important;
              color: #0f172a !important;
            }
            td {
              color: #334155 !important;
            }
          </style>
        </head>
        <body>
          <table class="print-layout-table">
            <thead>
              <tr>
                <td>
                  <div class="print-page-header-spacer"></div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="print-content">
                    ${printableElement.innerHTML}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <script>
            setTimeout(function() {
              window.focus();
              window.print();
              window.close();
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.startDate) query.append("startDate", filters.startDate);
      if (filters.endDate) query.append("endDate", filters.endDate);
      if (filters.productId !== "all") query.append("productId", filters.productId);
      if (filters.customerType !== "all") query.append("customerType", filters.customerType);
      if (filters.srId && filters.srId !== "all") query.append("srId", filters.srId);

      const res = await fetch(`/api/admin/analytics/revenue?${query.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.salesRepresentatives) {
          setSalesRepresentatives(json.salesRepresentatives);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!data?.logs) return [];
    if (!selectedChartDate) return data.logs;
    return data.logs.filter((log: any) => {
      const logDate = new Date(log.date).toLocaleDateString("en-GB");
      return logDate === selectedChartDate;
    });
  }, [data?.logs, selectedChartDate]);

  const handleExportCSV = () => {
    const logsToExport = selectedChartDate ? filteredLogs : data?.logs;
    if (!logsToExport || logsToExport.length === 0) return;

    const headers = ["Order ID", "Sale Date", "Product", "SKU", "Unit Price", "Quantity", "Total Money", "Status"];
    const rows = logsToExport.map((log: any) => [
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
      startDate: "",
      endDate: new Date().toISOString().split('T')[0],
      productId: "all",
      customerType: "all",
      srId: "all"
    });
    setSelectedChartDate(null);
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
    setSelectedChartDate(null);
  }, [filters]);

  const chartData = useMemo(() => {
    if (!data?.logs) return [];

    const groups: { [key: string]: number } = {};
    data.logs.forEach((log: any) => {
      const date = new Date(log.date).toLocaleDateString("en-GB");
      groups[date] = (groups[date] || 0) + log.total;
    });

    return Object.entries(groups).map(([date, amount]) => ({
      date,
      revenue: amount
    })).sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Compiling Financial Ledger...</p>
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
                type={filters.startDate ? "date" : "text"}
                value={filters.startDate}
                onFocus={(e) => e.target.type = "date"}
                onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                placeholder="LIFETIME (FROM)"
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none w-24 md:w-28 cursor-pointer"
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

          <div className="bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 px-3 md:px-4 flex-1 md:flex-none justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
              <select
                value={filters.customerType}
                onChange={(e) => setFilters({ ...filters, customerType: e.target.value })}
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-2 md:pr-4"
              >
                <option value="all">All Orders</option>
                <option value="customer">Customers</option>
                <option value="b2b">Retailers & Dealer</option>
                <option value="staff">Staffs (Admins/Superadmins)</option>
                <option value="other">Others (Corporate/Influencer)</option>
              </select>
            </div>
          </div>

          {/* SR Dropdown Filter */}
          <div className="bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 px-3 md:px-4 flex-1 md:flex-none justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
              <select
                value={filters.srId}
                onChange={(e) => setFilters({ ...filters, srId: e.target.value })}
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-2 md:pr-4"
              >
                <option value="all">ALL Orders</option>
                {salesRepresentatives.map((sr: any) => (
                  <option key={sr.id} value={sr.id}>
                    {sr.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            id="btn-generate-report"
            onClick={handleOpenReport}
            title="Generate Business Report"
            className="px-4 py-3 md:py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Report</span>
          </button>

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
            sub: `${data?.pending?.totalOrders || 0} Orders in Pipeline (${data?.pending?.totalProducts || 0} Products)`,
            icon: RefreshCw,
            color: "text-amber-600",
            bg: "bg-amber-50",
            tag: "In Progress",
            onClick: () => setDrillDownModal({ title: "Pending Sales Details", orders: data?.drillDown?.pending || [] })
          },
          {
            label: "Today's Sales",
            value: `৳${(data?.daily?.totalRevenue || 0).toLocaleString()}`,
            sub: `${data?.daily?.totalOrders || 0} Delivered Today`,
            icon: Clock,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            tag: "Delivered Only",
            onClick: () => setDrillDownModal({ title: "Today's Sales Details", orders: data?.drillDown?.daily || [] })
          },
          {
            label: "Selected Period",
            value: `৳${(data?.range?.totalRevenue || 0).toLocaleString()}`,
            sub: `${data?.range?.totalOrders || 0} Delivered in Range (${data?.range?.totalProducts || 0} Products)`,
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
            tag: "System Loss",
            onClick: () => setDrillDownModal({ title: "Lost & Damaged Incidents Details", orders: data?.drillDown?.loss || [] })
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
          {
            label: "Total Orders",
            value: `৳${(data?.activeRange?.totalRevenue || 0).toLocaleString()}`,
            sub: `${data?.activeRange?.totalOrders || 0} Active Orders in Range (${data?.activeRange?.totalProducts || 0} Products)`,
            icon: ShoppingCart,
            color: "text-violet-600",
            bg: "bg-violet-50",
            tag: "Active Range"
          },
        ].map((stat, i) => {
          const isTotalOrders = stat.label === "Total Orders";
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i}
              onClick={stat.onClick}
              className={`p-4 md:p-8 bg-white shadow-xl shadow-gray-200/40 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 flex relative overflow-hidden group transition-all ${isTotalOrders
                ? "col-span-full flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
                : "flex-col gap-4 md:gap-6"
                } ${stat.onClick
                  ? "cursor-pointer hover:shadow-2xl hover:shadow-gray-300/60 hover:-translate-y-1 hover:border-slate-300"
                  : ""
                }`}
            >
              <div className={`flex relative z-10 ${isTotalOrders ? "flex-col sm:flex-row-reverse sm:items-center sm:justify-between w-full gap-4" : "flex-col w-full gap-4 md:gap-6"}`}>
                <div className={`flex justify-between items-start ${isTotalOrders ? "sm:items-center gap-4 shrink-0" : ""}`}>
                  <div className={`p-2.5 md:p-4 ${stat.bg} ${stat.color} rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-2">Security</span>
                    <span className={`text-[9px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border ${stat.tag === 'Delivered Only' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      stat.tag === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        stat.tag === 'System Loss' ? 'bg-red-50 text-red-600 border-red-100' :
                          stat.tag === 'Active Range' ? 'bg-violet-50 text-violet-600 border-violet-100' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                      {stat.tag}
                    </span>
                  </div>
                </div>
                <div className="relative z-10">
                  <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block italic">{stat.label}</span>
                  <p className={`text-xl font-black text-gray-900 tracking-tighter tabular-nums ${isTotalOrders ? "md:text-5xl" : "md:text-4xl"}`}>{stat.value}</p>
                  <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 md:mt-2 flex items-center gap-1 md:gap-2">
                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                    {stat.sub}
                  </p>
                </div>
              </div>
              {/* Background Accent */}
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.bg} opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`} />
            </motion.div>
          );
        })}
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
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></div>
                <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Live Data</span>
              </div>
            </div>
          </div>

          <div className="h-[200px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                onClick={(e) => {
                  if (e && e.activeLabel) {
                    setSelectedChartDate(e.activeLabel);
                  }
                }}
                className="cursor-pointer"
              >
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

        {selectedChartDate && (
          <div className="px-8 py-3 bg-slate-50 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Table Filter:</span>
              <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 shadow-sm">
                Date: {selectedChartDate}
                <button
                  onClick={() => setSelectedChartDate(null)}
                  className="hover:text-black transition-colors rounded-full p-0.5"
                  title="Clear Filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
            <button
              onClick={() => setSelectedChartDate(null)}
              className="text-[9px] font-black text-red-600 hover:text-black uppercase tracking-widest leading-none border-b border-red-600/30 hover:border-black transition-all"
            >
              Clear Filter
            </button>
          </div>
        )}

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
                {filteredLogs?.map((log: any, i: number) => (
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
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${log.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
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

      {/* Drill-down details modal */}
      <AnimatePresence>
        {drillDownModal && (
          <div
            onClick={() => setDrillDownModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col cursor-default"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">
                    {drillDownModal.title}
                  </h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mt-1">
                    Showing up to 50 matching records
                  </p>
                </div>
                <button
                  onClick={() => setDrillDownModal(null)}
                  className="p-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                {drillDownModal.orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-wider text-xs">
                    No matching orders found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="py-3 px-4">Order ID</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4 text-center">Items / Products</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {drillDownModal.orders.map((order, idx) => (
                          <tr key={order.id || idx} className="hover:bg-slate-50/50 transition-colors text-xs font-medium text-slate-700">
                            <td className="py-4 px-4 font-mono font-bold text-gray-400">
                              #{order.id.slice(-6).toUpperCase()}
                            </td>
                            <td className="py-4 px-4">
                              {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-gray-900">{order.customerName}</div>
                              <div className="text-[10px] text-gray-400 font-bold">{order.customerPhone}</div>
                            </td>
                            <td className="py-4 px-4 max-w-xs">
                              <div className="space-y-1">
                                {order.items.map((item: any, i: number) => (
                                  <div key={i} className="flex items-center gap-1.5 text-[11px] leading-tight">
                                    <span className="font-black text-red-600">{item.quantity}x</span>
                                    <span className="text-gray-800 font-bold truncate max-w-[150px]" title={item.name}>{item.name}</span>
                                    <span className="text-gray-400 text-[10px]">(@ ৳{item.price})</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                order.status === 'lost' || order.status === 'damaged' ? 'bg-red-50 text-red-700 border border-red-100' :
                                  order.status === 'cancelled' ? 'bg-gray-100 text-gray-500 border border-gray-200' :
                                    'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-black text-gray-900">
                              ৳{order.total.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed Business Report Modal */}
      <AnimatePresence>
        {reportModalOpen && (
          <div
            id="modal-report-overlay"
            onClick={() => setReportModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              id="modal-report-container"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col cursor-default print:border-none print:shadow-none"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 no-print">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">
                    Sales & Operations Report
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-print-report"
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Report</span>
                  </button>
                  <button
                    id="btn-export-report-csv"
                    onClick={handleExportReportCSV}
                    className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    id="btn-close-report"
                    onClick={() => setReportModalOpen(false)}
                    className="p-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div
                id="report-printable-area"
                className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8 printable-area print:p-0"
              >
                {loadingReport || !reportData ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compiling Analytics Ledger...</p>
                  </div>
                ) : (
                  <>

                    {/* Report Document Header */}
                    <div id="report-doc-header" className="text-center md:text-left border-b-2 border-slate-900 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                      <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mt-2">PARLE BANGLADESH</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Executive Management Report</p>
                      </div>
                      <div id="report-period-box" className="text-center md:text-right text-[10px] font-black text-slate-800 uppercase tracking-wider space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 md:min-w-[250px] print:bg-transparent print:border-none print:p-0">
                        <div>Report Period</div>
                        <div className="text-xs font-black text-red-600">
                          {filters.startDate ? new Date(filters.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "LIFETIME"}
                          <span className="text-slate-400 mx-2">to</span>
                          {filters.endDate ? new Date(filters.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "TODAY"}
                        </div>
                        <div className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Generated: {new Date().toLocaleString('en-GB')}</div>
                      </div>
                    </div>

                    {/* Executive KPI Summary */}
                    <div className="report-section">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 font-mono">I. Executive Summary</h4>
                      <div id="kpi-cards-grid" className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                        {(() => {
                          const guestStats = reportData.customerTypeStats.find((s: any) => s._id === 'guest') || { count: 0, totalAmount: 0 };
                          const kpisList = [
                            {
                              label: "Total Orders",
                              count: `${getReportSummary().totalOrders.count} Orders`,
                              value: `৳${getReportSummary().totalOrders.amount.toLocaleString()}`,
                              color: "border-slate-200 bg-slate-50/50"
                            },
                            {
                              label: "Delivered Sales",
                              count: `${getReportSummary().delivered.count} Orders`,
                              value: `৳${getReportSummary().delivered.amount.toLocaleString()}`,
                              color: "border-emerald-200 bg-emerald-50/30"
                            },
                            {
                              label: "Pending Pipeline",
                              count: `${getReportSummary().pending.count} Orders`,
                              value: `৳${getReportSummary().pending.amount.toLocaleString()}`,
                              color: "border-amber-200 bg-amber-50/30"
                            },
                            {
                              label: "Products Sold",
                              count: `${reportData.overallStats?.totalUniqueSKUs || 0} SKUs`,
                              value: `${(reportData.overallStats?.totalProductsSold || 0).toLocaleString()} Units`,
                              color: "border-purple-200 bg-purple-50/30"
                            },
                            {
                              label: "New Customers",
                              count: "Registered Customers",
                              value: `${reportData.newCustomersCount}`,
                              color: "border-blue-200 bg-blue-50/30"
                            },
                            {
                              label: "Guest Customers",
                              count: `${guestStats.count} Checkout Orders`,
                              value: `৳${guestStats.totalAmount.toLocaleString()}`,
                              color: "border-indigo-200 bg-indigo-50/30"
                            }
                          ];
                          return kpisList.map((kpi, idx) => (
                            <div key={idx} className={`p-4 border rounded-2xl flex flex-col justify-between ${kpi.color}`}>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                              <div className="mt-2">
                                <span className="text-base font-black text-slate-900 leading-none">{kpi.value}</span>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">{kpi.count}</span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Sales Breakdown by Customer Type */}
                    <div className="report-section space-y-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 font-mono">II. Sales Breakdown by Customer Type</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-none">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest print:bg-transparent print:border-b-2 print:border-slate-900">
                              <th className="py-3 px-5">Customer Segment</th>
                              <th className="py-3 px-5 text-center">Orders Placed</th>
                              <th className="py-3 px-5 text-center">Products Sold</th>
                              <th className="py-3 px-5 text-right">Total Order Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {reportData.customerTypeStats.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-400 uppercase font-bold tracking-widest text-[10px]">No records match date range</td>
                              </tr>
                            ) : (
                              reportData.customerTypeStats.map((stat: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/30 font-medium">
                                  <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">
                                    {getCustomerTypeLabel(stat._id)}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.count}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.totalProducts || 0}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-bold text-slate-955 tabular-nums">
                                    ৳{stat.totalAmount.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Dealer Performance Summary */}
                    <div className="report-section space-y-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 font-mono">III. Dealer Performance Summary</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-none">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest print:bg-transparent print:border-b-2 print:border-slate-900">
                              <th className="py-3 px-5">Dealer Name</th>
                              <th className="py-3 px-5">Phone Number</th>
                              <th className="py-3 px-5 text-center">Orders Count</th>
                              <th className="py-3 px-5 text-center">Products Sold</th>
                              <th className="py-3 px-5 text-right">Dues Outstanding</th>
                              <th className="py-3 px-5 text-right">Total Sales Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {!reportData.dealerStats || reportData.dealerStats.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-6 text-center text-slate-400 uppercase font-bold tracking-widest text-[10px]">No dealer records in range</td>
                              </tr>
                            ) : (
                              reportData.dealerStats.map((stat: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/30 font-medium">
                                  <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">
                                    {stat.customerName || "Unknown Dealer"}
                                  </td>
                                  <td className="py-3.5 px-5 font-mono text-slate-550">
                                    {stat.customerPhone || "N/A"}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.count}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.totalProducts || 0}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-bold text-amber-600 tabular-nums">
                                    ৳{stat.amountDue.toLocaleString()}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-bold text-slate-950 tabular-nums">
                                    ৳{stat.totalAmount.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sales Representatives (SR) Performance */}
                    <div className="report-section space-y-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 font-mono">IV. Sales Representatives (SR) Performance</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-none">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest print:bg-transparent print:border-b-2 print:border-slate-900">
                              <th className="py-3 px-5">SR Name</th>
                              <th className="py-3 px-5">Mobile</th>
                              <th className="py-3 px-5 text-center">Orders Placed</th>
                              <th className="py-3 px-5 text-center">Products Sold</th>
                              <th className="py-3 px-5 text-right">Total Sales</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {reportData.srStats.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-slate-400 uppercase font-bold tracking-widest text-[10px]">No SR orders recorded in this range</td>
                              </tr>
                            ) : (
                              reportData.srStats.map((stat: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/30 font-medium">
                                  <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">
                                    {stat.srName || "Unknown Representative"}
                                  </td>
                                  <td className="py-3.5 px-5 font-mono text-slate-550">
                                    {stat.srMobile || "N/A"}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.count}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.totalProducts || 0}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-bold text-slate-950 tabular-nums">
                                    ৳{stat.totalAmount.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Payment & Outstanding Balances */}
                    <div className="report-section space-y-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 font-mono">V. Payment Methods & Cashflow Collection</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-none">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest print:bg-transparent print:border-b-2 print:border-slate-900">
                              <th className="py-3 px-5">Payment Method</th>
                              <th className="py-3 px-5 text-center">Orders</th>
                              <th className="py-3 px-5 text-right">Total Order Value</th>
                              <th className="py-3 px-5 text-right">Amount Collected</th>
                              <th className="py-3 px-5 text-right">Outstanding Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {reportData.paymentStats.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-slate-400 uppercase font-bold tracking-widest text-[10px]">No transaction history in range</td>
                              </tr>
                            ) : (
                              reportData.paymentStats.map((stat: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/30 font-medium">
                                  <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">
                                    {stat._id.toUpperCase()}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.count}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-bold text-slate-950 tabular-nums">
                                    ৳{stat.totalAmount.toLocaleString()}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-bold text-emerald-600 tabular-nums">
                                    ৳{stat.paidAmount.toLocaleString()}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-bold text-amber-600 tabular-nums">
                                    ৳{stat.dueAmount.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Order Status Summary */}
                    <div className="report-section space-y-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 font-mono">VI. Order Status Summary</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-none">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest print:bg-transparent print:border-b-2 print:border-slate-900">
                              <th className="py-3 px-5">Order Status</th>
                              <th className="py-3 px-5 text-center">Orders Count</th>
                              <th className="py-3 px-5 text-center">Products Sold</th>
                              <th className="py-3 px-5 text-right">Total Status Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {reportData.statusStats.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-400 uppercase font-bold tracking-widest text-[10px]">No records found</td>
                              </tr>
                            ) : (
                              [...reportData.statusStats].sort((a: any, b: any) => {
                                const statusOrder = ['delivered', 'shipped', 'processing'];
                                const aIndex = statusOrder.indexOf(a._id.toLowerCase());
                                const bIndex = statusOrder.indexOf(b._id.toLowerCase());
                                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                if (aIndex !== -1) return -1;
                                if (bIndex !== -1) return 1;
                                return a._id.localeCompare(b._id);
                              }).map((stat: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/30 font-medium">
                                  <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">
                                    {stat._id.toUpperCase()}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.count}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.totalProducts || 0}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-bold text-slate-955 tabular-nums">
                                    ৳{stat.totalAmount.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top Products */}
                    <div className="report-section space-y-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 font-mono">VII. Top Performing Products (Top 10)</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-none">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest print:bg-transparent print:border-b-2 print:border-slate-900">
                              <th className="py-3 px-5 text-center">Rank</th>
                              <th className="py-3 px-5">Product Name</th>
                              <th className="py-3 px-5 text-center">Volume Sold</th>
                              <th className="py-3 px-5 text-right">Revenue Generated</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {reportData.productStats.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-400 uppercase font-bold tracking-widest text-[10px]">No sales recorded</td>
                              </tr>
                            ) : (
                              reportData.productStats.slice(0, 10).map((stat: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/30 font-medium">
                                  <td className="py-3.5 px-5 text-center font-black text-slate-400 tabular-nums">
                                    #{idx + 1}
                                  </td>
                                  <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">
                                    {stat.productName}
                                  </td>
                                  <td className="py-3.5 px-5 text-center font-bold tabular-nums">
                                    {stat.unitsSold} Units
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-black text-red-600 tabular-nums">
                                    ৳{stat.totalRevenue.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Overall Statistics */}
                    <div className="report-section space-y-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 font-mono">VIII. Overall Statistics</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-none">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest print:bg-transparent print:border-b-2 print:border-slate-900">
                              <th className="py-3 px-5">Metric Name</th>
                              <th className="py-3 px-5 text-right">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            <tr className="hover:bg-slate-50/30 font-medium">
                              <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">Total Products Sold</td>
                              <td className="py-3.5 px-5 text-right font-bold tabular-nums">{(reportData.overallStats?.totalProductsSold || 0).toLocaleString()} Units</td>
                            </tr>
                            <tr className="hover:bg-slate-50/30 font-medium">
                              <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">Total Unique SKUs</td>
                              <td className="py-3.5 px-5 text-right font-bold tabular-nums">{reportData.overallStats?.totalUniqueSKUs || 0} Products</td>
                            </tr>
                            <tr className="hover:bg-slate-50/30 font-medium">
                              <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">Average Products Per Order</td>
                              <td className="py-3.5 px-5 text-right font-bold tabular-nums">{(reportData.overallStats?.averageProductsPerOrder || 0).toFixed(2)} Items/Order</td>
                            </tr>
                            <tr className="hover:bg-slate-50/30 font-medium">
                              <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">Highest Order Value</td>
                              <td className="py-3.5 px-5 text-right font-bold text-emerald-600 tabular-nums">৳{(reportData.overallStats?.highestOrderValue || 0).toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-slate-50/30 font-medium">
                              <td className="py-3.5 px-5 font-black text-slate-800 uppercase tracking-tight">Lowest Order Value</td>
                              <td className="py-3.5 px-5 text-right font-bold text-red-600 tabular-nums">৳{(reportData.overallStats?.lowestOrderValue || 0).toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Key Observations Section */}
                    <div className="report-section space-y-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 font-mono">IX. Key Observations</h4>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2.5 print:bg-transparent print:border-none print:p-0">
                        {getKeyObservations().map((obs, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                            <p className="font-semibold leading-relaxed tracking-tight">{obs}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Signature Fields */}
                    <div className="report-section pt-12 border-t border-slate-200 mt-12 grid grid-cols-3 gap-8 text-center text-[10px] font-black uppercase tracking-wider print:pt-8 print:mt-8">
                      <div className="flex flex-col items-center">
                        <div className="w-32 border-b border-slate-300 h-8"></div>
                        <span className="mt-2 text-slate-400">Prepared By</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-32 border-b border-slate-300 h-8"></div>
                        <span className="mt-2 text-slate-400">Reviewed By</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-32 border-b border-slate-300 h-8"></div>
                        <span className="mt-2 text-slate-400">Approved By</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
