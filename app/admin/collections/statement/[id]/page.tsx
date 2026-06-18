"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Printer,
  ArrowLeft,
  Calendar,
  FileText,
  DollarSign,
  TrendingDown,
  User,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Order {
  id: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  address?: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
}

interface Payment {
  id: string;
  amount: number;
  type: string;
  paymentMethod: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

interface CustomerDetails {
  user: {
    id: string;
    name: string;
    mobile: string;
    email: string;
    customerType: string;
    walletBalance: number;
    creditLimit: number;
    createdAt?: string;
    referredBySR?: {
      name: string;
      email: string;
      mobile: string;
    } | null;
  };
  orders: Order[];
  payments: Payment[];
}

const formatPaymentMethod = (method: string) => {
  if (!method) return "CASH";
  const m = method.toLowerCase();
  if (m === "bank_ucb") return "BANK TRANSFER (UCB)";
  if (m === "bank_brac") return "BANK TRANSFER (BRAC)";
  if (m === "bank_nrbc") return "BANK TRANSFER (NRBC)";
  if (m === "bank") return "BANK TRANSFER";
  return m.toUpperCase();
};

export default function StatementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found. Please log in.");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/admin/collections?type=customer-details&customerId=${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          const errData = await res.json();
          setError(errData.error || "Failed to load customer details.");
        }
      } catch (err: any) {
        console.error("Statement fetch error:", err);
        setError("An error occurred while fetching statement data: " + (err.message || ""));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!loading && data && !error) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, data, error]);

  // Construct unified running balance timeline
  const ledgerTimeline = useMemo(() => {
    if (!data) return [];

    const timeline: any[] = [];

    // Add Invoices (Charges / Debits)
    data.orders.forEach((o) => {
      timeline.push({
        id: o.id,
        date: new Date(o.createdAt),
        type: "invoice",
        reference: `Invoice #${o.id.slice(-8).toUpperCase()}`,
        description: `Order status: ${o.status.toUpperCase()}`,
        debit: o.total,
        credit: 0,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod
      });
    });

    // Add Payments (Credits)
    data.payments.forEach((p) => {
      const isDeposit = p.type === "wallet_deposit";
      timeline.push({
        id: p.id,
        date: new Date(p.createdAt),
        type: p.type,
        reference: isDeposit ? "Wallet Deposit" : "Collection Payment",
        description: `${formatPaymentMethod(p.paymentMethod)}${p.notes ? ` - "${p.notes}"` : ""}`,
        debit: 0,
        credit: p.amount,
        recordedBy: p.recordedBy
      });
    });

    // Sort chronologically (oldest first)
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Compute running balance (charges increase, collections decrease balance)
    let runningBalance = 0;
    return timeline.map((item) => {
      runningBalance += (item.debit - item.credit);
      return {
        ...item,
        runningBalance
      };
    });
  }, [data]);

  // Calculate totals
  const stats = useMemo(() => {
    if (!data) return { totalInvoiced: 0, totalCollected: 0, netDues: 0 };
    const totalInvoiced = data.orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCollected = data.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const netDues = totalInvoiced - totalCollected;
    return {
      totalInvoiced,
      totalCollected,
      netDues
    };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">
          Generating Statement...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Error Loading Statement</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">{error || "Customer data not found."}</p>
        <Button
          onClick={() => router.back()}
          className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
        >
          Go Back
        </Button>
      </div>
    );
  }

  const { user } = data;

  const statementContent = (
    <div className="w-full flex flex-col">
      {/* STATEMENT HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
            PARLE BANGLADESH
          </h1>
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mt-1">
            Official Customer Account Ledger
          </p>
          <div className="text-[10px] text-slate-400 mt-2.5 space-y-0.5 font-semibold">
            <div>Authorized Distributor: Circle Enterprise</div>
            <div>Unity Trade Center, Nabinagar, Ashulia, Savar, Dhaka-1344</div>
            <div>Email: cfb@circlenetworkbd.net</div>
            <div>Website: www.parlebangladesh.com</div>
            <div>Phone: +8801958113002</div>
          </div>
        </div>
        <div className="sm:text-right space-y-3 text-slate-500 font-bold text-[10px] max-w-xs shrink-0 self-stretch flex flex-col justify-between items-end">
          <div className="space-y-0.5">
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Statement Date</div>
            <div className="text-slate-800 text-xs font-black flex items-center sm:justify-end gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          <div className="space-y-0.5 border-t border-slate-100 pt-1.5 w-full">
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Account Information</div>
            <div className="text-slate-900 font-black text-xs uppercase">{user.name}</div>
            <div className="font-mono text-slate-700">{user.mobile}</div>
            {user.email && <div className="text-slate-600 lowercase font-medium">{user.email}</div>}
            <div className="text-[9.5px] text-slate-500 font-semibold">
              Account ID: <span className="font-mono text-slate-800 font-extrabold uppercase">#{user.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="text-[9.5px] text-slate-500 font-semibold">
              Account Type:{" "}
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[8px] uppercase font-black tracking-wider ml-1">
                {user.customerType?.replace("_", " ")}
              </span>
            </div>
            {user.referredBySR && (
              <div className="text-[9.5px] text-slate-500 font-semibold">
                SR: <span className="text-slate-800 font-extrabold">{user.referredBySR.name} ({user.referredBySR.mobile})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FINANCIAL STATS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-4">
        <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-3.5 print-card">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <FileText className="w-3 h-3 text-slate-500" /> Total Invoiced
          </div>
          <div className="text-base font-black text-slate-900">
            ৳{stats.totalInvoiced.toLocaleString()}
          </div>
          <p className="text-[8px] text-slate-400 mt-0.5 font-bold">Approved invoices sum</p>
        </div>

        <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-3.5 print-card">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Total Collected
          </div>
          <div className="text-base font-black text-emerald-600">
            ৳{stats.totalCollected.toLocaleString()}
          </div>
          <p className="text-[8px] text-slate-400 mt-0.5 font-bold">Payments & deposits sum</p>
        </div>

        <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-3.5 print-card">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3 h-3 text-rose-500" /> Account Balance
          </div>
          <div className={`text-base font-black ${user.walletBalance < 0 ? "text-rose-500" : "text-emerald-600"}`}>
            {user.walletBalance < 0 ? `-৳${Math.abs(user.walletBalance).toLocaleString()}` : `+৳${user.walletBalance.toLocaleString()}`}
          </div>
          <p className="text-[8px] text-slate-400 mt-0.5 font-bold">
            {user.walletBalance < 0 ? "Outstanding due" : "Advance wallet credit"}
          </p>
        </div>
      </div>

      {/* LEDGER TIMELINE TABLE */}
      <div className="mt-5">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5 border-b border-slate-200 pb-1">
          Chronological Account Ledger Timeline
        </h3>

        <div className="border border-slate-100 rounded-xl overflow-hidden print-card print-table-container">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-wider print-table-header">
                <th className="py-1.5 px-3">Date</th>
                <th className="py-1.5 px-3">Transaction / Ref</th>
                <th className="py-1.5 px-3">Details</th>
                <th className="py-1.5 px-3 text-right">Debit (+)</th>
                <th className="py-1.5 px-3 text-right">Credit (-)</th>
                <th className="py-1.5 px-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[10px] text-slate-600 font-bold">
              {ledgerTimeline.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    No transaction history found on this account.
                  </td>
                </tr>
              ) : (
                ledgerTimeline.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-1.5 px-3 text-[9.5px] whitespace-nowrap text-slate-500">
                      {item.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      <span className="block text-[8px] font-normal text-gray-400 mt-0.5">
                        {item.date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="font-extrabold text-[10.5px] text-slate-900 block">{item.reference}</span>
                      <span className={`inline-block text-[7px] font-black uppercase tracking-wider px-1 rounded border mt-0.5 ${item.type === "invoice"
                          ? item.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-amber-50 text-amber-600 border-amber-100"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                        {item.type === "invoice" ? `Invoice: ${item.paymentStatus}` : item.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 max-w-[180px] truncate text-[9.5px] text-slate-500 font-medium">
                      {item.description}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-800">
                      {item.debit > 0 ? `৳${item.debit.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-emerald-600">
                      {item.credit > 0 ? `-৳${item.credit.toLocaleString()}` : "—"}
                    </td>
                    <td className={`py-1.5 px-3 text-right font-black ${item.runningBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      ৳{Math.abs(item.runningBalance).toLocaleString()}
                      <span className="text-[7px] font-bold block mt-0.5 text-gray-400">
                        {item.runningBalance > 0 ? "DUE" : "CREDIT"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STATEMENT SIGNATURE & FOOTER */}
      <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 print-footer">
        <div className="text-[8.5px] text-slate-400 font-bold text-center sm:text-left leading-relaxed">
          <div>This ledger is computer-generated and serves as an official proof of transactions.</div>
          <div>For any queries, please email cfb@circlenetworkbd.net.</div>
        </div>
        <div className="w-40 border-t border-dashed border-slate-300 text-center pt-1.5 shrink-0">
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">AUTHORIZED SIGNATURE</span>
          <span className="text-[9.5px] text-slate-700 font-extrabold mt-0.5 block">Parle Bangladesh Accounts</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0 print:px-0">
      <style jsx global>{`
        /* Reset top gaps and storefront layout elements */
        main {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
        nav, footer, header, section, .navbar, .footer, .career-cta, #navbar, #footer {
          display: none !important;
        }

        @page {
          size: auto;
          margin: 0;
        }
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .print-table-header {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-container {
            display: block !important;
            padding-left: 1.5cm !important;
            padding-right: 1.5cm !important;
            background: white !important;
          }
          .master-thead-spacer {
            height: 1.2cm;
          }
          .master-tfoot-spacer {
            height: 1.5cm;
          }
          .print-footer {
            position: relative !important;
            margin-top: 2.5cm !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* FLOATING ACTION BAR - HIDDEN ON PRINT */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between no-print bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 border-slate-200 text-slate-600 hover:text-black hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wider rounded-xl py-1.5 px-3.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
        <Button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-amber-600 hover:bg-black text-white font-bold text-[10px] uppercase tracking-wider rounded-xl py-1.5 px-4 transition-all shadow-md shadow-amber-900/10"
        >
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </Button>
      </div>

      {/* LEDGER STATEMENT CONTAINER */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8 flex flex-col justify-start print:border-none print:shadow-none print:p-0 print-container">

        {/* Screen layout */}
        <div className="print:hidden w-full flex flex-col">
          {statementContent}
        </div>

        {/* Print layout - wraps inside a master table for page-margin control and no-headers/footers */}
        <table className="w-full border-collapse hidden print:table">
          <thead>
            <tr>
              <td className="master-thead-spacer"></td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="w-full flex flex-col relative">
                  {statementContent}
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="master-tfoot-spacer"></td>
            </tr>
          </tfoot>
        </table>

      </div>
    </div>
  );
}
