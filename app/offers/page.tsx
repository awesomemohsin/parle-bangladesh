'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tag, ArrowRight, Loader2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface Offer {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  offerEndsAt: string;
}

function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('...');

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className="flex items-center gap-1.5 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-100 text-red-700 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
      <span className="text-[10px] font-black uppercase tracking-wider font-mono">
        Ends in: {timeLeft}
      </span>
    </div>
  );
}

export default function OffersListing() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await fetch('/api/offers', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setOffers(data);
        }
      } catch (err) {
        console.error('Failed to load offers', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Syncing Active Deals...</span>
          </div>
        ) : offers.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-[40px] p-16 sm:p-24 text-center max-w-xl mx-auto space-y-6 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl mx-auto flex items-center justify-center">
              <Tag className="w-10 h-10 text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase">No Active Campaigns</h2>
              <p className="text-gray-500 text-sm mt-2 font-medium leading-relaxed">
                We don't have any live campaigns running right now. Follow us or check back soon for our delicious new offers!
              </p>
            </div>
            <Link href="/shop" className="inline-block">
              <span className="bg-red-600 hover:bg-gray-900 text-white font-black uppercase text-xs tracking-widest px-8 py-4 rounded-xl transition-all shadow-xl shadow-red-100/50 flex items-center gap-3">
                Visit Shop Now <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {offers.map((offer) => (
              <motion.div
                key={offer._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="group bg-white rounded-[32px] border border-gray-100/80 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col h-full cursor-pointer"
              >
                <Link href={`/offers/${offer.slug}`} className="flex flex-col h-full">
                  {/* Image Area */}
                  <div className="relative aspect-[4/5] w-full bg-slate-100 overflow-hidden">
                    <Image
                      src={offer.image}
                      alt={offer.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4 z-10">
                      <CountdownTimer endTime={offer.offerEndsAt} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex-grow space-y-3">
                      <h3 className="text-xl font-black text-gray-900 leading-tight uppercase group-hover:text-red-600 transition-colors line-clamp-3">
                        {offer.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 font-normal">
                        {offer.description}
                      </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-gray-400 font-medium">
                        <Calendar className="w-4 h-4 text-gray-300" />
                        <span className="text-[10px] uppercase tracking-wider font-mono">
                          {new Date(offer.offerEndsAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="shrink-0 text-red-600 group-hover:text-gray-900 font-black uppercase text-[11px] tracking-widest flex items-center gap-2 group/btn">
                        View Details
                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
