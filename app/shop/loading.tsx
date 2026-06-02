"use client";

import { motion } from "framer-motion";
import { Cookie, Loader2 } from "lucide-react";

export default function ShopLoading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center font-sans p-6">
      {/* Dynamic Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-50/50 via-white to-red-50/20 pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-xs text-center z-10">
        {/* Cute bouncing biscuit icon container */}
        <motion.div
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, 10, -10, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-24 h-24 bg-red-50 rounded-[35px] flex items-center justify-center shadow-xl shadow-red-100/50 border border-red-100 mb-8 relative"
        >
          <Cookie className="w-12 h-12 text-red-600 animate-pulse" />
          
          {/* Small decorative spark stars */}
          <span className="absolute top-2 right-2 text-red-400 animate-pulse text-xs">✦</span>
          <span className="absolute bottom-3 left-3 text-red-400 animate-pulse text-sm">✦</span>
        </motion.div>

        {/* Cute Title */}
        <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tight mb-2">
          Baking the Details...
        </h2>

        {/* Pulsing subtext */}
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed flex items-center justify-center gap-2">
          <span>Preparing your delicious snacks</span>
          <Loader2 className="w-3 h-3 text-red-600 animate-spin" />
        </p>
      </div>
    </div>
  );
}
