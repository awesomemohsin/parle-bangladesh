"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Loader2, UserCheck, UserPlus, AlertCircle, X, User as UserIcon, ArrowUpDown, ChevronUp, ChevronDown, Calendar, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  customerType: string;
  status: "active" | "disabled";
  createdAt: string;
  ordersCount: number;
  totalProducts: number;
  totalSpent: number;
  isGuest?: boolean;
  flatDiscountPercent?: number;
  flatDiscountExpiresAt?: string;
  pendingApproval?: boolean;
}

type SortField = "ordersCount" | "totalProducts" | "totalSpent" | "createdAt";
type SortOrder = "asc" | "desc";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedType, setSelectedType] = useState<string>("");
  const [counts, setCounts] = useState({
    all: 0,
    guest: 0,
    customer: 0,
    retailer: 0,
    dealer: 0,
    staff: 0,
    student: 0,
    influencer: 0,
    corporate: 0,
    other: 0
  });
  
  // Demote Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    customer: Customer | null;
  }>({
    open: false,
    customer: null,
  });

  // Promote Modal State
  const [promoteModal, setPromoteModal] = useState<{
    open: boolean;
    customer: Customer | null;
  }>({
    open: false,
    customer: null,
  });

  const [promoType, setPromoType] = useState<"dealer" | "retailer" | "student" | "influencer" | "corporate" | "other">("dealer");
  const [customTypeName, setCustomTypeName] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [expirationDate, setExpirationDate] = useState("");

  // Customer Details Modal States
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<any>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);

  const fetchCustomerDetails = async (customerId: string, customerMobile?: string) => {
    setDetailsLoadingId(customerId);
    try {
      const url = `/api/admin/collections?type=customer-details&customerId=${customerId}${customerMobile ? `&customerMobile=${customerMobile}` : ""}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomerDetails(data);
      } else {
        toast.error("Failed to retrieve customer details.");
      }
    } catch (err) {
      toast.error("An error occurred while fetching customer details.");
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const formatPaymentMethod = (method: string) => {
    if (!method) return "CASH";
    const m = method.toLowerCase();
    if (m === "bank_ucb") return "BANK TRANSFER (UCB bank)";
    if (m === "bank_brac") return "BANK TRANSFER (Brac bank)";
    if (m === "bank_nrbc") return "BANK TRANSFER (NRBC bank)";
    if (m === "bank") return "BANK TRANSFER";
    return m.toUpperCase();
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = `/api/admin/customers?search=${encodeURIComponent(search)}&customerType=${selectedType}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (error) {
      toast.error("Error fetching customers");
    } finally {
      setLoading(false);
    }
  }, [search, selectedType, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortOrder === "asc" ? <ChevronUp className="w-3 h-3 ml-1 text-red-600" /> : <ChevronDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const handleConfirmAction = async () => {
    const { customer } = confirmModal;
    if (!customer) return;

    if (customer.isGuest) {
      toast.error("Guest customers cannot be modified");
      setConfirmModal({ ...confirmModal, open: false });
      return;
    }

    const newType = "customer";
    setUpdatingId(customer.id);
    setConfirmModal({ ...confirmModal, open: false });
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/customers`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: customer.id, customerType: newType }),
      });

      const contentType = response.headers.get("content-type");
      if (response.ok) {
        setCustomers(customers.map(c => c.id === customer.id ? { 
          ...c, 
          customerType: newType,
          flatDiscountPercent: undefined,
          flatDiscountExpiresAt: undefined
        } : c));
        toast.success("Demoted to Regular Customer");
      } else {
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          toast.error(data.error || "Update failed");
        } else {
          toast.error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      toast.error("Network error or invalid response");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePromoteSubmit = async () => {
    const { customer } = promoteModal;
    if (!customer) return;

    let finalType = promoType as string;
    if (promoType === "other") {
      if (!customTypeName.trim()) {
        toast.error("Please enter a custom type name");
        return;
      }
      finalType = customTypeName.trim().toLowerCase();
    }

    const payload: any = {
      id: customer.id,
      customerType: finalType
    };

    if (promoType !== "dealer" && promoType !== "retailer") {
      const percent = Number(discountPercent);
      if (isNaN(percent) || percent <= 0 || percent > 50) {
        toast.error("Custom customer discounts cannot exceed 50%. Please enter a percent between 1 and 50.");
        return;
      }
      if (!expirationDate) {
        toast.error("Please select an expiration date");
        return;
      }
      payload.flatDiscountPercent = percent;
      payload.flatDiscountExpiresAt = new Date(expirationDate).toISOString();
    }

    setUpdatingId(customer.id);
    setPromoteModal({ open: false, customer: null });

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/customers`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type");
      if (response.ok) {
        const data = await response.json();
        if (data.pendingApproval) {
          toast.success("✓ Sync Initiated: Promotion queued for Superadmin consensus!");
          setCustomers(customers.map(c => c.id === customer.id ? { ...c, pendingApproval: true } : c));
          return;
        }
        const updated = data.customer;
        setCustomers(customers.map(c => c.id === customer.id ? { 
          ...c, 
          customerType: updated.customerType,
          flatDiscountPercent: updated.flatDiscountPercent,
          flatDiscountExpiresAt: updated.flatDiscountExpiresAt
        } : c));
        toast.success(`Promoted successfully to ${updated.customerType}!`);
      } else {
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          toast.error(data.error || "Promotion failed");
        } else {
          toast.error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      toast.error("Network error or invalid response");
    } finally {
      setUpdatingId(null);
    }
  };

  const filterTabs = [
    { value: "", label: "All Roles", count: counts.all, activeStyle: "bg-gray-900 text-white shadow-lg shadow-gray-900/10 border-gray-900", inactiveStyle: "text-gray-500 hover:text-gray-950 border-gray-100 bg-white" },
    { value: "customer", label: "Regular", count: counts.customer, activeStyle: "bg-slate-600 text-white shadow-lg shadow-slate-600/10 border-slate-600", inactiveStyle: "bg-white text-slate-500 hover:text-slate-750 border-slate-100" },
    { value: "guest", label: "Guest", count: counts.guest, activeStyle: "bg-gray-500 text-white shadow-lg shadow-gray-500/10 border-gray-500", inactiveStyle: "bg-white text-gray-400 hover:text-gray-600 border-gray-105" },
    { value: "retailer", label: "Retailer", count: counts.retailer, activeStyle: "bg-blue-600 text-white shadow-lg shadow-blue-600/10 border-blue-600", inactiveStyle: "bg-blue-50/50 text-blue-700 border-blue-100 hover:bg-blue-50" },
    { value: "dealer", label: "Dealer", count: counts.dealer, activeStyle: "bg-amber-600 text-white shadow-lg shadow-amber-600/10 border-amber-600", inactiveStyle: "bg-amber-50/50 text-amber-700 border-amber-100 hover:bg-amber-50" },
    { value: "staff", label: "Staffs", count: counts.staff, activeStyle: "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10 border-emerald-600", inactiveStyle: "bg-emerald-50/50 text-emerald-700 border-emerald-100 hover:bg-emerald-50" },
    { value: "student", label: "Student", count: counts.student, activeStyle: "bg-rose-600 text-white shadow-lg shadow-rose-600/10 border-rose-600", inactiveStyle: "bg-rose-50/50 text-rose-700 border-rose-100 hover:bg-rose-50" },
    { value: "influencer", label: "Influencer", count: counts.influencer, activeStyle: "bg-violet-600 text-white shadow-lg shadow-violet-600/10 border-violet-600", inactiveStyle: "bg-violet-50/50 text-violet-700 border-violet-100 hover:bg-violet-50" },
    { value: "corporate", label: "Corporate", count: counts.corporate, activeStyle: "bg-sky-600 text-white shadow-lg shadow-sky-600/10 border-sky-600", inactiveStyle: "bg-sky-50/50 text-sky-700 border-sky-100 hover:bg-sky-50" },
    { value: "other", label: "Other", count: counts.other, activeStyle: "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 border-indigo-600", inactiveStyle: "bg-indigo-50/50 text-indigo-700 border-indigo-100 hover:bg-indigo-50" },
  ];

  const customerStats = useMemo(() => {
    let totalCustomers = customers.length;
    let totalOrders = customers.reduce((sum, c) => sum + (c.ordersCount || 0), 0);
    let totalProducts = customers.reduce((sum, c) => sum + (c.totalProducts || 0), 0);
    let totalSpent = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    return { totalCustomers, totalOrders, totalProducts, totalSpent };
  }, [customers]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">Customer <span className="text-red-600">Hub</span></h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Manage Dealer Privileges & Guest Orders</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH EMAIL / MOBILE / NAME"
            className="pl-10 h-10 border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div 
        className="flex items-center gap-1.5 mb-6 p-1.5 bg-gray-50/60 rounded-xl border border-gray-100/80 overflow-x-auto [&::-webkit-scrollbar]:hidden scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSelectedType(tab.value)}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all duration-200 shrink-0 select-none
              ${selectedType === tab.value ? tab.activeStyle : tab.inactiveStyle}
              hover:scale-[1.02] active:scale-[0.98] cursor-pointer
            `}
          >
            {tab.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-tight leading-none transition-colors duration-200 ${
              selectedType === tab.value 
                ? 'bg-white/20 text-white' 
                : 'bg-black/5 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 mb-6">
        <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Customers</span>
          <span className="text-base font-black text-slate-800 mt-1">{customerStats.totalCustomers}</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Orders</span>
          <span className="text-base font-black text-slate-800 mt-1">{customerStats.totalOrders}</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Products Purchased</span>
          <span className="text-base font-black text-slate-800 mt-1">{customerStats.totalProducts}</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total Spent</span>
          <span className="text-base font-black text-red-600 mt-1">৳{customerStats.totalSpent.toLocaleString()}</span>
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-xl shadow-gray-100 rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Info</th>
                
                <th 
                  className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center cursor-pointer hover:text-gray-900 transition-colors group"
                  onClick={() => toggleSort("createdAt")}
                >
                  <div className="flex items-center justify-center">
                    Joined <SortIcon field="createdAt" />
                  </div>
                </th>

                <th 
                  className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center cursor-pointer hover:text-gray-900 transition-colors group"
                  onClick={() => toggleSort("ordersCount")}
                >
                  <div className="flex items-center justify-center">
                    Orders <SortIcon field="ordersCount" />
                  </div>
                </th>
                
                <th 
                  className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center cursor-pointer hover:text-gray-900 transition-colors group"
                  onClick={() => toggleSort("totalProducts")}
                >
                  <div className="flex items-center justify-center">
                    Purchased Product <SortIcon field="totalProducts" />
                  </div>
                </th>
                
                <th 
                  className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center cursor-pointer hover:text-gray-900 transition-colors group"
                  onClick={() => toggleSort("totalSpent")}
                >
                  <div className="flex items-center justify-center">
                    Spent <SortIcon field="totalSpent" />
                  </div>
                </th>

                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Loader2 className="w-6 h-6 text-red-600 animate-spin mx-auto mb-2" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Customers...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No customers found</p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none">{customer.name || 'Anonymous'}</span>
                          {customer.isGuest && (
                             <span className="text-[8px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-widest border border-gray-200">Guest</span>
                          )}
                        </div>
                        <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          <span>{customer.email}</span>
                          {customer.mobile && (
                            <>
                              <span className="text-gray-200">|</span>
                              <span>{customer.mobile}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`flex flex-col items-center ${sortBy === 'createdAt' ? 'text-red-600' : 'text-gray-500'}`}>
                        <span className="text-[11px] font-black uppercase tracking-tighter">
                          {customer.createdAt ? format(new Date(customer.createdAt), "MMM dd, yyyy") : "N/A"}
                        </span>
                        <span className="text-[9px] font-bold opacity-50">
                          {customer.createdAt ? format(new Date(customer.createdAt), "hh:mm a") : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-black tabular-nums italic ${sortBy === 'ordersCount' ? 'text-red-600' : 'text-gray-900'}`}>{customer.ordersCount || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-black tabular-nums italic ${sortBy === 'totalProducts' ? 'text-red-600' : 'text-gray-900'}`}>{customer.totalProducts || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`flex items-center justify-center gap-1 text-sm font-black tabular-nums italic ${sortBy === 'totalSpent' ? 'text-red-600' : 'text-red-600/70'}`}>
                        <span className="text-[10px] not-italic">৳</span>
                        <span>{Math.round(customer.totalSpent || 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                          customer.customerType === 'dealer' 
                            ? 'bg-amber-100 text-amber-700' 
                          : customer.customerType === 'retailer'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : customer.customerType === 'student'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : customer.customerType === 'influencer'
                            ? 'bg-violet-50 text-violet-700 border border-violet-100'
                          : customer.customerType === 'corporate'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : customer.customerType === 'guest'
                            ? 'bg-gray-100 text-gray-400'
                          : customer.customerType === 'customer'
                            ? 'bg-slate-100 text-slate-500'
                          : ["admin", "super_admin", "superadmin", "moderator", "owner"].includes(customer.customerType)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-teal-50 text-teal-700 border border-teal-100'
                        }`}>
                          {customer.customerType?.replace("_", " ")}
                        </span>
                        {customer.pendingApproval && (
                          <span className="text-[8px] font-black bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse mt-1">
                            Pending Verification
                          </span>
                        )}
                        {customer.flatDiscountPercent !== undefined && customer.flatDiscountPercent > 0 && (
                          <div className="flex flex-col text-[9px] font-black text-gray-400 uppercase tracking-tighter mt-0.5">
                            <span className="text-red-600">{customer.flatDiscountPercent}% Flat Discount</span>
                            {customer.flatDiscountExpiresAt && (
                              <span className="text-[8px] font-medium opacity-80 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-2.5 h-2.5 text-gray-400" />
                                Till {format(new Date(customer.flatDiscountExpiresAt), "MMM dd")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => fetchCustomerDetails(customer.id, customer.customerType?.toLowerCase() === "guest" ? customer.mobile : undefined)}
                          disabled={detailsLoadingId !== null || updatingId === customer.id}
                          variant="outline"
                          className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1.5"
                        >
                          {detailsLoadingId === customer.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserIcon className="w-3.5 h-3.5" />
                          )}
                          Profile
                        </Button>
                        {!customer.isGuest ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (customer.customerType !== "customer") {
                                setConfirmModal({ open: true, customer });
                              } else {
                                setPromoType("dealer");
                                setCustomTypeName("");
                                setDiscountPercent("10");
                                setExpirationDate("");
                                setPromoteModal({ open: true, customer });
                              }
                            }}
                            disabled={updatingId === customer.id || customer.pendingApproval}
                            variant={customer.customerType !== "customer" ? "outline" : "default"}
                            className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                              customer.customerType !== "customer"
                                ? "border-gray-200 text-gray-500 hover:bg-gray-50"
                                : "bg-red-600 hover:bg-black text-white shadow-lg shadow-red-100"
                            } ${customer.pendingApproval ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {updatingId === customer.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : customer.pendingApproval ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                                Verifying...
                              </>
                            ) : customer.customerType !== "customer" ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5 mr-2" />
                                Demote
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5 mr-2" />
                                Promote
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-100/60 px-3 py-2 rounded-xl">
                            Guest
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      <p className="mt-6 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] italic text-center">
        * Access Restricted to SuperAdmin and Owners only
      </p>

      {/* Confirmation Modal */}
      <Dialog open={confirmModal.open} onOpenChange={(open) => {
        setConfirmModal(prev => ({ ...prev, open }));
      }}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl bg-white z-[200]">
          <div className="p-8 flex flex-col items-center text-center">
             <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center bg-red-50 text-red-600">
                <AlertCircle className="w-8 h-8" />
             </div>
             
             <DialogHeader className="flex flex-col items-center">
               <DialogTitle className="text-xl font-black text-gray-900 uppercase tracking-tighter italic leading-tight mb-2">
                 Confirm Demotion
               </DialogTitle>
               
               <DialogDescription className="text-[13px] font-bold text-gray-500 leading-relaxed px-4 mb-8">
                 Are you sure you want to demote <span className="text-gray-900">{confirmModal.customer?.name}</span> back to a regular retail customer? This will remove all dealer pricing and account-level discounts.
               </DialogDescription>
             </DialogHeader>
             
             <div className="grid grid-cols-2 gap-3 w-full">
                <Button 
                  variant="ghost" 
                  onClick={() => setConfirmModal({ open: false, customer: null })}
                  className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmAction}
                  className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg bg-red-600 hover:bg-red-700 shadow-red-100"
                >
                  Confirm
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promotion Dialog */}
      <Dialog open={promoteModal.open} onOpenChange={(open) => {
        setPromoteModal(prev => ({ ...prev, open }));
      }}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl bg-white z-[200]">
          <div className="p-8 flex flex-col">
             <div className="flex justify-between items-center mb-6">
               <DialogHeader className="flex-1">
                 <DialogTitle className="text-lg font-black text-gray-900 uppercase tracking-tighter italic">
                   Promote <span className="text-red-600">Customer</span>
                 </DialogTitle>
               </DialogHeader>
               <button 
                 onClick={() => setPromoteModal({ open: false, customer: null })}
                 className="p-1.5 hover:bg-gray-100 rounded-full transition-colors ml-4"
               >
                 <X className="w-4 h-4 text-gray-400" />
               </button>
             </div>

             <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">
               Customer: <span className="text-gray-900 font-black">{promoteModal.customer?.name} ({promoteModal.customer?.email})</span>
             </div>

             <div className="space-y-4 mb-8">
               <div>
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                   Select Type
                 </label>
                 <div className="grid grid-cols-2 gap-2">
                   {["dealer", "retailer", "student", "influencer", "corporate", "other"].map((t) => (
                     <button
                       key={t}
                       type="button"
                       onClick={() => setPromoType(t as any)}
                       className={`py-3 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest text-center transition-all ${
                          t === "other" ? "col-span-2" : ""
                        } ${
                         promoType === t
                           ? "border-red-600 bg-red-50/50 text-red-600"
                           : "border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-900"
                       }`}
                     >
                       {t === "other" ? "Others / Custom" : t === "corporate" ? "Corporate" : `${t}s`}
                     </button>
                   ))}
                 </div>
               </div>

               {promoType === "other" && (
                 <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                     Custom Type Name
                   </label>
                   <Input
                     value={customTypeName}
                     onChange={(e) => setCustomTypeName(e.target.value)}
                     placeholder="e.g. VIP, Corporate, Family"
                     className="h-10 border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
                   />
                 </div>
               )}

               {promoType !== "dealer" && promoType !== "retailer" && (
                 <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                   <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                       Flat Discount (%)
                     </label>
                     <Input
                       type="number"
                       value={discountPercent}
                       onChange={(e) => setDiscountPercent(e.target.value)}
                       min="1"
                       max="100"
                       placeholder="e.g. 5, 10, 20"
                       className="h-10 border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
                     />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                       Expiration Date
                     </label>
                     <Input
                       type="date"
                       value={expirationDate}
                       onChange={(e) => setExpirationDate(e.target.value)}
                       className="h-10 border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
                     />
                   </div>
                 </div>
               )}
             </div>

             <div className="grid grid-cols-2 gap-3 w-full">
                 <Button 
                   variant="ghost" 
                   onClick={() => setPromoteModal({ open: false, customer: null })}
                   className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                 >
                   Cancel
                 </Button>
                 <Button 
                   onClick={handlePromoteSubmit}
                   className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg bg-red-600 hover:bg-black shadow-red-100"
                 >
                   Promote Account
                 </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Details Modal */}
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
              <button 
                onClick={() => setSelectedCustomerDetails(null)} 
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
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
                    <span className={`px-2 py-0.5 rounded font-black border uppercase text-[9px] ${
                      selectedCustomerDetails.user.customerType?.toLowerCase() === "dealer" 
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
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        selectedCustomerDetails.user.isRetailerApproved 
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
                    ).map((order: any) => (
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
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8.5px] font-black uppercase tracking-wider border ${
                              order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                              order.status === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {order.status}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8.5px] font-black uppercase tracking-wider border ${
                              order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
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
                    ).map((pm: any) => (
                      <div key={pm.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/admin/collections?tab=ledgers&q=${pm.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10.5px] text-blue-600 hover:text-blue-800 hover:underline font-black shrink-0"
                              title="Find in Ledgers Table"
                            >
                              #{pm.id.slice(-8).toUpperCase()}
                            </a>
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8.5px] font-black uppercase tracking-wider border ${
                              pm.type === "collection" 
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
    </div>
  );
}
