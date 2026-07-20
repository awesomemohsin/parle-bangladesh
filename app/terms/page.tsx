'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, BookOpen, ShieldCheck, Scale, AlertCircle } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      {/* Hero Header Section */}
      <section className="relative py-20 overflow-hidden bg-slate-900 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-red-650 rounded-full blur-3xl"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <Link 
              href="/auth/signup"
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign Up
            </Link>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter uppercase italic leading-none mb-4">
              Terms & <span className="text-red-500">Conditions</span>
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-widest">
              Last Updated: July 20, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-xl shadow-slate-100/60 border border-gray-100 space-y-10">
          
          {/* Introduction Card */}
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex gap-4 items-start">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-black uppercase text-gray-900 tracking-wider mb-1">Please Read Carefully</h2>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                By accessing this portal, creating an account, or purchasing products, you agree to comply with and be bound by the following Terms and Conditions of Parle Bangladesh (M/S Circle Enterprise).
              </p>
            </div>
          </div>

          {/* Section 1: Exclusivity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">1. Official Exclusivity</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              M/S Circle Enterprise is the exclusive authorized distributor of Parle Biscuits Pvt. Ltd. (India) in Bangladesh. All biscuits, wafers, and confectionery products sold on this portal are official imports. Unauthorized import or redistribution of Parle products is strictly prohibited and subject to legal prosecution.
            </p>
          </div>

          {/* Section 2: Account Levels & Wholesalers */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">2. Customer Tiers & B2B Registrations</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed mb-2">
              We operate multiple accounts types including Retail Customers, Dealers, Retailers, and Corporate clients:
            </p>
            <ul className="space-y-3 pl-2">
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>B2B Verification:</strong> Dealers, Retailers, and Corporate profiles must go through a double Superadmin verification process. Business credentials (Trade License, NID, Shop Details) must be accurate and valid.</span>
              </li>
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Consensus Approvals:</strong> Any change in discount limits, price schedules, or account levels will undergo multi-stage Superadmin verification before applying to the account.</span>
              </li>
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Credit Limits:</strong> B2B accounts with approved credit limits are fully responsible for timely outstanding payments. Interest or suspension of delivery may apply to overdue balances.</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Ordering & Delivery Policies */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Scale className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">3. Ordering, Pricing, & Shipping</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed mb-2">
              All transactions executed on the portal are governed by the following rules:
            </p>
            <ul className="space-y-3 pl-2">
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Pricing Tiers:</strong> Wholesale pricing (Dealer Rate, Retailer Rate, Corporate Rate) are applied automatically based on the validated customer type and are inclusive of relevant VAT. Retail promotions or voucher codes cannot be stacked with wholesale rates.</span>
              </li>
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Delivery Charges:</strong> Free shipping is provided to B2B validated users (Dealers, Retailers, Corporate clients) and all orders valued above ৳1,000. Under ৳1,000 orders are subject to standard logistics fees.</span>
              </li>
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Returns & Damaged Goods:</strong> Damaged stock must be reported to the logistics representative immediately upon delivery. Valid returns require Superadmin sign-off and will be adjusted via credit ledger.</span>
              </li>
            </ul>
          </div>

          {/* Section 4: Termination */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">4. Termination and Restrictions</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              We reserve the right to suspend or terminate portal access for any user found engaged in fraud, price manipulation, duplicate profile creation, or default on payments.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
