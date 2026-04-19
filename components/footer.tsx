'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Phone, Mail, Facebook, MessageCircle, Instagram, Building2, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 font-sans mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 items-start">
          {/* 1. Brand Identity (Top Left on Mobile) */}
          <div className="col-span-1 space-y-5">
            <Link href="/" className="block group">
              <img src="/logo.png" alt="Logo" className="h-14 sm:h-12 w-auto object-contain" />
              <div className="flex flex-col border-l-4 border-red-600 pl-3 mt-3">
                <h3 className="text-[25px] sm:text-[20px] font-black text-red-600 uppercase tracking-tighter italic leading-none">
                  Parle <span className="text-gray-900">Bangladesh</span>
                </h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Official Distributor Hub</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="https://www.facebook.com/parlebangladesh/" target="_blank" className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-red-600 hover:bg-black hover:text-white transition-all shadow-sm"><Facebook className="w-4 h-4" /></Link>
              <Link href="https://wa.me/8801958113002" target="_blank" className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-red-600 hover:bg-black hover:text-white transition-all shadow-sm"><MessageCircle className="w-4 h-4" /></Link>
            </div>
          </div>

          {/* 2. Catalog Group (Top Right on Mobile | Same Line on Desktop) */}
          <div className="pt-[68px] lg:pt-2 text-right lg:text-left flex flex-col items-end lg:items-start">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-4 border-r-2 lg:border-r-0 lg:border-l-2 border-red-600 pr-2 lg:pr-0 lg:pl-2">Catalog</h4>
            <ul className="space-y-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {['Biscuits', 'Wafers'].map((item) => (
                <li key={item}><Link href={`/shop/categories/${item.toLowerCase()}`} className="hover:text-red-600 transition-colors uppercase">{item}</Link></li>
              ))}
            </ul>
          </div>

          {/* 3. Support Group (Left Aligned Always) */}
          <div className="pt-2">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-4 border-l-2 border-red-600 pl-2">Support</h4>
            <ul className="space-y-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <li><Link href="/orders" className="hover:text-red-600 transition-colors uppercase">Track Order</Link></li>
              <li><Link href="/about" className="hover:text-red-600 transition-colors uppercase">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-red-600 transition-colors uppercase">Help Center</Link></li>
              <li><Link href="/careers" className="hover:text-red-600 transition-colors uppercase">Careers</Link></li>
            </ul>
          </div>

          {/* 4. Get in Touch (Right Aligned on Mobile | Same Line on Desktop) */}
          <div className="pt-2 text-right lg:text-left flex flex-col items-end lg:items-start">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest border-r-2 lg:border-r-0 lg:border-l-2 border-red-600 pr-2 lg:pr-0 lg:pl-2 mb-4">Get in Touch</h4>
            <div className="space-y-4 w-full flex flex-col items-end lg:items-start">
              <a href="tel:+8801958113002" className="flex flex-row-reverse lg:flex-row items-center gap-2 group transition-all">
                <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="text-[11px] font-black text-gray-900 group-hover:text-red-600 tracking-tight">+8801958113002</span>
              </a>
              <a href="mailto:cfb@circlenetworkbd.net" className="flex flex-row-reverse lg:flex-row items-center gap-2 group transition-all">
                <Mail className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="text-[10px] font-black text-gray-900 group-hover:text-red-600 lowercase tracking-tight">cfb@circlenetworkbd.net</span>
              </a>
              <div className="flex flex-row-reverse lg:flex-row items-start gap-2 mt-2 border-t border-slate-50 pt-3 w-full justify-start">
                <Building2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-gray-700 leading-tight uppercase tracking-tight whitespace-normal text-right lg:text-left">
                  Circle Enterprise . Unity trade Center, Pollibiddut Bus Stand Nabinagar, Ashulia, Savar, Dhaka-1344
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Corporate HUB */}
            <div className="bg-slate-100/50 p-6 rounded-3xl flex flex-col xl:flex-row items-center justify-between gap-6 border border-slate-200 group overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0 border border-slate-100 shadow-slate-200"><Building2 className="w-6 h-6 text-blue-600" /></div>
                <div>
                  <h5 className="text-[13px] font-black text-gray-900 uppercase tracking-tighter italic">Corporate <span className="text-blue-600">Inquiry Hub</span></h5>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Bulk orders & institutional queries</p>
                </div>
              </div>
              <Link href="/contact?type=corporate#contact-form" className="w-full xl:w-auto bg-black hover:bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all text-center flex items-center justify-center gap-2 shadow-2xl shadow-slate-200 active:scale-95">
                Contact Corporate
              </Link>
            </div>

            {/* Dealer HUB */}
            <div className="bg-slate-100/50 p-6 rounded-3xl flex flex-col xl:flex-row items-center justify-between gap-6 border border-slate-200 group overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0 border border-slate-100 shadow-slate-200"><MapPin className="w-6 h-6 text-red-600" /></div>
                <div>
                  <h5 className="text-[13px] font-black text-gray-900 uppercase tracking-tighter italic">Become <span className="text-red-600">An Official Dealer</span></h5>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Partner with us in your location</p>
                </div>
              </div>
              <Link href="/contact?type=dealer#contact-form" className="w-full xl:w-auto bg-black hover:bg-red-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all text-center flex items-center justify-center gap-2 shadow-2xl shadow-slate-200 active:scale-95">
                Apply for Dealership
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 py-4 text-center border-t border-slate-100 flex flex-col items-center gap-1.5">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} Parle Bangladesh. All rights reserved.</p>
      </div>
    </footer>
  );
}
