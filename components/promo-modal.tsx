'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface PromoPoster {
  id: number;
  image: string;
  link: string;
  alt: string;
}

export default function PromoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [posters, setPosters] = useState<PromoPoster[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Only show on homepage
    if (pathname !== '/') {
        setIsOpen(false);
        return;
    }

    const fetchPosters = async () => {
      try {
        const res = await fetch('/api/promo-posters');
        if (res.ok) {
          const data = await res.json();
          setPosters(data);
          
          if (data.length > 0) {
            // Show modal after a short delay
            // Reappears on every homepage reload as requested
            const timer = setTimeout(() => {
              setIsOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
          } else {
            setIsOpen(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch posters', err);
      }
    };

    fetchPosters();
  }, [pathname]);

  // Auto-play only if more than 1 poster
  useEffect(() => {
    if (!isOpen || posters.length <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, currentIndex, posters]);

  const handleNext = () => {
    if (posters.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % posters.length);
  };

  const handlePrev = () => {
    if (posters.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + posters.length) % posters.length);
  };

  if (!isOpen || posters.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg flex flex-col gap-6"
          >
            {/* Image Section */}
            <div className="relative w-full aspect-[1080/1350] bg-white rounded-[40px] shadow-2xl overflow-hidden group">
                {/* Close Button */}
                <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all z-20 backdrop-blur-md"
                >
                <X className="w-5 h-5" />
                </button>

                {/* Carousel */}
                <div className="relative w-full h-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute inset-0"
                        >
                        <Link href={posters[currentIndex].link} onClick={() => setIsOpen(false)} className="block relative w-full h-full">
                            <Image
                            src={posters[currentIndex].image}
                            alt={posters[currentIndex].alt}
                            fill
                            sizes="(max-width: 768px) 100vw, 512px"
                            className="object-cover"
                            priority
                            loading="eager"
                            />
                        </Link>
                        </motion.div>
                    </AnimatePresence>

                    {/* Side Controls */}
                    {posters.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/30 text-white rounded-full transition-all z-20 backdrop-blur-md opacity-0 group-hover:opacity-100"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/30 text-white rounded-full transition-all z-20 backdrop-blur-md opacity-0 group-hover:opacity-100"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </>
                    )}

                    {/* Bottom Gradient Overlay (Subtle) */}
                    <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>
            </div>

            {/* Bottom Interaction Area (Outside Image) */}
            <div className="flex flex-col items-center gap-6">
                {/* Shop Now Button */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Link href={posters[currentIndex].link} onClick={() => setIsOpen(false)}>
                    <span className="bg-white px-12 py-4 rounded-2xl text-xs font-black text-gray-900 uppercase tracking-[0.3em] shadow-2xl flex items-center gap-3 group/btn">
                        Shop Now <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                    </Link>
                </motion.div>

                {/* Indicators */}
                {posters.length > 1 && (
                    <div className="flex justify-center gap-3">
                        {posters.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                            currentIndex === idx ? 'w-12 bg-white' : 'w-2 bg-white/20 hover:bg-white/40'
                            }`}
                        />
                        ))}
                    </div>
                )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
