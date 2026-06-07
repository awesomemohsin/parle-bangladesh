'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ShoppingBag, Tag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-slate-50/50 py-16">
      <div className="max-w-md w-full text-center space-y-8">
        
        {/* Animated Cookie Illustration Container */}
        <div className="relative flex justify-center py-6">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-44 h-44 flex items-center justify-center shrink-0"
          >
            {/* Cute Biscuit Body with Bite Mark */}
            <div className="relative w-40 h-40 rounded-full bg-amber-200 border-4 border-amber-300 shadow-xl overflow-hidden flex items-center justify-center">
              {/* Bite Mark (Bite taken out from top right) */}
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-slate-50 border-4 border-slate-100 shadow-inner rounded-full" />
              
              {/* Cookie Chips (Chocolate) */}
              <div className="absolute top-8 left-10 w-3.5 h-3.5 rounded-full bg-amber-900" />
              <div className="absolute top-12 right-12 w-4 h-4 rounded-full bg-amber-950" />
              <div className="absolute bottom-10 left-12 w-4.5 h-4.5 rounded-full bg-amber-900" />
              <div className="absolute bottom-12 right-14 w-3.5 h-3.5 rounded-full bg-amber-900" />
              <div className="absolute top-20 left-6 w-3 h-3 rounded-full bg-amber-950" />
              <div className="absolute bottom-20 right-6 w-3 h-3 rounded-full bg-amber-900" />
              
              {/* Cute Sad Face */}
              <div className="flex flex-col items-center space-y-2 relative z-10">
                <div className="flex gap-6 mt-2">
                  {/* Left Eye */}
                  <motion.div 
                    animate={{ scaleY: [1, 0.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2.2 }}
                    className="w-3.5 h-3.5 bg-neutral-900 rounded-full origin-center"
                  />
                  {/* Right Eye */}
                  <motion.div 
                    animate={{ scaleY: [1, 0.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2.2 }}
                    className="w-3.5 h-3.5 bg-neutral-900 rounded-full origin-center"
                  />
                </div>
                {/* Sad Mouth */}
                <div className="w-5 h-2.5 border-t-4 border-neutral-900 rounded-t-full rotate-180 mt-1" />
              </div>
            </div>
            
            {/* Floating Crumbs */}
            <motion.div 
              animate={{ y: [0, 8, 0], opacity: [0.7, 0.3, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="absolute bottom-2 left-12 w-2 h-2 rounded bg-amber-900"
            />
            <motion.div 
              animate={{ y: [0, 12, 0], opacity: [0.8, 0.4, 0.8] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
              className="absolute bottom-4 right-16 w-1.5 h-1.5 rounded-full bg-amber-950"
            />
            <motion.div 
              animate={{ y: [0, 6, 0], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.2 }}
              className="absolute bottom-1 right-8 w-2 h-1.5 rounded bg-amber-900"
            />
          </motion.div>
        </div>

        {/* Text Area */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-4 py-1.5 rounded-full border border-red-100">
            <span className="text-[10px] font-black uppercase tracking-widest">404 ERROR</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
            Oops! Page <span className="text-red-600">Crumbled</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-sm mx-auto font-medium leading-relaxed">
            We searched the bakery cupboard but couldn't find the page you are looking for. Someone might have eaten it!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Link href="/">
            <span className="w-full bg-red-600 hover:bg-gray-900 text-white font-black uppercase text-xs tracking-widest py-4.5 rounded-2xl transition-all shadow-xl shadow-red-100/50 flex items-center justify-center gap-2.5 cursor-pointer">
              <Home className="w-4 h-4" /> Go Back Home
            </span>
          </Link>
          
          <div className="grid grid-cols-2 gap-3">
            <Link href="/shop">
              <span className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-bold uppercase text-[10px] tracking-wider py-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                <ShoppingBag className="w-4 h-4 text-gray-400" /> Visit Shop
              </span>
            </Link>
            <Link href="/offers">
              <span className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold uppercase text-[10px] tracking-wider py-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                <Tag className="w-4 h-4 text-amber-600 animate-pulse" /> View Offers
              </span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
