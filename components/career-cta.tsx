'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CareerCTA() {
  const pathname = usePathname();
  
  // Hide on admin routes and careers page itself
  if (pathname?.startsWith('/admin') || pathname === '/careers') {
    return null;
  }

  return (
    <section className="bg-slate-50 border-t overflow-hidden py-8">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-2 rounded-[2rem] border border-gray-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Icon/Image side */}
            <div className="md:w-[20%] w-full aspect-[4/3] md:aspect-square bg-slate-50 rounded-2xl flex items-center justify-center relative overflow-hidden group border border-slate-100 shadow-inner">
               <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
               <Briefcase className="w-12 h-12 text-red-600 group-hover:scale-110 transition-transform duration-500" />
            </div>

            {/* Content side */}
            <div className="flex-1 md:pl-2 py-6 md:py-0 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="w-6 h-0.5 bg-red-600 rounded-full"></span>
                <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Career Opportunities</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter leading-none uppercase mb-2 italic">
                Join Our <span className="text-red-600">Dynamic Team</span>
              </h2>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-0 max-w-lg">
                We're always looking for talented individuals to help us grow. <span className="text-gray-900 font-black">Explore job openings</span> and build your career with us.
              </p>
            </div>

            {/* CTA Button side */}
            <div className="md:w-[20%] p-4 w-full">
              <Link href="/careers" className="w-full">
                <Button className="w-full h-14 rounded-xl bg-black text-white hover:bg-red-600 transition-all shadow-lg active:scale-95 text-[10px] font-black uppercase tracking-[0.2em]">
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
