'use client';

import Link from 'next/link';
import { Phone, Mail, Facebook, MessageCircle, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 font-sans mt-20">
      {/* Upper Footer - Compact Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Identity */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="block group w-fit">
              <img 
                src="/logo.png" 
                alt="Parle Bangladesh Logo" 
                className="h-20 w-auto object-contain transition-transform group-hover:scale-105 duration-300"
              />
              <div className="flex flex-col border-l-4 border-red-600 pl-4 mt-3">
                <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter leading-none italic">
                  Parle <span className="text-gray-900">Bangladesh</span>
                </h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                  Official Premium Shop
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link 
                href="https://www.facebook.com/parlebangladesh/" 
                target="_blank"
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-red-600 hover:bg-black hover:text-white transition-all shadow-sm"
              >
                <Facebook className="w-4 h-4" />
              </Link>
              <Link 
                href="#" 
                target="_blank"
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-red-600 hover:bg-black hover:text-white transition-all shadow-sm"
              >
                <Instagram className="w-4 h-4" />
              </Link>
              <Link 
                href="https://wa.me/8801958113002" 
                target="_blank" 
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-red-600 hover:bg-black hover:text-white transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Catalog */}
          <div>
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] mb-4 border-l-2 border-red-600 pl-3 leading-none">
              Catalog
            </h4>
            <ul className="space-y-2.5">
              {['Biscuits', 'Cookies', 'Wafers'].map((item) => (
                <li key={item}>
                  <Link 
                    href={`/shop/categories/${item.toLowerCase()}`} 
                    className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-0 h-0.5 bg-red-600 transition-all group-hover:w-2 rounded-full opacity-0 group-hover:opacity-100"></span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] mb-4 border-l-2 border-red-600 pl-3 leading-none">
              Support
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/orders" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-2 group">
                  <span className="w-2 h-0.5 bg-gray-100 group-hover:bg-red-600 group-hover:w-3 transition-all rounded-full"></span> Track Order
                </Link>
              </li>
              <li>
                <Link href="/shop/cart" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-2 group">
                  <span className="w-2 h-0.5 bg-gray-100 group-hover:bg-red-600 group-hover:w-3 transition-all rounded-full"></span> Your Cart
                </Link>
              </li>
              <li>
                <Link href="#" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-2 group">
                  <span className="w-2 h-0.5 bg-gray-100 group-hover:bg-red-600 group-hover:w-3 transition-all rounded-full"></span> Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div className="flex flex-col gap-4">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] mb-1 border-l-2 border-red-600 pl-3 leading-none">
              Contact Us
            </h4>
            <div className="space-y-4">
              {/* Call Center */}
              <div className="flex items-start gap-4 ring-1 ring-slate-100 p-2.5 rounded-xl transition-all">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                   <Phone className="w-3.5 h-3.5 text-red-600" />
                </div>
                <div>
                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Call Us</p>
                   <a href="tel:+8801958113002" className="text-xs font-black text-gray-900 hover:text-red-600 transition-colors tabular-nums tracking-tighter">
                     +8801958-113002
                   </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 ring-1 ring-slate-100 p-2.5 rounded-xl transition-all">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                   <Mail className="w-3.5 h-3.5 text-red-600" />
                </div>
                <div className="overflow-hidden">
                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Contact us</p>
                   <a href="mailto:parlebangladesh.official@gmail.com" className="text-[10px] font-black text-gray-900 hover:text-red-600 transition-colors tracking-tight truncate block">
                     parlebangladesh.official@gmail.com
                   </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom - Ultra Minimal */}
      <div className="border-t border-slate-50 bg-slate-50/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              &copy; 2026 Parle Bangladesh. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
