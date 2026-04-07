'use client';

import Link from 'next/link';
import { Phone, Mail, Facebook, MessageCircle, Instagram, Building2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 font-sans mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {/* Brand Identity */}
          <div className="space-y-4">
            <Link href="/" className="block group">
              <img src="/logo.png" alt="Logo" className="h-14 w-auto object-contain" />
              <div className="flex flex-col border-l-4 border-red-600 pl-3 mt-2">
                <h3 className="text-lg font-black text-red-600 uppercase tracking-tighter italic leading-none">
                  Parle <span className="text-gray-900">Bangladesh</span>
                </h3>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="https://www.facebook.com/parlebangladesh/" target="_blank" className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-red-600 hover:bg-black hover:text-white transition-all"><Facebook className="w-3.5 h-3.5" /></Link>
              <Link href="#" className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-red-600 hover:bg-black hover:text-white transition-all"><Instagram className="w-3.5 h-3.5" /></Link>
              <Link href="https://wa.me/8801958113002" target="_blank" className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-red-600 hover:bg-black hover:text-white transition-all"><MessageCircle className="w-3.5 h-3.5" /></Link>
            </div>
          </div>

          {/* Quick Links Group - Catalog & Support combined or adjacent */}
          <div>
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3 border-l-2 border-red-600 pl-2">Catalog</h4>
            <ul className="space-y-1.5">
              {['Biscuits', 'Wafers'].map((item) => (
                <li key={item}><Link href={`/shop/categories/${item.toLowerCase()}`} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-600">{item}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3 border-l-2 border-red-600 pl-2">Support</h4>
            <ul className="space-y-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <li><Link href="/orders" className="hover:text-red-600 transition-colors">Track Order</Link></li>
              <li><Link href="/about" className="hover:text-red-600 transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-red-600 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Contact - List form */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest border-l-2 border-red-600 pl-2 mb-3">Get in Touch</h4>
            <div className="space-y-2">
              <a href="tel:+8801958113002" className="flex items-center gap-2 group">
                <Phone className="w-3 h-3 text-red-600" />
                <span className="text-[10px] font-black text-gray-900 group-hover:text-red-600 transition-colors tracking-tight">+8801958-113002</span>
              </a>
              <a href="mailto:cfb@circlenetworkbd.net" className="flex items-center gap-2 group">
                <Mail className="w-3 h-3 text-red-600" />
                <span className="text-[10px] font-black text-gray-900 group-hover:text-red-600 transition-colors lowercase tracking-tight">cfb@circlenetworkbd.net</span>
              </a>
              <div className="flex items-start gap-2 max-w-[220px]">
                <svg className="w-3 h-3 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <p className="text-[9px] font-bold text-gray-900 leading-tight">
                  Circle Enterprise . Unity trade Center, Pollibiddut Bus Stand Nabinagar, Ashulia, Savar, Dhaka-1344
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Hub - Compact Banner */}
        <div className="mt-8 pt-8 border-t border-slate-50">
          <div className="bg-slate-50/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-100 group">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 border border-slate-100"><Building2 className="w-5 h-5 text-red-600" /></div>
                <div>
                  <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-tighter italic">Corporate <span className="text-red-600">Inquiry Hub</span></h5>
                  <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest hidden md:block">Bulk orders & Distribution queries</p>
                </div>
             </div>
             <Link href="/contact?type=corporate#contact-form" className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all whitespace-nowrap">
                Contact Corporate →
             </Link>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 py-4 text-center">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">&copy; 2026 Parle Bangladesh. All rights reserved.</p>
      </div>
    </footer>
  );
}
