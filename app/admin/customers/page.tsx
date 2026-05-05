"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Loader2, UserCheck, UserPlus, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  customerType: "retailer" | "dealer";
  status: "active" | "disabled";
  createdAt: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    customer: Customer | null;
  }>({
    open: false,
    customer: null,
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = `/api/admin/customers?search=${encodeURIComponent(search)}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      toast.error("Error fetching customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleConfirmAction = async () => {
    const { customer } = confirmModal;
    if (!customer) return;

    const newType = customer.customerType === "dealer" ? "retailer" : "dealer";
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
        setCustomers(customers.map(c => c.id === customer.id ? { ...c, customerType: newType } : c));
        toast.success(newType === "dealer" ? "Promoted to Dealer" : "Demoted to Regular");
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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">Customer <span className="text-red-600">Hub</span></h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Manage Dealer Privileges</p>
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

      <Card className="overflow-hidden border-none shadow-xl shadow-gray-100 rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <Loader2 className="w-6 h-6 text-red-600 animate-spin mx-auto mb-2" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Customers...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No customers found</p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{customer.name}</span>
                        <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          <span>{customer.email}</span>
                          <span className="text-gray-200">|</span>
                          <span>{customer.mobile}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                        customer.customerType === 'dealer' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {customer.customerType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setConfirmModal({ open: true, customer });
                        }}
                        disabled={updatingId === customer.id}
                        variant={customer.customerType === "dealer" ? "outline" : "default"}
                        className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          customer.customerType === "dealer"
                            ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                            : "bg-red-600 hover:bg-black text-white shadow-lg shadow-red-100"
                        }`}
                      >
                        {updatingId === customer.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : customer.customerType === "dealer" ? (
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
             <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center ${
               confirmModal.customer?.customerType === 'dealer' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
             }`}>
                <AlertCircle className="w-8 h-8" />
             </div>
             
             <DialogHeader className="flex flex-col items-center">
               <DialogTitle className="text-xl font-black text-gray-900 uppercase tracking-tighter italic leading-tight mb-2">
                 {confirmModal.customer?.customerType === 'dealer' ? 'Confirm Demotion' : 'Confirm Promotion'}
               </DialogTitle>
               
               <DialogDescription className="text-[13px] font-bold text-gray-500 leading-relaxed px-4 mb-8">
                 Are you sure you want to {confirmModal.customer?.customerType === 'dealer' ? 'remove' : 'grant'} dealer privileges for <span className="text-gray-900">{confirmModal.customer?.name}</span>?
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
                  className={`h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${
                    confirmModal.customer?.customerType === 'dealer' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'
                  }`}
                >
                  Confirm
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
