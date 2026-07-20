'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Lock, Eye, Key, Shield } from 'lucide-react';

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
          
          <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
            Parle Bangladesh (M/S Circle Enterprise) is committed to protecting your privacy. This Privacy Policy details how we handle the collection, use, and protection of personal data when you interact with our platform.
          </p>

          {/* Section 1: Information Collection */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">1. Information We Collect</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              We collect information required to complete orders and verify business memberships:
            </p>
            <ul className="space-y-2 pl-2 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Personal Contact Details:</strong> Name, phone numbers, delivery addresses, and email.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Business Verification Info:</strong> Business identifiers, proprietor details, and commercial licenses for wholesale accounts.</span>
              </li>
            </ul>
          </div>

          {/* Section 2: Use of Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">2. How We Use Collected Data</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              We use your information exclusively for transactional and account management purposes:
            </p>
            <ul className="space-y-2 pl-2 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span>Processing, dispatching, and invoicing orders.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span>Authenticating accounts and validating eligibility for partner promotion campaigns.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span>Providing client support and transaction communications.</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Data Security */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">3. Security & Sharing Policies</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              We implement industry-standard encryption protocols (HTTPS/SSL) to protect your data. Your personal and commercial information is never shared with, sold to, or rented to third-party marketing companies. We only provide details to trusted logistics partners to facilitate shipment delivery.
            </p>
          </div>

          {/* Section 4: Data Rights */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">4. Your Data Rights</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              You have the right to request access to, correction of, or deletion of your personal data on our systems. If you have any inquiries or wish to request data updates, please contact our support team at <span className="text-red-600 font-bold">cfb@circlenetworkbd.net</span>.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
