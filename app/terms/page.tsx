'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Scale, FileText, Globe } from 'lucide-react';

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
          
          <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
            Welcome to Parle Bangladesh. These Terms & Conditions govern your access to and use of our online ordering platform. By registering an account, placing an order, or accessing our services, you agree to be bound by these terms.
          </p>

          {/* Section 1: Distribution Exclusivity */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">1. Distribution & Exclusivity</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              M/S Circle Enterprise is the exclusive authorized distributor of Parle Biscuits Pvt. Ltd. (India) in Bangladesh. All products offered on this platform are officially imported and conform to national regulatory requirements.
            </p>
          </div>

          {/* Section 2: Account Registration */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">2. Account Registration & Verifications</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              Users may register as retail customers or commercial partners (Dealers, Retailers, and Corporate clients). 
            </p>
            <ul className="space-y-2 pl-2 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span>You agree to provide true, accurate, and complete information during registration.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span>Commercial accounts require validation of business documentation (such as trade licenses) prior to receiving wholesale rates.</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Orders, Delivery & Pricing */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Scale className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">3. Pricing, Orders & Shipping</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              We aim to ensure pricing and product availability are accurate, but errors may occasionally occur.
            </p>
            <ul className="space-y-2 pl-2 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Pricing:</strong> Pricing tiers are assigned based on verified customer profiles. All wholesale and retail prices listed are inclusive of applicable VAT.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Shipping:</strong> Free shipping is provided to eligible wholesale orders and orders exceeding ৳1,000. Shipping times are estimations and subject to standard logistics schedules.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-2" />
                <span><strong>Returns:</strong> Any claims for transit-damaged items must be filed with our logistics team at the time of delivery for review and adjustment.</span>
              </li>
            </ul>
          </div>

          {/* Section 4: General Legal */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">4. Liability & Governing Law</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              These terms are governed by and construed in accordance with the laws of Bangladesh. Any dispute arising out of or related to these terms shall be subject to the exclusive jurisdiction of the courts of Bangladesh. M/S Circle Enterprise reserves the right to amend these Terms and Conditions at any time.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
