'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Key, Lock, Eye, CheckCircle2 } from 'lucide-react';

export default function PrivacyPage() {
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
              Privacy <span className="text-red-500">Policy</span>
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
          
          {/* Main Statement */}
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              At Parle Bangladesh (M/S Circle Enterprise), we value your trust and are committed to protecting your privacy. This Privacy Policy details how we collect, store, and utilize your personal information when you register or order biscuits and confectionery products via our website.
            </p>
          </div>

          {/* Section 1: Data Collection */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">1. What Information We Collect</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed mb-2">
              We collect information necessary to facilitate product orders, B2B registrations, and account security:
            </p>
            <ul className="space-y-3 pl-2">
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Profile Data:</strong> Name, Email Address, Contact Numbers, Delivery Address, and Location.</span>
              </li>
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Business Validation (B2B):</strong> Trade license details, proprietor info, and physical shop verification documents.</span>
              </li>
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>ISP Campaigns:</strong> Mobile verification data queried securely from our campaign partners (e.g. Circle Network ISP verify endpoint) to grant subscription campaigns discounts.</span>
              </li>
            </ul>
          </div>

          {/* Section 2: How We Use Data */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">2. How We Use Your Data</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed mb-2">
              The information we gather is used to improve the service quality and secure transactions:
            </p>
            <ul className="space-y-3 pl-2">
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span>To process, dispatch, and track orders with logistics partners.</span>
              </li>
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span>To manage credit limit statements, B2B invoices, and payment histories.</span>
              </li>
              <li className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span>To authenticate user logins via JWT tokens and send order status notifications.</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Data Security */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">3. Data Security & Storage</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              All personal and financial details are transmitted securely using HTTPS protocol and stored on protected cloud database instances. We do not sell, rent, or lease your personal identification information to any third-party marketing companies. 
            </p>
          </div>

          {/* Section 4: Contact */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">4. Access and Support</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              If you wish to update your business profile, request data removal, or obtain credit history statements, please contact the Authorized Management support at <span className="text-red-600 font-bold">info.parlebangladesh@gmail.com</span>.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
