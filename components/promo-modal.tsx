'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ArrowRight, Gift } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface PromoPoster {
  id: number;
  image: string;
  link: string;
  alt: string;
  buttonText?: string;
  placement?: string;
}

export default function PromoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [posters, setPosters] = useState<PromoPoster[]>([]);
  const [hasSeenPromo, setHasSeenPromo] = useState(false);
  const pathname = usePathname();

  const isExcludedPage = ['/admin', '/offers', '/shop/checkout', '/shop/cart'].some(
    (prefix) => pathname.startsWith(prefix)
  );

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('promo_modal_seen', 'true');
    setHasSeenPromo(true);
  };

  const handleAction = () => {
    setIsOpen(false);
    sessionStorage.setItem('promo_modal_seen', 'true');
    setHasSeenPromo(true);
  };

  useEffect(() => {
    // Only show on frontend pages, excluding admin, offers, checkout, and cart
    if (isExcludedPage) {
        setIsOpen(false);
        return;
    }

    const fetchPosters = async () => {
      try {
        const res = await fetch('/api/promo-posters');
        if (res.ok) {
          const data = await res.json();
          const sliderPosters = data.filter((p: any) => p.placement === 'slider' || !p.placement);
          setPosters(sliderPosters);
          
          if (sliderPosters.length > 0) {
            const sessionClosed = sessionStorage.getItem('promo_modal_seen') === 'true';
            setHasSeenPromo(sessionClosed);

            if (!sessionClosed) {
              const timer = setTimeout(() => {
                setIsOpen(true);
              }, 100);
              return () => clearTimeout(timer);
            }
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
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen, currentIndex, posters]);

  const handleNext = () => {
    if (posters.length === 0) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % posters.length);
  };

  const handlePrev = () => {
    if (posters.length === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + posters.length) % posters.length);
  };

  if (posters.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-[90vw] xs:max-w-[380px] sm:max-w-md md:max-w-lg flex flex-col items-center gap-4 sm:gap-6 my-8 sm:my-auto"
            >
              {/* Image & Controls Wrapper */}
              <div className="relative w-full max-w-full md:w-auto group">
                  {/* Close Button */}
                  <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 md:-top-12 md:right-0 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all z-20 backdrop-blur-md border border-white/10"
                  >
                  <X className="w-5 h-5" />
                  </button>

                  {/* Side Controls */}
                  {posters.length > 1 && (
                      <>
                          <button
                              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                              className="absolute left-4 md:-left-16 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all z-20 backdrop-blur-md border border-white/10"
                          >
                              <ChevronLeft className="w-6 h-6" />
                          </button>
                          <button
                              onClick={(e) => { e.stopPropagation(); handleNext(); }}
                              className="absolute right-4 md:-right-16 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all z-20 backdrop-blur-md border border-white/10"
                          >
                              <ChevronRight className="w-6 h-6" />
                          </button>
                      </>
                  )}

                  {/* Image Section */}
                  <div className="relative w-full md:w-auto aspect-[1080/1350] h-auto md:h-[75vh] md:max-h-[640px] md:min-h-[360px] bg-white rounded-[24px] sm:rounded-[40px] shadow-2xl overflow-hidden">
                      {/* Carousel */}
                      <div className="relative w-full h-full overflow-hidden">
                          <AnimatePresence initial={false}>
                              <motion.div
                              key={currentIndex}
                              initial={{ opacity: 0, x: direction * 300 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -direction * 300 }}
                              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                              className="absolute inset-0 w-full h-full"
                              >
                              <Link href={posters[currentIndex].link} onClick={handleAction} className="block relative w-full h-full">
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

                          {/* Bottom Gradient Overlay (Subtle) */}
                          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                      </div>
                  </div>
              </div>

              {/* Bottom Interaction Area (Outside Image) */}
              <div className="flex flex-col items-center gap-6">
                  {/* Shop Now Button */}
                  <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                  >
                      <Link href={posters[currentIndex].link} onClick={handleAction}>
                      <span className="bg-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black text-gray-900 uppercase tracking-[0.3em] shadow-2xl flex items-center gap-2 sm:gap-3 group/btn">
                          {posters[currentIndex].buttonText || 'Shop Now'} <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/btn:translate-x-1 transition-transform" />
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

                  {/* See All Offers Link */}
                  <Link href="/offers" onClick={handleAction} className="text-[10px] font-black text-white/70 hover:text-white uppercase tracking-[0.2em] transition-colors mt-2">
                      See All Offers
                  </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Badge */}
      <AnimatePresence>
        {!isExcludedPage && !isOpen && hasSeenPromo && (
          <motion.button
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              scale: 1,
              rotate: [0, -10, 10, -10, 10, -10, 10, 0]
            }}
            exit={{ opacity: 0, x: 50, scale: 0.8 }}
            transition={{
              rotate: {
                repeat: Infinity,
                repeatDelay: 1.5,
                duration: 0.5,
                ease: "easeInOut"
              },
              default: { duration: 0.3 }
            }}
            whileHover={{ scale: 1.1, rotate: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[250] bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-full p-4 shadow-[0_0_25px_rgba(220,38,38,0.7)] flex items-center gap-3 border-2 border-white/30 group backdrop-blur-md transition-all hover:shadow-[0_0_35px_rgba(220,38,38,0.95)]"
          >
            <div className="relative flex items-center justify-center">
              <Gift className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider pr-1 hidden sm:inline-block">Special Offer</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
