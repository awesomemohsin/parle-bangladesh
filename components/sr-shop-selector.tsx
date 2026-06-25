"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, UserPlus, ShoppingBag, LogOut, Check, ChevronDown, RefreshCw } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";

interface Shop {
  id: string;
  name: string;
  email: string;
  mobile: string;
  dueBalance: number;
  walletBalance: number;
  creditLimit: number;
  customerType: string;
  isRetailerApproved: boolean;
}

export default function SRShopSelector() {
  const { clearCart } = useCart();
  const { user: currentUser } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [customers, setCustomers] = useState<Shop[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Shop[]>([]);
  const [selectionMode, setSelectionMode] = useState<'shop' | 'customer'>('shop');
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form states for new shop registration
  const [newShopName, setNewShopName] = useState("");
  const [newShopMobile, setNewShopMobile] = useState("");
  const [newShopPassword, setNewShopPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    const isAllowed = currentUser?.isSR || ["super_admin", "admin", "moderator", "owner"].includes(currentUser?.role || "");
    if (isAllowed) {
      fetchShops();
    }
  }, [currentUser]);

  useEffect(() => {
    // Load active shop from localStorage
    const activeShopStr = localStorage.getItem("sr_active_shop_user");
    if (activeShopStr) {
      try {
        setActiveShop(JSON.parse(activeShopStr));
      } catch (e) {
        console.error("Failed to parse active shop", e);
      }
    }

    // Dropdown click handler
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchShops = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/collections?type=shops", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const allShops = data.shops || [];

        // B2B Shops (Retailers/Dealers)
        const b2bShops = allShops.filter((s: any) =>
          (s.customerType === "retailer" || s.customerType === "dealer") && !s.isSR
        );
        setShops(b2bShops);
        setFilteredShops(b2bShops);

        // Retail Customers (where role is customer and type is not B2B/Staff/Guest)
        const regCustomers = allShops.filter((s: any) =>
          !["retailer", "dealer", "Guest", "guest", "admin", "super_admin", "moderator", "owner"].includes(s.customerType || "") &&
          !["admin", "super_admin", "moderator", "owner"].includes(s.role || "") &&
          !s.isSR &&
          !s.id?.toString().startsWith("guest-")
        );
        setCustomers(regCustomers);
        setFilteredCustomers(regCustomers);
      }
    } catch (e) {
      console.error("Failed to fetch shops", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredShops(shops);
      setFilteredCustomers(customers);
    } else {
      const q = search.toLowerCase();
      const shopFilter = shops.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.mobile.includes(q) ||
          (s.email && s.email.toLowerCase().includes(q))
      );
      const customerFilter = customers.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.mobile.includes(q) ||
          (s.email && s.email.toLowerCase().includes(q))
      );
      setFilteredShops(shopFilter);
      setFilteredCustomers(customerFilter);
    }
  }, [search, shops, customers]);

  const isAdminOrModerator = ["super_admin", "admin", "moderator", "owner"].includes(currentUser?.role || "");
  const isAllowed = currentUser?.isSR || isAdminOrModerator;
  if (!currentUser || !isAllowed) {
    return null; // Only show widget for logged-in Sales Representatives or Admins/Moderators
  }

  const handleSelectShop = (shop: Shop) => {
    localStorage.setItem("sr_active_shop_id", shop.id);
    localStorage.setItem("sr_active_shop_user", JSON.stringify(shop));
    // Clear temporary cart syncer state so it pulls fresh from DB for the shop
    sessionStorage.removeItem("cart_synced");
    clearCart();
    setActiveShop(shop);
    setIsOpen(false);
    window.location.reload();
  };

  const handleClearShop = () => {
    localStorage.removeItem("sr_active_shop_id");
    localStorage.removeItem("sr_active_shop_user");
    sessionStorage.removeItem("cart_synced");
    clearCart();
    setActiveShop(null);
    window.location.reload();
  };

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Attach the SR token to associate referral
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newShopName,
          mobile: newShopMobile,
          password: newShopPassword,
          email: "" // Auto-generate virtual email on backend!
        })
      });

      const data = await res.json();
      if (res.ok) {
        setRegSuccess(true);
        setNewShopName("");
        setNewShopMobile("");
        setNewShopPassword("");
        // Reload shops list
        await fetchShops();
        setTimeout(() => {
          setRegSuccess(false);
          setIsRegistering(false);
        }, 1500);
      } else {
        setRegError(data.error || "Failed to register shop.");
      }
    } catch (err) {
      setRegError("Server error during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
      <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-2 shadow-xl relative overflow-visible" ref={dropdownRef}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Info Section */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-600/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
              <ShoppingBag className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Order Mode Activated</span>
                <span className="text-[10px] font-bold text-gray-400">Logged in as {currentUser?.name}</span>
              </div>

              {activeShop ? (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-base font-black text-white italic tracking-tight uppercase">
                    Impersonating: <span className="text-red-500">{activeShop.name}</span>
                  </h3>
                  <span className="text-xs font-bold text-gray-400">({activeShop.mobile})</span>
                  {/* Status Badge */}
                  {(() => {
                    if (activeShop.customerType === 'retailer') {
                      return (
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          activeShop.isRetailerApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {activeShop.isRetailerApproved ? 'Approved Retailer' : 'Probation Retailer'}
                        </span>
                      );
                    }
                    if (activeShop.customerType === 'dealer') {
                      return (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          Dealer
                        </span>
                      );
                    }
                    if (activeShop.customerType === 'Guest') {
                      return (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-400 border border-slate-500/30">
                          Guest Customer
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        Customer
                      </span>
                    );
                  })()}

                  {/* Balances */}
                  <div className="flex items-center gap-2 mt-1 md:mt-0">
                    <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700/50">
                      Dues: <strong className="text-rose-400">৳{activeShop.dueBalance || 0}</strong>
                    </span>
                    <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700/50">
                      Wallet: <strong className="text-emerald-400">৳{activeShop.walletBalance || 0}</strong>
                    </span>
                    {activeShop.customerType === 'retailer' && !activeShop.isRetailerApproved && (
                      <span className="text-[10px] text-rose-400 font-bold">
                        (Limit: ৳10,000)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <h3 className="text-base font-bold text-gray-300 mt-1">
                  No shop selected. Please select a shop to place orders.
                </h3>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {activeShop ? (
              <button
                onClick={handleClearShop}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-rose-900/10 active:scale-95 border border-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
                End Session
              </button>
            ) : (
              <>
                {/* Select Active Shop dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setSelectionMode('shop');
                      setIsOpen(isOpen && selectionMode === 'shop' ? false : true);
                    }}
                    className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-amber-900/10 active:scale-95"
                  >
                    Select Active Shop
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${(isOpen && selectionMode === 'shop') ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && selectionMode === 'shop' && (
                    <>
                      {/* Mobile Backdrop */}
                      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden" onClick={() => setIsOpen(false)} />

                      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto md:absolute md:right-0 md:top-full md:translate-y-0 md:mt-3 md:w-80 md:inset-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 z-[9999] overflow-visible">
                        {isRegistering ? (
                          /* Form to register new shop */
                          <form onSubmit={handleRegisterShop} className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                              <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                                <UserPlus className="w-4 h-4" /> Register New Shop
                              </h4>
                              <button
                                type="button"
                                onClick={() => setIsRegistering(false)}
                                className="text-[10px] font-bold text-gray-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>

                            {regSuccess ? (
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
                                <Check className="w-4 h-4" /> Registered successfully!
                              </div>
                            ) : (
                              <>
                                {regError && (
                                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl">
                                    {regError}
                                  </div>
                                )}
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Shop Name *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newShopName}
                                    onChange={(e) => setNewShopName(e.target.value)}
                                    placeholder="Maa General Store"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mobile Number *</label>
                                  <input
                                    type="tel"
                                    required
                                    value={newShopMobile}
                                    onChange={(e) => setNewShopMobile(e.target.value)}
                                    placeholder="01XXXXXXXXX"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Temporary Password *</label>
                                  <input
                                    type="password"
                                    required
                                    value={newShopPassword}
                                    onChange={(e) => setNewShopPassword(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  disabled={isLoading}
                                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-amber-900/10 mt-2"
                                >
                                  {isLoading ? "Creating..." : "Create Shop"}
                                </button>
                              </>
                            )}
                          </form>
                        ) : (
                          /* List of shops to search & select */
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                              <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                                <ShoppingBag className="w-4 h-4 text-amber-500" /> Choose Shop
                              </h4>
                              <button
                                type="button"
                                onClick={() => setIsRegistering(true)}
                                className="text-[10px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-wider flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add New
                              </button>
                            </div>

                            {/* Search input */}
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or mobile..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            {/* Shop listing */}
                            <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                              {isLoading && filteredShops.length === 0 ? (
                                <div className="text-center py-6 flex flex-col items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                  <RefreshCw className="w-4 h-4 animate-spin text-amber-500" /> Loading shops...
                                </div>
                              ) : filteredShops.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 text-xs font-bold uppercase tracking-wider">No shops found</div>
                              ) : (
                                filteredShops.map((shop) => (
                                  <div
                                    key={shop.id}
                                    onClick={() => handleSelectShop(shop)}
                                    className="p-3 rounded-2xl border bg-slate-800/40 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700/50 text-gray-300 transition-all cursor-pointer flex flex-col gap-0.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-black text-xs uppercase tracking-tight truncate max-w-[130px]">{shop.name}</span>
                                        <span className="text-[8px] px-1.5 py-0.5 bg-slate-800 text-slate-400 font-bold uppercase border border-slate-700/40 rounded shrink-0">
                                          {shop.customerType}
                                        </span>
                                      </div>
                                      <span className="text-[9px] font-bold text-gray-400 shrink-0">{shop.mobile}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                      <span className="text-[10px] text-gray-400">
                                        Dues: <strong className="text-rose-400">৳{shop.dueBalance || 0}</strong>
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Select Active Customer dropdown */}
                {isAdminOrModerator && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setSelectionMode('customer');
                        setIsOpen(isOpen && selectionMode === 'customer' ? false : true);
                      }}
                      className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-amber-900/10 active:scale-95"
                    >
                      Select Active Customer
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${(isOpen && selectionMode === 'customer') ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && selectionMode === 'customer' && (
                      <>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden" onClick={() => setIsOpen(false)} />
                        <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto md:absolute md:right-0 md:top-full md:translate-y-0 md:mt-3 md:w-80 md:inset-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 z-[9999] overflow-visible">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                              <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                                <ShoppingBag className="w-4 h-4 text-amber-500" /> Choose Customer
                              </h4>
                            </div>

                            {/* Search input */}
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or mobile..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            {/* Customer listing */}
                            <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                              {isLoading && filteredCustomers.length === 0 ? (
                                <div className="text-center py-6 flex flex-col items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                  <RefreshCw className="w-4 h-4 animate-spin text-amber-500" /> Loading customers...
                                </div>
                              ) : filteredCustomers.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 text-xs font-bold uppercase tracking-wider">No customers found</div>
                              ) : (
                                filteredCustomers.map((shop) => (
                                  <div
                                    key={shop.id}
                                    onClick={() => handleSelectShop(shop)}
                                    className="p-3 rounded-2xl border bg-slate-800/40 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700/50 text-gray-300 transition-all cursor-pointer flex flex-col gap-0.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-black text-xs uppercase tracking-tight truncate max-w-[150px]">{shop.name}</span>
                                      <span className="text-[9px] font-bold text-gray-400">{shop.mobile}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
