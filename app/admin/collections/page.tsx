"use client";

import React, { useState, useEffect } from "react";
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
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  createdAt: string;
}

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState<"invoices" | "shops" | "ledgers">("invoices");
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [reconcileOrder, setReconcileOrder] = useState<Order | null>(null);
  const [walletDepositShop, setWalletDepositShop] = useState<Shop | null>(null);
  
  // Form states
  const [cashAmount, setCashAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/collections?type=all", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setShops(data.shops || []);
        setLedgers(data.ledgers || []);
      }
    } catch (e) {
      console.error("Failed to load collections statistics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate top stats cards
  const totalOutstandingDues = shops.reduce((sum, s) => sum + (s.dueBalance || 0), 0);
  const totalWalletBalances = shops.reduce((sum, s) => sum + (s.walletBalance || 0), 0);
  
  // Calculate today's collections
  const today = new Date().toISOString().split("T")[0];
  const todayCollections = ledgers
    .filter(l => l.type === "collection" && l.createdAt.split("T")[0] === today)
    .reduce((sum, l) => sum + l.amount, 0);

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileOrder) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
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
          paymentMethod,
          notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Payment recorded successfully.");
        setCashAmount("");
        setNotes("");
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

  const handleWalletDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletDepositShop) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
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
          paymentMethod,
          notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Deposit logged successfully.");
        setCashAmount("");
        setNotes("");
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

  const handleApproveRetailer = async (shopId: string) => {
    if (!confirm("Are you sure you want to approve this retailer and increase credit limit to ৳50,000?")) return;
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

  // Filter listings based on query
  const filteredOrders = orders.filter(
    o =>
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      o.id.slice(-8).toUpperCase().includes(searchQuery.toUpperCase())
  );

  const filteredShops = shops.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mobile.includes(searchQuery) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredLedgers = ledgers.filter(
    l =>
      (l.userId?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.notes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.recordedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Button 
          onClick={fetchData} 
          variant="outline" 
          className="border-2 border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 self-start md:self-auto uppercase tracking-wider text-xs font-black"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Console
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Outstanding dues card */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
              Outstanding Shop Dues
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
              Total Prepayments / Wallets
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
      </div>

      {/* Main navigation tabs & search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-1 bg-gray-100/70 p-1.5 rounded-2xl">
          <button
            onClick={() => { setActiveTab("invoices"); setSearchQuery(""); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "invoices"
                ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                : "text-gray-400 hover:text-gray-900"
            }`}
          >
            Outstanding Invoices ({orders.length})
          </button>
          <button
            onClick={() => { setActiveTab("shops"); setSearchQuery(""); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "shops"
                ? "bg-white text-gray-900 shadow-md shadow-gray-200"
                : "text-gray-400 hover:text-gray-900"
            }`}
          >
            B2B Shop Balances ({shops.length})
          </button>
          <button
            onClick={() => { setActiveTab("ledgers"); setSearchQuery(""); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "ledgers"
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
              activeTab === "invoices" 
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="py-4 px-3">Order ID</th>
                    <th className="py-4 px-3">Date</th>
                    <th className="py-4 px-3">Customer Shop</th>
                    <th className="py-4 px-3">Grand Total</th>
                    <th className="py-4 px-3">Paid</th>
                    <th className="py-4 px-3">Outstanding Dues</th>
                    <th className="py-4 px-3">Status</th>
                    <th className="py-4 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400 uppercase tracking-wider">No outstanding delivered invoices found.</td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-3 font-mono text-gray-900 font-black">
                          #{order.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="py-4 px-3 text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-gray-900">{order.customerName}</div>
                          <div className="text-[10px] font-bold text-gray-400">{order.customerPhone}</div>
                        </td>
                        <td className="py-4 px-3 font-black text-gray-900">৳{order.total}</td>
                        <td className="py-4 px-3 text-emerald-500">৳{order.amountPaid || 0}</td>
                        <td className="py-4 px-3 text-rose-500 font-black">৳{order.amountDue ?? order.total}</td>
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            order.paymentStatus === "partial" 
                              ? "bg-amber-50 text-amber-600 border-amber-200" 
                              : "bg-rose-50 text-rose-600 border-rose-200"
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right">
                          <Button 
                            onClick={() => {
                              setReconcileOrder(order);
                              setCashAmount(String(order.amountDue ?? order.total));
                            }}
                            className="bg-amber-600 hover:bg-black text-white px-4 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-md active:scale-95 shrink-0"
                          >
                            Collect Cash
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: B2B SHOP BALANCES & WALLETS */}
          {activeTab === "shops" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="py-4 px-3">Shop Profile</th>
                    <th className="py-4 px-3">Mobile</th>
                    <th className="py-4 px-3">Customer Type</th>
                    <th className="py-4 px-3">Probation Status</th>
                    <th className="py-4 px-3">Outstanding Dues</th>
                    <th className="py-4 px-3">Wallet Balance</th>
                    <th className="py-4 px-3">Credit Limit</th>
                    <th className="py-4 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                  {filteredShops.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400 uppercase tracking-wider">No shop profiles found.</td>
                    </tr>
                  ) : (
                    filteredShops.map((shop) => (
                      <tr key={shop.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-3">
                          <div className="font-bold text-gray-900 uppercase tracking-tight">{shop.name}</div>
                          <div className="text-[10px] text-gray-400">{shop.email}</div>
                        </td>
                        <td className="py-4 px-3 text-gray-500">{shop.mobile}</td>
                        <td className="py-4 px-3 uppercase tracking-wider text-[10px]">
                          <span className={`px-2 py-0.5 rounded font-black border ${
                            shop.customerType === "dealer" 
                              ? "bg-purple-50 text-purple-600 border-purple-200" 
                              : shop.customerType === "retailer" 
                              ? "bg-amber-50 text-amber-600 border-amber-200" 
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {shop.customerType}
                          </span>
                        </td>
                        <td className="py-4 px-3">
                          {shop.customerType === "retailer" ? (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                              shop.isRetailerApproved 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                : "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                            }`}>
                              {shop.isRetailerApproved ? "Approved" : "Probation"}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-3 text-rose-500 font-black">
                          ৳{shop.dueBalance || 0}
                        </td>
                        <td className="py-4 px-3 text-emerald-500 font-black">
                          ৳{shop.walletBalance || 0}
                        </td>
                        <td className="py-4 px-3 text-gray-900">
                          ৳{shop.creditLimit || 10000}
                        </td>
                        <td className="py-4 px-3 text-right flex items-center justify-end gap-2">
                          {shop.customerType === "retailer" && !shop.isRetailerApproved && (
                            <button
                              onClick={() => handleApproveRetailer(shop.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center gap-1.5"
                            >
                              <Award className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          <Button
                            onClick={() => {
                              setWalletDepositShop(shop);
                              setCashAmount("");
                            }}
                            className="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all"
                          >
                            Add Deposit
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: TRANSACTION LEDGERS */}
          {activeTab === "ledgers" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="py-4 px-3">Date</th>
                    <th className="py-4 px-3">Shop Profile</th>
                    <th className="py-4 px-3">Transaction Type</th>
                    <th className="py-4 px-3">Payment Method</th>
                    <th className="py-4 px-3">Amount</th>
                    <th className="py-4 px-3">Recorded By</th>
                    <th className="py-4 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                  {filteredLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 uppercase tracking-wider">No transaction ledger logs found.</td>
                    </tr>
                  ) : (
                    filteredLedgers.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-3 text-gray-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-3">
                          {log.userId ? (
                            <div>
                              <div className="font-bold text-gray-900">{log.userId.name}</div>
                              <div className="text-[9px] text-gray-400">{log.userId.mobile}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Guest Customer</span>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                            log.type === "collection" 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                              : log.type === "wallet_deposit" 
                              ? "bg-blue-50 text-blue-600 border-blue-200" 
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {log.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-4 px-3 uppercase tracking-wider text-[10px] text-gray-500">
                          {log.paymentMethod}
                        </td>
                        <td className="py-4 px-3 font-black text-gray-900">৳{log.amount}</td>
                        <td className="py-4 px-3 text-gray-400">{log.recordedBy}</td>
                        <td className="py-4 px-3 text-gray-400 font-normal max-w-[200px] truncate">{log.notes || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: RECONCILE CASH FROM ORDER */}
      {reconcileOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic">Reconcile Cash Payment</h3>
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
                <div className="flex justify-between border-t border-slate-200/50 pt-2 mt-2 font-black">
                  <span>Total Order Invoice</span>
                  <span className="text-gray-900">৳{reconcileOrder.total}</span>
                </div>
                <div className="flex justify-between text-rose-500 font-black">
                  <span>Outstanding Dues</span>
                  <span>৳{reconcileOrder.amountDue ?? reconcileOrder.total}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cash Collected *</label>
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
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 appearance-none"
                >
                  <option value="cash">Cash Collection</option>
                  <option value="bkash">bKash Merchant</option>
                  <option value="nagad">Nagad Merchant</option>
                  <option value="bank">Direct Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Reconciliation Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Collected by SR, partial collection"
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 h-20"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-amber-600 hover:bg-black disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-900/10"
              >
                {actionLoading ? "Saving Cash Receipt..." : "Record Payment & Clear Invoice"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD DIRECT WALLET DEPOSIT */}
      {walletDepositShop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
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
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 appearance-none"
                >
                  <option value="cash">Cash Payment</option>
                  <option value="bkash">bKash Mobile</option>
                  <option value="nagad">Nagad Mobile</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Deposit Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Prepayment for monthly bulk order"
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-black focus:outline-none rounded-xl text-sm font-bold text-gray-900 h-20"
                />
              </div>

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
    </div>
  );
}
