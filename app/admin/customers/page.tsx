"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Loader2, UserCheck, UserPlus, AlertCircle, X, User as UserIcon, ArrowUpDown, ChevronUp, ChevronDown, Calendar } from "lucide-react";
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
    { value: "retailer", label: "Retailer", count: counts.retailer, activeStyle: "bg-teal-600 text-white shadow-lg shadow-teal-600/10 border-teal-600", inactiveStyle: "bg-teal-50/50 text-teal-700 border-teal-100 hover:bg-teal-50" },
    { value: "dealer", label: "Dealer", count: counts.dealer, activeStyle: "bg-amber-600 text-white shadow-lg shadow-amber-600/10 border-amber-600", inactiveStyle: "bg-amber-50/50 text-amber-700 border-amber-100 hover:bg-amber-50" },
    { value: "student", label: "Student", count: counts.student, activeStyle: "bg-rose-600 text-white shadow-lg shadow-rose-600/10 border-rose-600", inactiveStyle: "bg-rose-50/50 text-rose-700 border-rose-100 hover:bg-rose-50" },
    { value: "influencer", label: "Influencer", count: counts.influencer, activeStyle: "bg-violet-600 text-white shadow-lg shadow-violet-600/10 border-violet-600", inactiveStyle: "bg-violet-50/50 text-violet-700 border-violet-100 hover:bg-violet-50" },
    { value: "corporate", label: "Corporate", count: counts.corporate, activeStyle: "bg-sky-600 text-white shadow-lg shadow-sky-600/10 border-sky-600", inactiveStyle: "bg-sky-50/50 text-sky-700 border-sky-100 hover:bg-sky-50" },
    { value: "other", label: "Other", count: counts.other, activeStyle: "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 border-indigo-600", inactiveStyle: "bg-indigo-50/50 text-indigo-700 border-indigo-100 hover:bg-indigo-50" },
  ];

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
        className="flex items-center gap-2 mb-6 p-2 bg-gray-50/60 rounded-2xl border border-gray-100/80 overflow-x-auto [&::-webkit-scrollbar]:hidden scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSelectedType(tab.value)}
            className={`
              flex items-center gap-1 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-200 shrink-0 select-none
              ${selectedType === tab.value ? tab.activeStyle : tab.inactiveStyle}
              hover:scale-[1.02] active:scale-[0.98] cursor-pointer
            `}
          >
            {tab.label}
            <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight leading-none transition-colors duration-200 ${
              selectedType === tab.value 
                ? 'bg-white/20 text-white' 
                : 'bg-black/5 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
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
                            : customer.customerType === 'guest'
                            ? 'bg-gray-100 text-gray-400'
                            : ['student', 'influencer', 'corporate'].includes(customer.customerType)
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : customer.customerType === 'retailer'
                            ? 'bg-teal-50 text-teal-700 border border-teal-100'
                            : customer.customerType === 'customer'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {customer.customerType}
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
                      {!customer.isGuest && (
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
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : customer.pendingApproval ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin mr-2" />
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
                      )}
                      {customer.isGuest && (
                        <div className="text-[9px] font-black text-gray-300 uppercase italic px-4">
                          Non-Registered
                        </div>
                      )}
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
    </div>
  );
}
