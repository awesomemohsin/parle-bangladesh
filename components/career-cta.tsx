'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CareerCTA() {
  const pathname = usePathname();
  
  // Hide on admin routes, careers page, and invoice pages
  if (pathname?.startsWith('/admin') || pathname === '/careers' || pathname?.includes('/invoice')) {
    return null;
  }

  return (
    <section className="bg-slate-50 border-t overflow-hidden py-4 md:py-8">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2.5 sm:p-3 rounded-2xl sm:rounded-[2rem] border border-gray-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="flex items-center gap-3 sm:gap-4 flex-grow w-full">
              {/* Icon/Image side */}
              <div className="relative w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-24 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 shadow-inner overflow-hidden group">
                 <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
                 <Briefcase className="w-6 h-6 sm:w-12 sm:h-12 text-red-600 group-hover:scale-110 transition-transform duration-500" />
              </div>

              {/* Content side */}
              <div className="flex-grow text-left pl-1 sm:pl-2 py-2 md:py-0 w-full sm:w-auto">
                <div className="flex items-center justify-start gap-1.5 mb-1">
                  <span className="w-4 h-0.5 bg-red-600 rounded-full"></span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-red-600 uppercase tracking-widest">Career Opportunities</span>
                </div>
                <h2 className="text-base sm:text-2xl font-black text-gray-900 tracking-tighter leading-none uppercase mb-1 italic">
                  Join Our <span className="text-red-600">Dynamic Team</span>
                </h2>
                <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-0 max-w-lg">
                  We're always looking for talented individuals to help us grow. <span className="text-gray-900 font-black">Explore job openings</span> and build your career with us.
                </p>
              </div>
            </div>

            {/* CTA Button side */}
            <div className="w-full sm:w-[20%] sm:max-w-[160px] px-1 sm:px-0 shrink-0">
              <Link href="/careers" className="w-full">
                <Button className="w-full h-11 sm:h-12 rounded-lg bg-black text-white hover:bg-red-600 transition-all shadow-sm active:scale-95 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                  View Jobs
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
