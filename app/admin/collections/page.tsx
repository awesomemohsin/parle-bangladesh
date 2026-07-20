"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  DollarSign,
  Check,
  Search,
  User,
  CreditCard,
  Calendar,
  FileText,
  PlusCircle,
  Award,
  X,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Upload,
  Eye,
  Loader2,
  Download,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";

const renderTypeBadge = (customerType: string | undefined) => {
  if (!customerType) return null;
  const type = customerType.toLowerCase();

  let classes = "bg-slate-100 text-slate-500 border-slate-200";
  if (type === "dealer") classes = "bg-amber-50 text-amber-700 border-amber-200";
  else if (type === "retailer") classes = "bg-blue-50 text-blue-700 border-blue-200";
  else if (type === "student") classes = "bg-rose-50 text-rose-700 border-rose-200";
  else if (type === "influencer") classes = "bg-orange-50 text-orange-700 border-orange-200";
  else if (type === "employee") classes = "bg-purple-50 text-purple-700 border-purple-200";
  else if (type === "corporate") classes = "bg-indigo-50 text-indigo-700 border-indigo-200";
  else if (type === "guest") classes = "bg-gray-100 text-gray-400 border-gray-200";
  else if (type !== "customer") classes = "bg-teal-50 text-teal-700 border-teal-200";

  return (
    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border shrink-0 ${classes}`}>
      {customerType.replace("_", " ")}
    </span>
  );
};

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  customerType?: string;
  status: string;
  address?: string;
  city?: string;
  postalCode?: string;
  updatedAt?: string;
  userId?: string;
}

interface Shop {
  id: string;
  name: string;
  mobile: string;
  email: string;
  dueBalance: number;
  walletBalance: number;
  creditLimit: number;
  customerType: string;
  isRetailerApproved: boolean;
  createdAt: string;
  updatedAt: string;
  totalOrderAmount?: number;
  totalPaidAmount?: number;
  totalDueAmount?: number;
}

interface Ledger {
  id: string;
  userId: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    customerType: string;
  } | null;
  orderId?: string;
  amount: number;
  type: string;
  paymentMethod: string;
  recordedBy: string;
  notes?: string;
  documentUrl?: string;
  createdAt: string;
}

const formatPaymentMethod = (method: string) => {
  if (!method) return "CASH";
  const m = method.toLowerCase();
  if (m === "bank_ucb") return "BANK TRANSFER (UCB bank)";
  if (m === "bank_brac") return "BANK TRANSFER (Brac bank)";
  if (m === "bank_nrbc") return "BANK TRANSFER (NRBC bank)";
  if (m === "bank") return "BANK TRANSFER";
  return m.toUpperCase();
};

export default function CollectionsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"invoices" | "shops" | "ledgers" | "completed">(() => {
    return (searchParams.get("tab") as any) || "invoices";
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalOrdersStats, setTotalOrdersStats] = useState({ amount: 0, count: 0 });
  const [salesRepresentatives, setSalesRepresentatives] = useState<any[]>([]);
  const [selectedSR, setSelectedSR] = useState<string>("all");
  const [reconcileAllLoading, setReconcileAllLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");

  useEffect(() => {
    const tab = searchParams.get("tab");
    const q = searchParams.get("q");
    if (tab) {
      setActiveTab(tab as any);
    }
    if (q !== null) {
      setSearchQuery(q);
      setShopFilter("all");
    }
  }, [searchParams]);
  const [shopFilter, setShopFilter] = useState<"all" | "customer" | "b2b" | "staff" | "other">("all");
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "customer" | "b2b" | "staff" | "other">("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [shopSortBy, setShopSortBy] = useState<
    "id" | "updatedAt" | "name" | "mobile" | "customerType" | "isRetailerApproved" | "dueBalance" | "walletBalance" | "creditLimit" | "accountBalance" | "totalOrderAmount" | "totalPaidAmount" | "totalDueAmount"
  >("updatedAt");
  const [shopSortOrder, setShopSortOrder] = useState<"asc" | "desc">("desc");
  const [invoiceSortBy, setInvoiceSortBy] = useState<
    "createdAt" | "id" | "customerName" | "total" | "amountPaid" | "amountDue" | "status"
  >("createdAt");
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<"asc" | "desc">("desc");
  const [completedSortBy, setCompletedSortBy] = useState<
    "createdAt" | "updatedAt" | "id" | "customerName" | "total" | "amountPaid" | "amountDue" | "status"
  >("updatedAt");
  const [completedSortOrder, setCompletedSortOrder] = useState<"asc" | "desc">("desc");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const handleInvoiceSort = (field: typeof invoiceSortBy) => {
    if (invoiceSortBy === field) {
      setInvoiceSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setInvoiceSortBy(field);
      const numericFields = ["total", "amountPaid", "amountDue"];
      setInvoiceSortOrder(numericFields.includes(field) ? "desc" : "asc");
    }
  };

  const renderInvoiceSortIndicator = (field: typeof invoiceSortBy) => {
    if (invoiceSortBy !== field) {
      return <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1">↕</span>;
    }
    return invoiceSortOrder === "asc" ? (
      <span className="text-gray-900 font-extrabold ml-1">▲</span>
    ) : (
      <span className="text-gray-900 font-extrabold ml-1">▼</span>
    );
  };

  const handleCompletedInvoiceSort = (field: typeof completedSortBy) => {
    if (completedSortBy === field) {
      setCompletedSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCompletedSortBy(field);
      const numericFields = ["total", "amountPaid", "amountDue"];
      setCompletedSortOrder(numericFields.includes(field) ? "desc" : "asc");
    }
  };

  const renderCompletedInvoiceSortIndicator = (field: typeof completedSortBy) => {
    if (completedSortBy !== field) {
      return <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1">↕</span>;
    }
    return completedSortOrder === "asc" ? (
      <span className="text-gray-900 font-extrabold ml-1">▲</span>
    ) : (
      <span className="text-gray-900 font-extrabold ml-1">▼</span>
    );
  };

  const handleSort = (field: typeof shopSortBy) => {
    if (shopSortBy === field) {
      setShopSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setShopSortBy(field);
      const numericFields = ["dueBalance", "walletBalance", "creditLimit", "accountBalance", "totalOrderAmount", "totalPaidAmount", "totalDueAmount"];
      setShopSortOrder(numericFields.includes(field) ? "desc" : "asc");
    }
  };

  const renderSortIndicator = (field: typeof shopSortBy) => {
    if (shopSortBy !== field) {
      return <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1">↕</span>;
    }
    return shopSortOrder === "asc" ? (
      <span className="text-gray-900 font-extrabold ml-1">▲</span>
    ) : (
      <span className="text-gray-900 font-extrabold ml-1">▼</span>
    );
  };

  // Modals state
  const [reconcileOrder, setReconcileOrder] = useState<Order | null>(null);
  const [walletDepositShop, setWalletDepositShop] = useState<Shop | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<{
    orderId: string;
    orderTotal: number;
    due: number;
    history: Array<{
      id: string;
      amount: number;
      label: string;
      paymentMethod: string;
      recordedBy: string;
      notes: string;
      documentUrl?: string;
      createdAt: string;
    }>;
  } | null>(null);

  const [expandedOrderHistory, setExpandedOrderHistory] = useState<string | null>(null);
  const [expandedHistoryData, setExpandedHistoryData] = useState<any | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const toggleRowExpand = async (orderId: string) => {
    if (expandedOrderHistory === orderId) {
      setExpandedOrderHistory(null);
      setExpandedHistoryData(null);
      return;
    }

    setExpandedOrderHistory(orderId);
    setExpandedHistoryData(null);
    setExpandedLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/collections?type=payment-history&orderId=${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setExpandedHistoryData(data);
      }
    } catch (err) {
      console.error("Failed to fetch expanded history", err);
    } finally {
      setExpandedLoading(false);
    }
  };

  // Form states
  const [cashAmount, setCashAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedBank, setSelectedBank] = useState("");
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [depositModalOrders, setDepositModalOrders] = useState<Order[]>([]);
  const [depositModalLoading, setDepositModalLoading] = useState(false);

  useEffect(() => {
    if (walletDepositShop) {
      setDepositModalLoading(true);
      const token = localStorage.getItem("token");
      fetch(`/api/admin/collections?type=customer-details&customerId=${walletDepositShop.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.orders) {
            // Filter to only processing, shipped, delivered, AND unpaid orders
            const unpaid = data.orders.filter((o: any) =>
              o.paymentStatus !== "paid" &&
              ["processing", "shipped", "delivered"].includes(o.status)
            );
            // Sort by createdAt ascending (FIFO)
            unpaid.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            setDepositModalOrders(unpaid);
          }
        })
        .catch(err => {
          console.error("Failed to fetch customer details for deposit modal", err);
        })
        .finally(() => {
          setDepositModalLoading(false);
        });
    } else {
      setDepositModalOrders([]);
    }
  }, [walletDepositShop]);

  const simulatedAllocations = useMemo(() => {
    let remaining = parseFloat(cashAmount) || 0;
    const allocations = depositModalOrders.map(order => {
      const due = order.amountDue !== undefined ? order.amountDue : order.total;
      let allocated = 0;
      let statusAfter = order.paymentStatus;

      if (remaining > 0) {
        if (remaining >= due) {
          allocated = due;
          remaining -= due;
          statusAfter = "paid";
        } else {
          allocated = remaining;
          remaining = 0;
          statusAfter = "partial";
        }
      }

      return {
        id: order.id,
        total: order.total,
        dueBefore: due,
        allocated,
        dueAfter: due - allocated,
        statusAfter,
        createdAt: order.createdAt
      };
    });

    return {
      allocations,
      leftoverWalletCredit: remaining
    };
  }, [depositModalOrders, cashAmount]);


  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<{
    user: {
      id: string;
      name: string;
      mobile: string;
      email: string;
      customerType: string;
      walletBalance: number;
      creditLimit: number;
      isRetailerApproved: boolean;
      createdAt?: string;
      referredBySR?: {
        name: string;
        email: string;
        mobile: string;
      } | null;
    };
    orders: any[];
    payments: any[];
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);

  const fetchCustomerDetails = async (customerId: string, customerMobile?: string) => {
    setDetailsLoading(true);
    setShowAllOrders(false);
    setShowAllPayments(false);
    try {
      const token = localStorage.getItem("token");
      const url = `/api/admin/collections?type=customer-details&customerId=${customerId}${customerMobile ? `&customerMobile=${customerMobile}` : ""}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomerDetails(data);
      } else {
        alert("Failed to retrieve customer details.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while fetching customer details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const query = new URLSearchParams();
      query.append("type", "all");
      if (startDate) query.append("startDate", startDate);
      if (endDate) query.append("endDate", endDate);
      if (selectedSR !== "all") query.append("srId", selectedSR);
      const res = await fetch(`/api/admin/collections?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setCompletedOrders(data.completedOrders || []);
        setShops(data.shops || []);
        setLedgers(data.ledgers || []);
        setTotalCollected(data.totalCollected || 0);
        setTotalOrdersStats(data.totalOrdersStats || { amount: 0, count: 0 });
        setSalesRepresentatives(data.salesRepresentatives || []);
      }
    } catch (e) {
      console.error("Failed to load collections statistics", e);
    } finally {
      setLoading(false);
    }
  };

  const handleForceReconcileAll = async () => {
    if (!confirm("Are you sure you want to force reconcile all customer and admin ledgers? This will re-calculate balances and orders from transaction logs.")) return;
    setReconcileAllLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: "force-reconcile-all" })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "All ledgers reconciled successfully.");
        await fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to reconcile ledgers.");
      }
    } catch (err) {
      alert("Error reconciling ledgers: " + err);
    } finally {
      setReconcileAllLoading(false);
    }
  };

  const handleExportCSV = (data: any[], headers: { label: string; key: string | ((item: any) => any) }[], filename: string) => {
    const csvHeaders = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(",");

    const csvRows = data.map(item => {
      return headers.map(h => {
        let value = typeof h.key === "function" ? h.key(item) : item[h.key];
        if (value === undefined || value === null) value = "";
        value = String(value);
        return `"${value.replace(/"/g, '""')}"`;
      }).join(",");
    });

    if (data.length > 0) {
      const totalsRow = headers.map((h, index) => {
        if (index === 0) {
          return `"TOTAL"`;
        }
        if (h.label.includes("(৳)") || h.label.toLowerCase().includes("amount")) {
          let sum = 0;
          data.forEach(item => {
            let val = typeof h.key === "function" ? h.key(item) : item[h.key];
            let num = parseFloat(val);
            if (!isNaN(num)) {
              sum += num;
            }
          });
          return `"${sum}"`;
        }
        return `""`;
      }).join(",");
      csvRows.push(totalsRow);
    }

    const csvContent = "\uFEFF" + [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportInvoices = () => {
    const outstandingHeaders = [
      { label: "Order ID", key: (o: any) => o.id },
      { label: "Date", key: (o: any) => new Date(o.createdAt).toLocaleString() },
      { label: "Customer Shop", key: (o: any) => o.customerName },
      { label: "Customer Phone", key: (o: any) => o.customerPhone },
      { label: "Customer Type", key: (o: any) => o.customerType || "" },
      { label: "Grand Total (৳)", key: (o: any) => o.total },
      { label: "Amount Paid (৳)", key: (o: any) => o.amountPaid || 0 },
      { label: "Outstanding Due (৳)", key: (o: any) => o.paymentStatus === "paid" ? 0 : (o.amountDue || o.total) },
      { label: "Order Status", key: (o: any) => o.status },
      { label: "Payment Status", key: (o: any) => o.paymentStatus }
    ];
    const dateRangeStr = startDate || endDate ? `_${startDate || "lifetime"}_to_${endDate || "today"}` : "";
    handleExportCSV(sortedOrders, outstandingHeaders, `Outstanding_Invoices${dateRangeStr}.csv`);
  };

  const handleExportShops = () => {
    const shopHeaders = [
      { label: "Account ID", key: (s: any) => s.id },
      { label: "Account Name", key: (s: any) => s.name },
      { label: "Email", key: (s: any) => s.email || "" },
      { label: "Mobile", key: (s: any) => s.mobile },
      { label: "Account Type", key: (s: any) => s.customerType || "" },
      { label: "Probation Status", key: (s: any) => s.customerType === "retailer" ? (s.isRetailerApproved ? "Approved" : "Probation") : "N/A" },
      { label: "Total Order (৳)", key: (s: any) => s.totalOrderAmount || 0 },
      { label: "Total Paid (৳)", key: (s: any) => s.totalPaidAmount || 0 },
      { label: "Due Balance (৳)", key: (s: any) => s.totalDueAmount || 0 },
      { label: "Wallet Balance (৳)", key: (s: any) => s.walletBalance || 0 },
      { label: "Net Account Balance (৳)", key: (s: any) => (s.walletBalance || 0) - (s.dueBalance || 0) }
    ];
    handleExportCSV(sortedShops, shopHeaders, `Customer_Balances.csv`);
  };

  const handleExportCompleted = () => {
    const completedHeaders = [
      { label: "Order ID", key: (o: any) => o.id },
      { label: "Date", key: (o: any) => new Date(o.createdAt).toLocaleString() },
      { label: "Last Updated", key: (o: any) => new Date(o.updatedAt || o.createdAt).toLocaleString() },
      { label: "Customer Shop", key: (o: any) => o.customerName },
      { label: "Customer Phone", key: (o: any) => o.customerPhone },
      { label: "Customer Type", key: (o: any) => o.customerType || "" },
      { label: "Grand Total (৳)", key: (o: any) => o.total },
      { label: "Amount Paid (৳)", key: (o: any) => o.amountPaid || 0 },
      { label: "Outstanding Due (৳)", key: (o: any) => o.amountDue || 0 },
      { label: "Order Status", key: (o: any) => o.status },
      { label: "Payment Status", key: (o: any) => "PAID" }
    ];
    const dateRangeStr = startDate || endDate ? `_${startDate || "lifetime"}_to_${endDate || "today"}` : "";
    handleExportCSV(sortedCompletedOrders, completedHeaders, `Completed_Invoices${dateRangeStr}.csv`);
  };

  const handleExportLedgers = () => {
    const ledgerHeaders = [
      { label: "Transaction ID", key: (l: any) => l.id },
      { label: "Date", key: (l: any) => new Date(l.createdAt).toLocaleString() },
      { label: "Shop Name", key: (l: any) => l.userId ? l.userId.name : "Guest Customer" },
      { label: "Shop Mobile", key: (l: any) => l.userId ? l.userId.mobile : "" },
      { label: "Customer Type", key: (l: any) => l.userId ? l.userId.customerType : "guest" },
      { label: "Transaction Type", key: (l: any) => l.type },
      { label: "Reference ID", key: (l: any) => l.type === "collection" ? (l.orderId || "") : (l.userId ? (l.userId.id || l.userId._id || "") : "") },
      { label: "Payment Method", key: (l: any) => l.paymentMethod || "" },
      { label: "Amount (৳)", key: (l: any) => l.amount },
      { label: "Proof URL", key: (l: any) => l.documentUrl || "" },
      { label: "Recorded By", key: (l: any) => l.recordedBy },
      { label: "Notes", key: (l: any) => l.notes || "" }
    ];
    const dateRangeStr = startDate || endDate ? `_${startDate || "lifetime"}_to_${endDate || "today"}` : "";
    handleExportCSV(filteredLedgers, ledgerHeaders, `Transaction_Ledgers${dateRangeStr}.csv`);
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedSR]);

  useEffect(() => {
    if (!reconcileOrder) {
      setDocumentUrl("");
      setIsUploading(false);
      setPaymentHistory(null);
      return;
    }

    const fetchPaymentHistory = async () => {
      setHistoryLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/admin/collections?type=payment-history&orderId=${reconcileOrder.id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setPaymentHistory(data);
        }
      } catch (err) {
        console.error("Failed to load payment history", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [reconcileOrder]);

  useEffect(() => {
    if (!walletDepositShop) {
      setDocumentUrl("");
      setIsUploading(false);
    }
  }, [walletDepositShop]);

  // Recalculate top stats cards
  const totalOutstandingDues = shops.reduce((sum, s) => sum + (s.dueBalance || 0), 0);
  const totalWalletBalances = shops.reduce((sum, s) => sum + (s.walletBalance || 0), 0);

  // Calculate today's collections
  const today = new Date().toISOString().split("T")[0];
  const todayCollections = ledgers
    .filter(l => l.type === "collection" && l.createdAt.split("T")[0] === today)
    .reduce((sum, l) => sum + l.amount, 0);

  const handleReconcileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileOrder) return;
    const finalMethod = paymentMethod === "bank" ? selectedBank : paymentMethod;
    setConfirmAction({
      title: "Confirm Payment Collection",
      message: `Are you sure you want to record a payment collection of ৳${cashAmount} via ${formatPaymentMethod(finalMethod)} for Order #${reconcileOrder.id.slice(-8).toUpperCase()}? This will update the order's payment status and adjust the outstanding dues.`,
      onConfirm: () => submitReconcile()
    });
  };

  const submitReconcile = async () => {
    if (!reconcileOrder) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
      const finalMethod = paymentMethod === "bank" ? selectedBank : paymentMethod;
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "reconcile",
          orderId: reconcileOrder.id,
          amountPaid: Number(cashAmount),
          paymentMethod: finalMethod,
          notes,
          documentUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Payment recorded successfully.");
        setCashAmount("");
        setNotes("");
        setDocumentUrl("");
        setSelectedBank("");
        // Refresh listings
        await fetchData();
        setTimeout(() => {
          setReconcileOrder(null);
          setSuccessMsg("");
        }, 1500);
      } else {
        setErrorMsg(data.error || "Failed to submit reconciliation.");
      }
    } catch (err) {
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWalletDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletDepositShop) return;
    const finalMethod = paymentMethod === "bank" ? selectedBank : paymentMethod;
    setConfirmAction({
      title: "Confirm Wallet Deposit",
      message: `Are you sure you want to record a direct wallet deposit of ৳${cashAmount} via ${formatPaymentMethod(finalMethod)} for ${walletDepositShop.name}? This will automatically clear any outstanding dues first, and allocate any remaining amount to the wallet balance.`,
      onConfirm: () => submitWalletDeposit()
    });
  };

  const submitWalletDeposit = async () => {
    if (!walletDepositShop) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
      const finalMethod = paymentMethod === "bank" ? selectedBank : paymentMethod;
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "wallet-deposit",
          userId: walletDepositShop.id,
          amount: Number(cashAmount),
          paymentMethod: finalMethod,
          notes,
          documentUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Deposit logged successfully.");
        setCashAmount("");
        setNotes("");
        setDocumentUrl("");
        setSelectedBank("");
        await fetchData();
        setTimeout(() => {
          setWalletDepositShop(null);
          setSuccessMsg("");
        }, 1500);
      } else {
        setErrorMsg(data.error || "Failed to submit deposit.");
      }
    } catch (err) {
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRetailer = (shopId: string) => {
    setConfirmAction({
      title: "Approve Retailer",
      message: "Are you sure you want to approve this retailer and increase their credit limit to ৳50,000?",
      onConfirm: () => submitApproveRetailer(shopId)
    });
  };

  const submitApproveRetailer = async (shopId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "approve-retailer",
          userId: shopId
        })
      });
      if (res.ok) {
        alert("Retailer approved successfully!");
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve retailer.");
      }
    } catch (e) {
      alert("Error approving retailer.");
    } finally {
      setLoading(false);
    }
  };

  // Filter listings based on query, invoice type, and order status
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      o.id.slice(-8).toUpperCase().includes(searchQuery.toUpperCase());

    if (!matchesSearch) return false;

    // Filter by customer/shop type
    if (invoiceFilter === "b2b") {
      if (o.customerType !== "retailer" && o.customerType !== "dealer" && o.customerType !== "corporate" && o.customerType !== "employee") return false;
    } else if (invoiceFilter === "customer") {
      if (o.customerType !== "customer" && o.customerType !== "guest") return false;
    } else if (invoiceFilter === "staff") {
      if (o.customerType !== "admin" && o.customerType !== "super_admin" && o.customerType !== "moderator" && o.customerType !== "owner") return false;
    } else if (invoiceFilter === "other") {
      if (["customer", "guest", "retailer", "dealer", "corporate", "employee", "admin", "super_admin", "moderator", "owner"].includes(o.customerType || "")) return false;
    }

    // Filter by order status
    if (orderStatusFilter !== "all") {
      if (o.status !== orderStatusFilter) return false;
    }

    return true;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let valA: any = a[invoiceSortBy];
    let valB: any = b[invoiceSortBy];

    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA === undefined || valA === null) valA = 0;
    if (valB === undefined || valB === null) valB = 0;

    if (valA < valB) return invoiceSortOrder === "asc" ? -1 : 1;
    if (valA > valB) return invoiceSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const filteredCompletedOrders = completedOrders.filter(o => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      o.id.slice(-8).toUpperCase().includes(searchQuery.toUpperCase());

    if (!matchesSearch) return false;

    // Filter by customer/shop type
    if (invoiceFilter === "b2b") {
      if (o.customerType !== "retailer" && o.customerType !== "dealer" && o.customerType !== "corporate" && o.customerType !== "employee") return false;
    } else if (invoiceFilter === "customer") {
      if (o.customerType !== "customer" && o.customerType !== "guest") return false;
    } else if (invoiceFilter === "staff") {
      if (o.customerType !== "admin" && o.customerType !== "super_admin" && o.customerType !== "moderator" && o.customerType !== "owner") return false;
    } else if (invoiceFilter === "other") {
      if (["customer", "guest", "retailer", "dealer", "corporate", "employee", "admin", "super_admin", "moderator", "owner"].includes(o.customerType || "")) return false;
    }

    // Filter by order status
    if (orderStatusFilter !== "all") {
      if (o.status !== orderStatusFilter) return false;
    }

    return true;
  });

  const sortedCompletedOrders = [...filteredCompletedOrders].sort((a, b) => {
    let valA: any;
    let valB: any;

    if (completedSortBy === "updatedAt") {
      valA = a.updatedAt || a.createdAt;
      valB = b.updatedAt || b.createdAt;
    } else {
      valA = a[completedSortBy];
      valB = b[completedSortBy];
    }

    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA === undefined || valA === null) valA = 0;
    if (valB === undefined || valB === null) valB = 0;

    if (valA < valB) return completedSortOrder === "asc" ? -1 : 1;
    if (valA > valB) return completedSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const filteredShops = shops.filter(s => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mobile.includes(searchQuery) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const type = s.customerType?.toLowerCase();
    if (shopFilter === "b2b") {
      if (type !== "retailer" && type !== "dealer" && type !== "employee") return false;
    } else if (shopFilter === "customer") {
      if (type !== "customer" && type !== "guest") return false;
    } else if (shopFilter === "staff") {
      if (type !== "admin" && type !== "super_admin" && type !== "moderator" && type !== "owner") return false;
    } else if (shopFilter === "other") {
      if (["customer", "guest", "retailer", "dealer", "employee", "admin", "super_admin", "moderator", "owner"].includes(type || "")) return false;
    }
    return true; // "all" shows all customer types
  });

  const sortedShops = [...filteredShops].sort((a, b) => {
    if (shopSortBy === "accountBalance") {
      const valA = (a.walletBalance || 0) - (a.dueBalance || 0);
      const valB = (b.walletBalance || 0) - (b.dueBalance || 0);
      if (valA < valB) return shopSortOrder === "asc" ? -1 : 1;
      if (valA > valB) return shopSortOrder === "asc" ? 1 : -1;
      return 0;
    }

    let valA: any = a[shopSortBy as keyof Shop];
    let valB: any = b[shopSortBy as keyof Shop];

    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (shopSortBy === "isRetailerApproved") {
      valA = a.customerType === "retailer" ? (a.isRetailerApproved ? 1 : 0) : -1;
      valB = b.customerType === "retailer" ? (b.isRetailerApproved ? 1 : 0) : -1;
    }

    if (valA === undefined || valA === null) valA = 0;
    if (valB === undefined || valB === null) valB = 0;

    if (valA < valB) return shopSortOrder === "asc" ? -1 : 1;
    if (valA > valB) return shopSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const filteredLedgers = ledgers.filter(
    l =>
      l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.orderId && l.orderId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.userId?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.notes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.recordedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const invoiceStats = useMemo(() => {
    let totalOrders = filteredOrders.length;
    let grandTotal = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    let totalPaid = filteredOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
    let totalDue = filteredOrders.reduce((sum, o) => sum + (o.paymentStatus === "paid" ? 0 : (o.amountDue || o.total)), 0);
    return { totalOrders, grandTotal, totalPaid, totalDue };
  }, [filteredOrders]);

  const completedStats = useMemo(() => {
    let totalOrders = filteredCompletedOrders.length;
    let grandTotal = filteredCompletedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    let totalPaid = filteredCompletedOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
    let totalDue = filteredCompletedOrders.reduce((sum, o) => sum + (o.amountDue || 0), 0);
    return { totalOrders, grandTotal, totalPaid, totalDue };
  }, [filteredCompletedOrders]);

  const shopStats = useMemo(() => {
    let totalShops = filteredShops.length;
    let totalOrders = filteredShops.reduce((sum, s) => sum + (s.totalOrderAmount || 0), 0);
    let totalPaid = filteredShops.reduce((sum, s) => sum + (s.totalPaidAmount || 0), 0);
    let totalDue = filteredShops.reduce((sum, s) => sum + (s.totalDueAmount || 0), 0);
    let netBalance = filteredShops.reduce((sum, s) => sum + ((s.walletBalance || 0) - (s.dueBalance || 0)), 0);
    return { totalShops, totalOrders, totalPaid, totalDue, netBalance };
  }, [filteredShops]);

  return (
    <div className="space-y-8 p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
            Dues & Reconciliation
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
            Accounts department cash ledger & shop wallets portal
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 self-start md:self-auto">
          <div className="bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1 md:gap-2">
            <div className="flex items-center gap-1.5 px-2 md:px-3">
              <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
              <input
                type={startDate ? "date" : "text"}
                value={startDate}
                onFocus={(e) => e.target.type = "date"}
                onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="LIFETIME (FROM)"
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none w-24 md:w-28 cursor-pointer"
              />
            </div>
            <div className="text-gray-300 text-[10px]">to</div>
            <div className="flex items-center gap-1.5 px-2 md:px-3">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none w-24 md:w-28 cursor-pointer"
              />
            </div>
            <button
              onClick={() => {
                setStartDate("");
                setEndDate(new Date().toISOString().split("T")[0]);
              }}
              title="Reset Dates"
              className="p-1.5 md:p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-amber-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </button>
          </div>

          <Button
            onClick={fetchData}
            variant="outline"
            className="border-2 border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 uppercase tracking-wider text-xs font-black h-11"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Console
          </Button>

          <div className="bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 px-3 md:px-4 h-11">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedSR}
              onChange={(e) => setSelectedSR(e.target.value)}
              className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-2 md:pr-4"
            >
              <option value="all">ALL SALES REPS</option>
              {salesRepresentatives.map((sr) => (
                <option key={sr.id} value={sr.id}>
                  {sr.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleForceReconcileAll}
            disabled={reconcileAllLoading}
            variant="outline"
            className="border-2 border-rose-200 hover:bg-rose-50 rounded-xl flex items-center gap-2 uppercase tracking-wider text-xs font-black text-rose-600 h-11 shadow-sm disabled:opacity-50"
          >
            <Loader2 className={`w-3.5 h-3.5 ${reconcileAllLoading ? 'animate-spin' : 'hidden'}`} />
            <RefreshCw className={`w-3.5 h-3.5 ${reconcileAllLoading ? 'hidden' : ''}`} />
            Update Dues
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Outstanding dues card */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
              Outstanding Dues
            </span>
            <span className="text-3xl font-black text-rose-500 tracking-tight italic">
              ৳{totalOutstandingDues.toLocaleString()}
            </span>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Wallets balance card */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
              Total Advance / Account Balance
            </span>
            <span className="text-3xl font-black text-emerald-500 tracking-tight italic">
              ৳{totalWalletBalances.toLocaleString()}
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Collections today card */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
              Collections Recorded Today
            </span>
            <span className="text-3xl font-black text-amber-500 tracking-tight italic">
              ৳{todayCollections.toLocaleString()}
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Total collected so far card */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
              Total Collections
            </span>
            <span className="text-3xl font-black text-blue-600 tracking-tight italic">
              ৳{totalCollected.toLocaleString()}
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Orders card */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
              Total Orders
            </span>
            <span className="text-3xl font-black text-indigo-600 tracking-tight italic">
              ৳{totalOrdersStats.amount.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 block">
              {totalOrdersStats.count} Active Orders
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main navigation tabs & search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 bg-gray-100/70 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => { setActiveTab("invoices"); setSearchQuery(""); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full sm:w-auto text-center ${activeTab === "invoices"
              ? "bg-white text-gray-900 shadow-md shadow-gray-200"
              : "text-gray-400 hover:text-gray-900"
              }`}
          >
            Outstanding Invoices ({orders.length})
          </button>
          <button
            onClick={() => { setActiveTab("shops"); setSearchQuery(""); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full sm:w-auto text-center ${activeTab === "shops"
              ? "bg-white text-gray-900 shadow-md shadow-gray-200"
              : "text-gray-400 hover:text-gray-900"
              }`}
          >
            Customer Balances ({shops.length})
          </button>
          <button
            onClick={() => { setActiveTab("completed"); setSearchQuery(""); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full sm:w-auto text-center ${activeTab === "completed"
              ? "bg-white text-gray-900 shadow-md shadow-gray-200"
              : "text-gray-400 hover:text-gray-900"
              }`}
          >
            Completed Invoices ({completedOrders.length})
          </button>
          <button
            onClick={() => { setActiveTab("ledgers"); setSearchQuery(""); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full sm:w-auto text-center ${activeTab === "ledgers"
              ? "bg-white text-gray-900 shadow-md shadow-gray-200"
              : "text-gray-400 hover:text-gray-900"
              }`}
          >
            Transaction Ledgers ({ledgers.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80 group">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 group-hover:text-gray-600 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "invoices" || activeTab === "completed"
                ? "Search invoice, shop, phone..."
                : activeTab === "shops"
                  ? "Search shop name or mobile..."
                  : "Search log details..."
            }
            className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-xs font-bold text-gray-900 shadow-inner"
          />
        </div>
      </div>

      {/* Tabs lists */}
      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-4 text-gray-500 font-bold uppercase text-xs tracking-widest">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          Syncing records with server...
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-100/20 overflow-hidden">

          {/* TAB 1: OUTSTANDING INVOICES */}
          {activeTab === "invoices" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Invoice Filter Selector Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1 bg-gray-100/70 p-1.5 rounded-2xl w-fit">
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("all")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "all"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    All Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("customer")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "customer"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Customers
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("b2b")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "b2b"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Retailers & Dealer
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("staff")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "staff"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Staffs
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("other")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "other"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Others (Corporate/Influencer)
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Order Status selector */}
                  <div className="flex items-center gap-2 bg-gray-100/70 p-1.5 rounded-2xl w-fit">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Order Status:</span>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="h-8 px-3 text-[10px] font-black uppercase bg-white border border-gray-200 rounded-xl focus:border-black focus:outline-none transition-all cursor-pointer min-w-[120px]"
                    >
                      <option value="all">ALL STATUSES</option>
                      <option value="processing">PROCESSING</option>
                      <option value="shipped">SHIPPED</option>
                      <option value="delivered">DELIVERED</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleExportInvoices}
                    variant="outline"
                    className="border-2 border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 uppercase tracking-wider text-[10px] font-black h-11"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Invoices</span>
                  <span className="text-base font-black text-slate-800 mt-1">{invoiceStats.totalOrders}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Grand Total</span>
                  <span className="text-base font-black text-slate-800 mt-1">৳{invoiceStats.grandTotal.toLocaleString()}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Paid</span>
                  <span className="text-base font-black text-emerald-600 mt-1">৳{invoiceStats.totalPaid.toLocaleString()}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Outstanding Due</span>
                  <span className="text-base font-black text-rose-500 mt-1">৳{invoiceStats.totalDue.toLocaleString()}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th
                        onClick={() => handleInvoiceSort("id")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Order ID {renderInvoiceSortIndicator("id")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleInvoiceSort("createdAt")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Date {renderInvoiceSortIndicator("createdAt")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleInvoiceSort("customerName")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Customer Shop {renderInvoiceSortIndicator("customerName")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleInvoiceSort("total")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Grand Total {renderInvoiceSortIndicator("total")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleInvoiceSort("amountPaid")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Paid {renderInvoiceSortIndicator("amountPaid")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleInvoiceSort("amountDue")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Outstanding Dues {renderInvoiceSortIndicator("amountDue")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleInvoiceSort("status")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Order Status {renderInvoiceSortIndicator("status")}
                        </div>
                      </th>
                      <th className="py-4 px-3">Payment Status</th>
                      <th className="py-4 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-400 uppercase tracking-wider">No outstanding delivered invoices found.</td>
                      </tr>
                    ) : (
                      sortedOrders.map((order) => (
                        <React.Fragment key={order.id}>
                          <tr
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer select-none border-b border-gray-100 last:border-b-0"
                            onClick={() => toggleRowExpand(order.id)}
                          >
                            <td className="py-4 px-3 font-mono text-gray-900 font-black flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-400 font-black shrink-0 w-3 text-center">
                                {expandedOrderHistory === order.id ? "▼" : "▶"}
                              </span>
                              <a
                                href={`/admin/orders?q=${order.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                title="View details in orders list"
                              >
                                #{order.id.slice(-8).toUpperCase()}
                              </a>
                            </td>
                            <td className="py-4 px-3 text-gray-400">
                              {new Date(order.createdAt).toLocaleString()}
                            </td>
                            <td className="py-4 px-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900">{order.customerName}</span>
                                {renderTypeBadge(order.customerType)}
                                {order.userId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchCustomerDetails(order.userId!, order.customerType?.toLowerCase() === "guest" || order.customerType === "Guest" ? order.customerPhone : undefined);
                                    }}
                                    className="font-mono text-[9px] font-black text-blue-600 hover:text-blue-800 hover:underline cursor-pointer focus:outline-none select-none shrink-0"
                                    title="View Customer Profile"
                                  >
                                    #{order.userId.slice(-8).toUpperCase()}
                                  </button>
                                )}
                              </div>
                              <div className="text-[10px] font-bold text-gray-400">{order.customerPhone}</div>
                            </td>
                            <td className="py-4 px-3 font-black text-gray-900">৳{order.total}</td>
                            <td className="py-4 px-3 text-emerald-500">৳{order.amountPaid || 0}</td>
                            <td className="py-4 px-3 text-rose-500 font-black">৳{order.paymentStatus === "paid" ? 0 : (order.amountDue || order.total)}</td>
                            <td className="py-4 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                                order.status === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  order.status === 'cancellation_pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                {order.status === 'cancellation_pending' ? 'Cancellation Pending' : order.status}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${order.paymentStatus === "partial"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-rose-50 text-rose-600 border-rose-200"
                                }`}>
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-right">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReconcileOrder(order);
                                  setCashAmount(String(order.paymentStatus === "paid" ? 0 : (order.amountDue || order.total)));
                                }}
                                className="bg-amber-600 hover:bg-black text-white px-4 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-md active:scale-95 shrink-0"
                              >
                                Collect Payment
                              </Button>
                            </td>
                          </tr>

                          {/* EXPANDED INLINE AUDIT TRAIL */}
                          {expandedOrderHistory === order.id && (
                            <tr className="bg-slate-50/60 border-y border-slate-100">
                              <td colSpan={9} className="py-3 px-6">
                                <div className="max-w-2xl bg-white rounded-2xl p-5 border border-slate-100 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex justify-between items-center">
                                    <span>Detailed Allocation & Payment Audit Trail</span>
                                    {expandedLoading && <span className="text-amber-600 animate-pulse text-[8px] tracking-normal font-bold uppercase">Retrieving...</span>}
                                  </h4>

                                  {expandedLoading && !expandedHistoryData ? (
                                    <div className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider animate-pulse">
                                      Retrieving Ledger History...
                                    </div>
                                  ) : !expandedHistoryData || expandedHistoryData.history.length === 0 ? (
                                    <div className="text-[10px] text-gray-400 font-bold italic py-2.5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-100">
                                      No payment allocations recorded for this invoice yet.
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-tight flex justify-between px-1 border-b border-slate-100 pb-1">
                                        <span>Initial Order Charge:</span>
                                        <span className="font-extrabold text-slate-900">৳{expandedHistoryData.orderTotal}</span>
                                      </div>
                                      <div className="space-y-2 pl-3 border-l border-slate-200">
                                        {(() => {
                                          let currentRemaining = expandedHistoryData.orderTotal;
                                          return expandedHistoryData.history.map((item: any, idx: number) => {
                                            currentRemaining = Math.max(0, currentRemaining - item.amount);
                                            return (
                                              <div key={item.id || idx} className="text-xs text-gray-700 py-2 relative pl-4">
                                                {/* Bullet dot */}
                                                <div className="absolute left-[-16.5px] top-3.5 w-2 h-2 rounded-full bg-slate-400 border border-white" />
                                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                  <div className="font-black text-gray-900 uppercase text-[10px]">
                                                    {item.label}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {item.documentUrl && (
                                                      <a
                                                        href={item.documentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-amber-600 hover:text-amber-800 transition-colors inline-flex items-center gap-1 border border-amber-200 bg-amber-50/50 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest leading-none"
                                                        title="View Proof Document"
                                                      >
                                                        <Eye className="w-3 h-3" /> View Proof
                                                      </a>
                                                    )}
                                                    <div className="font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                                                      -৳{item.amount}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
                                                  <span>Collected: <strong className="text-slate-600">{new Date(item.createdAt).toLocaleString()}</strong></span>
                                                  <span>Method: <strong className="text-slate-600">{formatPaymentMethod(item.paymentMethod)}</strong></span>
                                                  <span>By: <strong className="text-slate-600">{item.recordedBy}</strong></span>
                                                  <span className="ml-auto text-slate-500 font-semibold">Remaining: <strong className="text-slate-700 font-black">৳{currentRemaining}</strong></span>
                                                </div>
                                                {item.notes && (
                                                  <div className="text-[10px] text-gray-400 italic mt-1 font-medium bg-slate-50 px-2 py-1 rounded-md border border-slate-100/50 w-fit flex items-center gap-2">
                                                    <span>Remarks: "{item.notes}"</span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 1B: COMPLETED INVOICES */}
          {activeTab === "completed" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Invoice Filter Selector Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1 bg-gray-100/70 p-1.5 rounded-2xl w-fit">
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("all")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "all"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    All Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("customer")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "customer"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Customers
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("b2b")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "b2b"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Retailers & Dealer
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("staff")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "staff"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Staffs
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter("other")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${invoiceFilter === "other"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Others (Corporate/Influencer)
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Order Status selector */}
                  <div className="flex items-center gap-2 bg-gray-100/70 p-1.5 rounded-2xl w-fit">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Order Status:</span>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="h-8 px-3 text-[10px] font-black uppercase bg-white border border-gray-200 rounded-xl focus:border-black focus:outline-none transition-all cursor-pointer min-w-[120px]"
                    >
                      <option value="all">ALL STATUSES</option>
                      <option value="processing">PROCESSING</option>
                      <option value="shipped">SHIPPED</option>
                      <option value="delivered">DELIVERED</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleExportCompleted}
                    variant="outline"
                    className="border-2 border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 uppercase tracking-wider text-[10px] font-black h-11"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Invoices</span>
                  <span className="text-base font-black text-slate-800 mt-1">{completedStats.totalOrders}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Grand Total</span>
                  <span className="text-base font-black text-slate-800 mt-1">৳{completedStats.grandTotal.toLocaleString()}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Paid</span>
                  <span className="text-base font-black text-emerald-600 mt-1">৳{completedStats.totalPaid.toLocaleString()}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Remaining Due</span>
                  <span className="text-base font-black text-rose-500 mt-1">৳{completedStats.totalDue.toLocaleString()}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th
                        onClick={() => handleCompletedInvoiceSort("id")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Order ID {renderCompletedInvoiceSortIndicator("id")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleCompletedInvoiceSort("createdAt")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Order Date {renderCompletedInvoiceSortIndicator("createdAt")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleCompletedInvoiceSort("updatedAt")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Last Updated {renderCompletedInvoiceSortIndicator("updatedAt")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleCompletedInvoiceSort("customerName")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Customer Shop {renderCompletedInvoiceSortIndicator("customerName")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleCompletedInvoiceSort("total")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Grand Total {renderCompletedInvoiceSortIndicator("total")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleCompletedInvoiceSort("amountPaid")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Paid {renderCompletedInvoiceSortIndicator("amountPaid")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleCompletedInvoiceSort("amountDue")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Outstanding Dues {renderCompletedInvoiceSortIndicator("amountDue")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleCompletedInvoiceSort("status")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Order Status {renderCompletedInvoiceSortIndicator("status")}
                        </div>
                      </th>
                      <th className="py-4 px-3">Payment Status</th>
                      <th className="py-4 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                    {filteredCompletedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-gray-400 uppercase tracking-wider">No completed paid invoices found.</td>
                      </tr>
                    ) : (
                      sortedCompletedOrders.map((order) => (
                        <React.Fragment key={order.id}>
                          <tr
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer select-none border-b border-gray-100 last:border-b-0"
                            onClick={() => toggleRowExpand(order.id)}
                          >
                            <td className="py-4 px-3 font-mono text-gray-900 font-black flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-400 font-black shrink-0 w-3 text-center">
                                {expandedOrderHistory === order.id ? "▼" : "▶"}
                              </span>
                              <a
                                href={`/admin/orders?q=${order.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                title="View details in orders list"
                              >
                                #{order.id.slice(-8).toUpperCase()}
                              </a>
                            </td>
                            <td className="py-4 px-3 text-gray-400">
                              {new Date(order.createdAt).toLocaleString()}
                            </td>
                            <td className="py-4 px-3 text-gray-400">
                              {new Date(order.updatedAt || order.createdAt).toLocaleString()}
                            </td>
                            <td className="py-4 px-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900">{order.customerName}</span>
                                {renderTypeBadge(order.customerType)}
                                {order.userId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchCustomerDetails(order.userId!, order.customerType?.toLowerCase() === "guest" || order.customerType === "Guest" ? order.customerPhone : undefined);
                                    }}
                                    className="font-mono text-[9px] font-black text-blue-600 hover:text-blue-800 hover:underline cursor-pointer focus:outline-none select-none shrink-0"
                                    title="View Customer Profile"
                                  >
                                    #{order.userId.slice(-8).toUpperCase()}
                                  </button>
                                )}
                              </div>
                              <div className="text-[10px] font-bold text-gray-400">{order.customerPhone}</div>
                            </td>
                            <td className="py-4 px-3 font-black text-gray-900">৳{order.total}</td>
                            <td className="py-4 px-3 text-emerald-500">৳{order.amountPaid || 0}</td>
                            <td className="py-4 px-3 text-gray-400 font-normal">৳{order.amountDue || 0}</td>
                            <td className="py-4 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                                order.status === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  order.status === 'cancellation_pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                {order.status === 'cancellation_pending' ? 'Cancellation Pending' : order.status}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-green-50 text-green-700 border-green-200">
                                PAID
                              </span>
                            </td>
                            <td className="py-4 px-3 text-right">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRowExpand(order.id);
                                }}
                                className="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-md active:scale-95 shrink-0"
                              >
                                {expandedOrderHistory === order.id ? "Hide History" : "View History"}
                              </Button>
                            </td>
                          </tr>

                          {/* EXPANDED INLINE AUDIT TRAIL */}
                          {expandedOrderHistory === order.id && (
                            <tr className="bg-slate-50/60 border-y border-slate-100">
                              <td colSpan={10} className="py-3 px-6">
                                <div className="max-w-2xl bg-white rounded-2xl p-5 border border-slate-100 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex justify-between items-center">
                                    <span>Detailed Allocation & Payment Audit Trail</span>
                                    {expandedLoading && <span className="text-amber-600 animate-pulse text-[8px] tracking-normal font-bold uppercase">Retrieving...</span>}
                                  </h4>

                                  {expandedLoading && !expandedHistoryData ? (
                                    <div className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider animate-pulse">
                                      Retrieving Ledger History...
                                    </div>
                                  ) : !expandedHistoryData || expandedHistoryData.history.length === 0 ? (
                                    <div className="text-[10px] text-gray-400 font-bold italic py-2.5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-100">
                                      No payment allocations recorded for this invoice yet.
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-tight flex justify-between px-1 border-b border-slate-100 pb-1">
                                        <span>Initial Order Charge:</span>
                                        <span className="font-extrabold text-slate-900">৳{expandedHistoryData.orderTotal}</span>
                                      </div>
                                      <div className="space-y-2 pl-3 border-l border-slate-200">
                                        {(() => {
                                          let currentRemaining = expandedHistoryData.orderTotal;
                                          return expandedHistoryData.history.map((item: any, idx: number) => {
                                            currentRemaining = Math.max(0, currentRemaining - item.amount);
                                            return (
                                              <div key={item.id || idx} className="text-xs text-gray-700 py-2 relative pl-4">
                                                {/* Bullet dot */}
                                                <div className="absolute left-[-16.5px] top-3.5 w-2 h-2 rounded-full bg-slate-400 border border-white" />
                                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                  <div className="font-black text-gray-900 uppercase text-[10px]">
                                                    {item.label}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {item.documentUrl && (
                                                      <a
                                                        href={item.documentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-amber-600 hover:text-amber-800 transition-colors inline-flex items-center gap-1 border border-amber-200 bg-amber-50/50 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest leading-none"
                                                        title="View Proof Document"
                                                      >
                                                        <Eye className="w-3 h-3" /> View Proof
                                                      </a>
                                                    )}
                                                    <div className="font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                                      -৳{item.amount}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
                                                  <span>Collected: <strong className="text-slate-600">{new Date(item.createdAt).toLocaleString()}</strong></span>
                                                  <span>Method: <strong className="text-slate-600">{formatPaymentMethod(item.paymentMethod)}</strong></span>
                                                  <span>By: <strong className="text-slate-600">{item.recordedBy}</strong></span>
                                                  <span className="ml-auto text-slate-500 font-semibold">Remaining: <strong className="text-slate-700 font-black">৳{currentRemaining}</strong></span>
                                                </div>
                                                {item.notes && (
                                                  <div className="text-[10px] text-gray-400 italic mt-1 font-medium bg-slate-50 px-2 py-1 rounded-md border border-slate-100/50 w-fit flex items-center gap-2">
                                                    <span>Remarks: "{item.notes}"</span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMER BALANCES & WALLETS */}
          {activeTab === "shops" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Shop Balances Role Selector Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1 bg-gray-100/70 p-1.5 rounded-2xl w-fit">
                  <button
                    type="button"
                    onClick={() => setShopFilter("all")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${shopFilter === "all"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    All Accounts
                  </button>
                  <button
                    type="button"
                    onClick={() => setShopFilter("customer")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${shopFilter === "customer"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Customers
                  </button>
                  <button
                    type="button"
                    onClick={() => setShopFilter("b2b")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${shopFilter === "b2b"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Retailers & Dealer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShopFilter("staff")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${shopFilter === "staff"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Staffs
                  </button>
                  <button
                    type="button"
                    onClick={() => setShopFilter("other")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${shopFilter === "other"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                      : "text-gray-400 hover:text-gray-900"
                      }`}
                  >
                    Others (Corporate/Influencer)
                  </button>
                </div>
                <Button
                  onClick={handleExportShops}
                  variant="outline"
                  className="border-2 border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 uppercase tracking-wider text-[10px] font-black h-11"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Accounts</span>
                  <span className="text-base font-black text-slate-800 mt-1">{shopStats.totalShops}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Orders</span>
                  <span className="text-base font-black text-slate-800 mt-1">৳{shopStats.totalOrders.toLocaleString()}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Paid</span>
                  <span className="text-base font-black text-emerald-600 mt-1">৳{shopStats.totalPaid.toLocaleString()}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Due</span>
                  <span className="text-base font-black text-rose-500 mt-1">৳{shopStats.totalDue.toLocaleString()}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Net Wallet Balance</span>
                  <span className={`text-base font-black mt-1 ${shopStats.netBalance >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {shopStats.netBalance >= 0 ? "+" : ""}৳{shopStats.netBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th
                        onClick={() => handleSort("id")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Account ID {renderSortIndicator("id")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("name")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Account Name {renderSortIndicator("name")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("mobile")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Mobile {renderSortIndicator("mobile")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("customerType")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Account Type {renderSortIndicator("customerType")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("isRetailerApproved")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Probation Status {renderSortIndicator("isRetailerApproved")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("totalOrderAmount")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Total Order {renderSortIndicator("totalOrderAmount")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("totalPaidAmount")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Total Paid {renderSortIndicator("totalPaidAmount")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("totalDueAmount")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Due {renderSortIndicator("totalDueAmount")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("accountBalance")}
                        className="py-4 px-3 cursor-pointer select-none hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          Account Balance {renderSortIndicator("accountBalance")}
                        </div>
                      </th>
                      <th className="py-4 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                    {sortedShops.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-400 uppercase tracking-wider">No shop profiles found.</td>
                      </tr>
                    ) : (
                      sortedShops.map((shop) => (
                        <tr key={shop.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-3">
                            <button
                              type="button"
                              onClick={() => fetchCustomerDetails(shop.id, shop.customerType?.toLowerCase() === "guest" || shop.customerType === "Guest" ? shop.mobile : undefined)}
                              className="font-mono text-xs font-black text-blue-600 hover:text-blue-800 hover:underline cursor-pointer focus:outline-none"
                              title="View Customer Profile"
                            >
                              #{shop.id.slice(-8).toUpperCase()}
                            </button>
                          </td>
                          <td className="py-4 px-3">
                            <span className="font-bold text-gray-900 uppercase tracking-tight">{shop.name}</span>
                            <div className="text-[10px] text-gray-400">{shop.email}</div>
                          </td>
                          <td className="py-4 px-3 text-gray-500">{shop.mobile}</td>
                          <td className="py-4 px-3 uppercase tracking-wider text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-black border ${shop.customerType?.toLowerCase() === "dealer"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : shop.customerType?.toLowerCase() === "retailer"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : shop.customerType?.toLowerCase() === "guest"
                                  ? "bg-gray-100 text-gray-400 border-gray-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                              {shop.customerType}
                            </span>
                          </td>
                          <td className="py-4 px-3">
                            {shop.customerType === "retailer" ? (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${shop.isRetailerApproved
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                                }`}>
                                {shop.isRetailerApproved ? "Approved" : "Probation"}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-4 px-3 font-bold text-gray-900">
                            ৳{(shop.totalOrderAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-3 font-bold text-emerald-600">
                            ৳{(shop.totalPaidAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-3 font-bold text-rose-500">
                            ৳{(shop.totalDueAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-3">
                            {(() => {
                              const balance = (shop.walletBalance || 0) - (shop.dueBalance || 0);
                              if (balance < 0) {
                                return <span className="text-rose-500 font-black">-৳{Math.abs(balance)}</span>;
                              }
                              if (balance > 0) {
                                return <span className="text-emerald-500 font-black">+৳{balance}</span>;
                              }
                              return <span className="text-gray-400 font-normal">৳0</span>;
                            })()}
                          </td>
                          <td className="py-4 px-3 text-right flex items-center justify-end gap-2">
                            {shop.customerType !== "Guest" ? (
                              <Button
                                onClick={() => {
                                  setWalletDepositShop(shop);
                                  setCashAmount("");
                                }}
                                className="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all"
                              >
                                Add Deposit
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-[10px] font-black uppercase italic tracking-wider px-3">No Wallet</span>
                            )}
                            <Button
                              onClick={() => fetchCustomerDetails(shop.id, shop.customerType === "Guest" ? shop.mobile : undefined)}
                              className="bg-amber-600 hover:bg-black text-white px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all"
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTION LEDGERS */}
          {activeTab === "ledgers" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Transaction history trail</span>
                <Button
                  onClick={handleExportLedgers}
                  variant="outline"
                  className="border-2 border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 uppercase tracking-wider text-[10px] font-black h-11"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="py-4 px-3">TxID</th>
                      <th className="py-4 px-3">Tx Time</th>
                      <th className="py-4 px-3">Account Info</th>
                      <th className="py-4 px-3">Tx Type</th>
                      <th className="py-4 px-3">Reference</th>
                      <th className="py-4 px-3">Method</th>
                      <th className="py-4 px-3">Amount</th>
                      <th className="py-4 px-3">Proof</th>
                      <th className="py-4 px-3">Recorded By</th>
                      <th className="py-4 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                    {filteredLedgers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-gray-400 uppercase tracking-wider">No transaction ledger logs found.</td>
                      </tr>
                    ) : (
                      filteredLedgers.map((log) => {
                        const u = log.userId;
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-3 font-mono font-black text-gray-900">
                              #{log.id.slice(-8).toUpperCase()}
                            </td>
                            <td className="py-4 px-3 text-gray-400 text-[10px] whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="py-4 px-3">
                              {u ? (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => fetchCustomerDetails(u.id, ['guest', 'Guest'].includes(u.customerType) ? u.mobile : undefined)}
                                      className="font-mono text-[9px] font-black text-blue-600 hover:text-blue-800 hover:underline cursor-pointer focus:outline-none shrink-0"
                                      title="View Customer Profile"
                                    >
                                      #{u.id.startsWith("guest-") ? u.id.replace("guest-", "").slice(-8).toUpperCase() : u.id.slice(-8).toUpperCase()}
                                    </button>
                                    <span className="font-bold text-gray-900">{u.name}</span>
                                    {renderTypeBadge(u.customerType)}
                                  </div>
                                  <div className="text-[9px] text-gray-400">{u.mobile}</div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 font-bold">Guest Customer</span>
                                  {renderTypeBadge("guest")}
                                </div>
                              )}
                            </td>
                          <td className="py-4 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${log.type === "collection"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : log.type === "wallet_deposit"
                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                              {log.type.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-4 px-3 font-mono text-[10px] text-gray-600 font-bold">
                            {(() => {
                              if (log.type === "collection") {
                                return log.orderId ? (
                                  <a
                                    href={`/admin/orders?q=${log.orderId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                    title="View Order in Orders List"
                                  >
                                    #{log.orderId.slice(-8).toUpperCase()}
                                  </a>
                                ) : "—";
                              }
                              if (log.type === "wallet_deposit" || log.type === "wallet_deduction") {
                                const userIdStr = log.userId ? (log.userId.id || (log.userId as any)._id?.toString()) : null;
                                return userIdStr ? (
                                  <a
                                    href={`/admin/collections?tab=shops&q=${userIdStr}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left font-mono text-[10px] font-bold"
                                    title="View Customer Balance"
                                  >
                                    #{userIdStr.slice(-8).toUpperCase()}
                                  </a>
                                ) : "—";
                              }
                              return "—";
                            })()}
                          </td>
                          <td className="py-4 px-3 uppercase tracking-wider text-[10px] text-gray-500">
                            {log.paymentMethod.startsWith("bank") ? (
                              <div className="flex flex-col">
                                <span className="font-bold">BANK TRANSFER</span>
                                {log.paymentMethod !== "bank" && (
                                  <span className="text-[9px] text-amber-600 font-black tracking-normal normal-case mt-0.5">
                                    {log.paymentMethod === "bank_ucb" ? "UCB Bank" :
                                      log.paymentMethod === "bank_brac" ? "Brac Bank" :
                                        log.paymentMethod === "bank_nrbc" ? "NRBC Bank" :
                                          log.paymentMethod.replace("bank_", "").toUpperCase() + " Bank"}
                                  </span>
                                )}
                              </div>
                            ) : (
                              formatPaymentMethod(log.paymentMethod)
                            )}
                          </td>
                          <td className="py-4 px-3 font-black text-gray-900">৳{log.amount}</td>
                          <td className="py-4 px-3">
                            {log.documentUrl ? (
                              <a
                                href={log.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-600 hover:text-amber-800 transition-colors inline-flex items-center gap-1 border border-amber-200 bg-amber-50/50 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest leading-none"
                                title="View Proof Document"
                              >
                                <Eye className="w-3 h-3" /> View Proof
                              </a>
                            ) : (
                              <span className="text-gray-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="py-4 px-3 text-gray-400">{log.recordedBy}</td>
                          <td className="py-4 px-3 text-gray-400 font-normal max-w-[200px] truncate">
                            <span>{log.notes || "—"}</span>
                          </td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: RECONCILE CASH FROM ORDER */}
      {reconcileOrder && (
        <div
          onClick={() => setReconcileOrder(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic">Reconcile Payment</h3>
              <button onClick={() => setReconcileOrder(null)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReconcileSubmit} className="space-y-4">
              {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-bold text-xs">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl font-bold text-xs">{successMsg}</div>}

              {/* Order Info Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs font-bold text-slate-500">
                <div className="flex justify-between">
                  <span>Order Reference</span>
                  <span className="text-gray-900 font-mono font-black">#{reconcileOrder.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shopkeeper / Store</span>
                  <span className="text-gray-900">{reconcileOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mobile Number</span>
                  <span className="text-gray-900 font-mono">{reconcileOrder.customerPhone || "—"}</span>
                </div>
                {reconcileOrder.customerEmail && (
                  <div className="flex justify-between">
                    <span>Email Address</span>
                    <span className="text-gray-900">{reconcileOrder.customerEmail}</span>
                  </div>
                )}
                {(reconcileOrder.address || reconcileOrder.city) && (
                  <div className="flex justify-between">
                    <span>Billing Destination</span>
                    <span className="text-gray-900 text-right max-w-[200px] truncate" title={`${reconcileOrder.address || ""}${reconcileOrder.city ? `, ${reconcileOrder.city}` : ""}${reconcileOrder.postalCode ? ` - ${reconcileOrder.postalCode}` : ""}`}>
                      {reconcileOrder.address ? `${reconcileOrder.address}${reconcileOrder.city ? `, ${reconcileOrder.city}` : ""}` : reconcileOrder.city}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200/50 pt-2 mt-2 font-black">
                  <span>Total Order Invoice</span>
                  <span className="text-gray-900">৳{reconcileOrder.total}</span>
                </div>
                <div className="flex justify-between text-rose-500 font-black">
                  <span>Outstanding Dues</span>
                  <span>৳{reconcileOrder.paymentStatus === "paid" ? 0 : (reconcileOrder.amountDue || reconcileOrder.total)}</span>
                </div>
              </div>

              {/* Order Payment History Audit Trail */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-200/50 pb-1.5 flex justify-between items-center">
                  <span>Payment History & Allocations</span>
                  {historyLoading && <span className="text-amber-600 animate-pulse text-[8px] tracking-normal font-bold uppercase">Loading...</span>}
                </h4>
                {historyLoading && !paymentHistory ? (
                  <div className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider animate-pulse">
                    Retrieving Ledger History...
                  </div>
                ) : !paymentHistory || paymentHistory.history.length === 0 ? (
                  <div className="text-[10px] text-gray-400 font-bold italic py-1 text-center">
                    No payment allocations recorded for this order yet.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                    <div className="space-y-2 pl-3 border-l border-slate-200">
                      {(() => {
                        let currentRemaining = paymentHistory.orderTotal;
                        return paymentHistory.history.map((item, idx) => {
                          currentRemaining = Math.max(0, currentRemaining - item.amount);
                          return (
                            <div key={item.id || idx} className="text-xs text-gray-700 py-1.5 relative pl-4">
                              {/* Bullet dot */}
                              <div className="absolute left-[-16.5px] top-3.5 w-2 h-2 rounded-full bg-slate-400 border border-white" />
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="font-black text-gray-900 uppercase text-[10px]">
                                  {item.label}
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.documentUrl && (
                                    <a
                                      href={item.documentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-amber-600 hover:text-amber-800 transition-colors inline-flex items-center gap-1 border border-amber-200 bg-amber-50/50 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest leading-none"
                                      title="View Proof Document"
                                    >
                                      <Eye className="w-3 h-3" /> View Proof
                                    </a>
                                  )}
                                  <div className="font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                                    -৳{item.amount}
                                  </div>
                                </div>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
                                <span>Collected: <strong className="text-slate-600">{new Date(item.createdAt).toLocaleString()}</strong></span>
                                <span>Method: <strong className="text-slate-600">{formatPaymentMethod(item.paymentMethod)}</strong></span>
                                <span>By: <strong className="text-slate-600">{item.recordedBy}</strong></span>
                                <span className="ml-auto text-slate-500 font-semibold">Remaining: <strong className="text-slate-700 font-black">৳{currentRemaining}</strong></span>
                              </div>
                              {item.notes && (
                                <div className="text-[10px] text-gray-400 italic mt-1 font-medium bg-slate-50 px-2 py-1 rounded-md border border-slate-100/50 w-fit flex items-center gap-2">
                                  <span>Remarks: "{item.notes}"</span>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Amount Collected *</label>
                <input
                  type="number"
                  required
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Amount in BDT"
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Collection Mode *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPaymentMethod(val);
                    if (val === "bank") {
                      setSelectedBank("bank_ucb");
                    } else {
                      setSelectedBank("");
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 appearance-none"
                >
                  <option value="cash">Cash Collection</option>
                  <option value="bkash">bKash Merchant</option>
                  <option value="nagad">Nagad Merchant</option>
                  <option value="bank">Direct Bank Transfer</option>
                </select>
              </div>

              {paymentMethod === "bank" && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Bank *</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 appearance-none"
                  >
                    <option value="bank_ucb">UCB bank</option>
                    <option value="bank_brac">Brac bank</option>
                    <option value="bank_nrbc">NRBC bank</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Reconciliation Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Collected by SR, partial collection"
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 h-20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Proof Document (Optional)</label>
                {!documentUrl ? (
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-amber-600 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-amber-50/10 transition-all cursor-pointer group text-center">
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider animate-pulse">Uploading Document...</span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setIsUploading(true);
                            setErrorMsg("");
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("folder", "collections");

                            try {
                              const token = localStorage.getItem("token");
                              const res = await fetch("/api/admin/upload", {
                                method: "POST",
                                headers: {
                                  Authorization: `Bearer ${token}`
                                },
                                body: formData
                              });

                              if (res.ok) {
                                const data = await res.json();
                                setDocumentUrl(data.url);
                              } else {
                                const errData = await res.json();
                                setErrorMsg(errData.error || "Upload failed");
                              }
                            } catch (err: any) {
                              setErrorMsg("Upload failed: " + err.message);
                            } finally {
                              setIsUploading(false);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors mb-1.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition-colors">Upload Payment Proof</span>
                        <span className="text-[8px] text-slate-400 font-medium mt-0.5">Supports JPG, PNG, WEBP</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail Preview */}
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                        <img
                          src={documentUrl}
                          alt="Proof preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 shrink-0" /> Uploaded
                        </span>
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-0.5 truncate hover:underline"
                        >
                          <Eye className="w-3 h-3" /> View Original
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDocumentUrl("")}
                      className="bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100 hover:border-rose-100 transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-amber-600 hover:bg-black disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-900/10"
              >
                {actionLoading ? "Recording Payment..." : "Record Payment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD DIRECT WALLET DEPOSIT */}
      {walletDepositShop && (
        <div
          onClick={() => setWalletDepositShop(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic">Log Wallet Deposit</h3>
              <button onClick={() => setWalletDepositShop(null)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWalletDepositSubmit} className="space-y-4">
              {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-bold text-xs">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl font-bold text-xs">{successMsg}</div>}

              {/* Shop info summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs font-bold text-slate-500">
                <div className="flex justify-between">
                  <span>Store Name</span>
                  <span className="text-gray-900">{walletDepositShop.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Dues</span>
                  <span className="text-rose-500">৳{walletDepositShop.dueBalance || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wallet Balance</span>
                  <span className="text-emerald-500">৳{walletDepositShop.walletBalance || 0}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Deposit Amount *</label>
                <input
                  type="number"
                  required
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Amount in BDT"
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Deposit Mode *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPaymentMethod(val);
                    if (val === "bank") {
                      setSelectedBank("bank_ucb");
                    } else {
                      setSelectedBank("");
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 appearance-none"
                >
                  <option value="cash">Cash Payment</option>
                  <option value="bkash">bKash Mobile</option>
                  <option value="nagad">Nagad Mobile</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              {paymentMethod === "bank" && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Bank *</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 appearance-none"
                  >
                    <option value="bank_ucb">UCB bank</option>
                    <option value="bank_brac">Brac bank</option>
                    <option value="bank_nrbc">NRBC bank</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Deposit Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Prepayment for monthly bulk order"
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 h-20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Proof Document (Optional)</label>
                {!documentUrl ? (
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-amber-600 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-amber-50/10 transition-all cursor-pointer group text-center">
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider animate-pulse">Uploading Document...</span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setIsUploading(true);
                            setErrorMsg("");
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("folder", "collections");

                            try {
                              const token = localStorage.getItem("token");
                              const res = await fetch("/api/admin/upload", {
                                method: "POST",
                                headers: {
                                  Authorization: `Bearer ${token}`
                                },
                                body: formData
                              });

                              if (res.ok) {
                                const data = await res.json();
                                setDocumentUrl(data.url);
                              } else {
                                const errData = await res.json();
                                setErrorMsg(errData.error || "Upload failed");
                              }
                            } catch (err: any) {
                              setErrorMsg("Upload failed: " + err.message);
                            } finally {
                              setIsUploading(false);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors mb-1.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition-colors">Upload Payment Proof</span>
                        <span className="text-[8px] text-slate-400 font-medium mt-0.5">Supports JPG, PNG, WEBP</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail Preview */}
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                        <img
                          src={documentUrl}
                          alt="Proof preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 shrink-0" /> Uploaded
                        </span>
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-0.5 truncate hover:underline"
                        >
                          <Eye className="w-3 h-3" /> View Original
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDocumentUrl("")}
                      className="bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100 hover:border-rose-100 transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* LIVE SIMULATION PREVIEW */}
              {walletDepositShop && (
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
                    <span>Reconciliation Simulator (FIFO)</span>
                    {depositModalLoading && <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />}
                  </h4>

                  {depositModalLoading ? (
                    <div className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider animate-pulse">
                      Simulating allocation logic...
                    </div>
                  ) : depositModalOrders.length === 0 ? (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-800 text-[10px] font-medium leading-relaxed">
                      No outstanding unpaid orders found. The full deposit of <strong className="text-emerald-700 font-extrabold">৳{(parseFloat(cashAmount) || 0).toLocaleString()}</strong> will credit their wallet balance.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                      {simulatedAllocations.allocations.map((alloc) => (
                        <div key={alloc.id} className="bg-white border border-slate-100 rounded-xl p-2.5 space-y-1.5 text-[11px] font-medium text-slate-500">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-700">Invoice #{alloc.id.slice(-8).toUpperCase()}</span>
                            <span className="text-[9px] font-bold text-gray-400">{new Date(alloc.createdAt).toLocaleDateString("en-GB")}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span>Due Before: ৳{alloc.dueBefore.toLocaleString()}</span>
                            <span>Allocated: <strong className={alloc.allocated > 0 ? "text-emerald-600 font-extrabold" : "text-slate-400"}>৳{alloc.allocated.toLocaleString()}</strong></span>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 mt-1">
                            <span className="text-[9.5px]">Due After: <strong className="text-slate-800 font-extrabold">৳{alloc.dueAfter.toLocaleString()}</strong></span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${alloc.statusAfter === "paid"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : alloc.statusAfter === "partial"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-rose-50 text-rose-500 border-rose-100"
                              }`}>
                              {alloc.statusAfter}
                            </span>
                          </div>
                        </div>
                      ))}

                      {simulatedAllocations.leftoverWalletCredit > 0 && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-xl flex items-center justify-between">
                          <span>Leftover Wallet Credit:</span>
                          <span className="text-emerald-700 font-extrabold">+৳{simulatedAllocations.leftoverWalletCredit.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>If the shop has outstanding dues, this deposit will automatically clear the dues first. Any leftover funds will credit the wallet.</span>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-amber-600 hover:bg-black disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-900/10"
              >
                {actionLoading ? "Processing Deposit..." : "Deposit Funds & Reconcile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOMER DETAILS / PROFILE VIEW */}
      {selectedCustomerDetails && (
        <div
          onClick={() => setSelectedCustomerDetails(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic">Customer Profile & Details</h3>
              <div className="flex items-center gap-3">
                {selectedCustomerDetails.user.customerType !== "Guest" && (
                  <Button
                    onClick={() => window.open(`/admin/collections/statement/${selectedCustomerDetails.user.id}`, '_blank')}
                    className="bg-amber-600 hover:bg-black text-white px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all"
                  >
                    PDF Statement
                  </Button>
                )}
                <button
                  onClick={() => setSelectedCustomerDetails(null)}
                  className="text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Profile Summary Card */}
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100/50 space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h4 className="text-base font-black text-gray-900 uppercase tracking-tight">{selectedCustomerDetails.user.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Customer ID: #{selectedCustomerDetails.user.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-black border uppercase text-[9px] ${selectedCustomerDetails.user.customerType?.toLowerCase() === "dealer"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : selectedCustomerDetails.user.customerType?.toLowerCase() === "retailer"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : selectedCustomerDetails.user.customerType?.toLowerCase() === "guest"
                          ? "bg-gray-100 text-gray-400 border-gray-200"
                          : selectedCustomerDetails.user.customerType?.toLowerCase() !== "customer"
                            ? "bg-teal-50 text-teal-700 border-teal-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                      {selectedCustomerDetails.user.customerType?.replace("_", " ")}
                    </span>
                    {selectedCustomerDetails.user.customerType === "retailer" && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${selectedCustomerDetails.user.isRetailerApproved
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-rose-50 text-rose-600 border-rose-200"
                        }`}>
                        {selectedCustomerDetails.user.isRetailerApproved ? "Approved" : "Probation"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-500 border-t border-slate-200/50 pt-4">
                  <div className="space-y-1">
                    <div>Mobile: <span className="text-gray-900 font-mono">{selectedCustomerDetails.user.mobile}</span></div>
                    <div>Email: <span className="text-gray-900">{selectedCustomerDetails.user.email || "—"}</span></div>
                    <div>Customer Since: <span className="text-gray-900">{selectedCustomerDetails.user.createdAt ? new Date(selectedCustomerDetails.user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</span></div>
                  </div>
                  <div className="space-y-1 md:text-right">
                    <div>
                      {selectedCustomerDetails.user.walletBalance < 0 ? (
                        <>Outstanding Due: <span className="text-rose-600">৳{Math.abs(selectedCustomerDetails.user.walletBalance).toLocaleString()}</span></>
                      ) : (
                        <>Wallet Balance: <span className="text-emerald-600">৳{selectedCustomerDetails.user.walletBalance.toLocaleString()}</span></>
                      )}
                    </div>
                    {selectedCustomerDetails.user.customerType === "retailer" && !selectedCustomerDetails.user.isRetailerApproved && (
                      <div>Credit Limit: <span className="text-gray-900">৳{selectedCustomerDetails.user.creditLimit.toLocaleString()}</span></div>
                    )}
                    <div>Account Created By: <span className="text-gray-900">
                      {selectedCustomerDetails.user.customerType === "Guest" ? "Guest Checkout" :
                        selectedCustomerDetails.user.referredBySR
                          ? `SR (${selectedCustomerDetails.user.referredBySR.name})`
                          : "Self"}
                    </span></div>
                  </div>
                </div>

                <div className="border-t border-slate-200/50 pt-3 text-xs font-bold text-slate-500">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Last Billing Address</span>
                  <span className="text-gray-800 font-medium leading-relaxed">
                    {selectedCustomerDetails.orders[0]?.address || "No billing address recorded."}
                  </span>
                </div>
              </div>

              {/* Orders History Section */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 flex justify-between items-center">
                  <span>Order History ({selectedCustomerDetails.orders.length})</span>
                </h4>
                {selectedCustomerDetails.orders.length === 0 ? (
                  <div className="text-center py-4 text-xs font-bold italic text-gray-400">No orders recorded for this customer.</div>
                ) : (
                  <div className="space-y-2.5">
                    {(showAllOrders
                      ? selectedCustomerDetails.orders
                      : selectedCustomerDetails.orders.slice(0, 5)
                    ).map((order) => (
                      <div key={order.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between text-xs gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={`/admin/orders?q=${order.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono font-black text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              #{order.id.slice(-8).toUpperCase()}
                            </a>
                            <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                          </div>
                          {(order.customerName || order.customerPhone) && (
                            <div className="text-[10px] font-bold text-gray-700 flex items-center gap-1.5 flex-wrap">
                              {order.customerName && <span>{order.customerName}</span>}
                              {order.customerPhone && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <span className="font-mono text-gray-500">{order.customerPhone}</span>
                                </>
                              )}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-500 max-w-md truncate">{order.address}</div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <div className="font-black text-gray-900">৳{order.total.toLocaleString()}</div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8.5px] font-black uppercase tracking-wider border ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                              order.status === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                              {order.status}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8.5px] font-black uppercase tracking-wider border ${order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              order.paymentStatus === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedCustomerDetails.orders.length > 5 && (
                      <button
                        onClick={() => setShowAllOrders(prev => !prev)}
                        className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200/80 transition-colors text-[9px] font-black uppercase tracking-widest rounded-xl text-slate-500"
                      >
                        {showAllOrders ? "Show Less" : `View Rest (${selectedCustomerDetails.orders.length - 5} More Orders)`}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Payment History Section */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 flex justify-between items-center">
                  <span>Payment History & Collections ({selectedCustomerDetails.payments.length})</span>
                </h4>
                {selectedCustomerDetails.payments.length === 0 ? (
                  <div className="text-center py-4 text-xs font-bold italic text-gray-400">No payment transaction records.</div>
                ) : (
                  <div className="space-y-2.5">
                    {(showAllPayments
                      ? selectedCustomerDetails.payments
                      : selectedCustomerDetails.payments.slice(0, 5)
                    ).map((pm) => (
                      <div key={pm.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedCustomerDetails(null);
                                setActiveTab("ledgers");
                                setSearchQuery(pm.id);
                              }}
                              className="font-mono text-[10.5px] text-blue-600 hover:text-blue-800 hover:underline font-black shrink-0"
                              title="Find in Ledgers Table"
                            >
                              #{pm.id.slice(-8).toUpperCase()}
                            </button>
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8.5px] font-black uppercase tracking-wider border ${pm.type === "collection"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : pm.type === "wallet_deposit"
                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                              {pm.type.replace("_", " ")}
                            </span>
                            <span className="text-[10px] text-gray-400">{new Date(pm.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {pm.documentUrl && (
                              <a
                                href={pm.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-600 hover:text-amber-800 font-bold hover:underline inline-flex items-center gap-0.5 text-[10px]"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Proof
                              </a>
                            )}
                            <div className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-100">
                              ৳{pm.amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400 flex flex-wrap gap-x-3 gap-y-0.5 justify-between">
                          <span>Method: <strong className="text-slate-600">{formatPaymentMethod(pm.paymentMethod)}</strong></span>
                          <span>Operator: <strong className="text-slate-600">{pm.recordedBy}</strong></span>
                        </div>
                        {pm.notes && (
                          <div className="text-[10px] text-gray-400 italic bg-white p-2 rounded border border-slate-100/50 mt-1">
                            Remarks: "{pm.notes}"
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedCustomerDetails.payments.length > 5 && (
                      <button
                        onClick={() => setShowAllPayments(prev => !prev)}
                        className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200/80 transition-colors text-[9px] font-black uppercase tracking-widest rounded-xl text-slate-500"
                      >
                        {showAllPayments ? "Show Less" : `View Rest (${selectedCustomerDetails.payments.length - 5} More Payments)`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP MODAL */}
      {confirmAction && (
        <div
          onClick={() => setConfirmAction(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3 border-b pb-3 mb-4">
              <h3 className="text-md font-black text-gray-900 uppercase tracking-tighter italic">
                {confirmAction.title}
              </h3>
            </div>
            <p className="text-xs text-gray-500 font-bold leading-relaxed mb-6">
              {confirmAction.message}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setConfirmAction(null)}
                variant="outline"
                className="flex-1 border-2 border-gray-200 rounded-xl hover:bg-gray-50 uppercase tracking-wider text-[9px] font-black h-11"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="flex-1 bg-amber-600 hover:bg-black text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg h-11 transition-all"
              >
                Confirm & Proceed
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
