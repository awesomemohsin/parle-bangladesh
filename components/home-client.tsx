'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-[#E41E26] min-h-[600px] flex items-center pt-24 pb-20 lg:pt-0 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="w-full lg:w-1/2 text-white lg:text-left text-center"
          >
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/20 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full drop-shadow-sm">
                Official Parle Bangladesh Shop
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight uppercase italic drop-shadow-md">
              Bite into <br/>
              <span className="text-white">
                Pure Joy
              </span>
            </h1>
            
            <p className="text-sm md:text-lg text-white/95 font-medium mb-12 leading-relaxed max-w-lg uppercase tracking-tight mx-auto lg:mx-0">
              Get your favorite freshly baked biscuits and premium cookies delivered directly to your home across Bangladesh.
            </p>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link href="/shop" className="w-full sm:w-auto">
                <Button size="lg" className="h-14 w-full sm:w-auto px-10 rounded-xl bg-white text-black hover:bg-red-600 hover:text-white text-sm font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 group">
                  Start Shopping
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/shop/categories/biscuits" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="h-14 w-full sm:w-auto px-10 rounded-xl border-white/40 bg-white/10 backdrop-blur-md text-white hover:bg-white hover:text-black hover:border-white text-sm font-bold uppercase tracking-widest transition-all active:scale-95">
                  Buy Biscuits
                </Button>
              </Link>
            </div>

            {/* Stats badges */}
            <div className="mt-16 flex items-center justify-center lg:justify-start gap-10">
              <div className="flex flex-col text-white">
                <span className="text-3xl font-black italic">24/7</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-80">Express Delivery</span>
              </div>
              <div className="w-px h-10 bg-white/30" />
              <div className="flex flex-col text-white">
                <span className="text-3xl font-black italic">100%</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-80">Fresh Quality</span>
              </div>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            viewport={{ once: true }}
            className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end py-10 lg:py-0"
          >
            <div className="relative w-full max-w-[800px] lg:translate-x-10">
              <img 
                src="/images/parle-cover.webp" 
                alt="Parle Premium Biscuits Collection" 
                className="w-full h-auto drop-shadow-[-10px_20px_40px_rgba(0,0,0,0.3)] select-none pointer-events-none transform lg:scale-135"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558961359-61f0c17086fb?q=80&w=2000&auto=format&fit=crop';
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
    </section>
  )
}

export function MotionDiv({ children, i = 0 }: { children: React.ReactNode, i?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1 }}
      viewport={{ once: true }}
    >
      {children}
    </motion.div>
  )
}
