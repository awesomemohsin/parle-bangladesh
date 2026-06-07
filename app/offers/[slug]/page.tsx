'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tag, ArrowLeft, ArrowRight, Loader2, Calendar, Share2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Offer {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  offerEndsAt: string;
  buttonText?: string;
  buttonLink?: string;
}

function CountdownTimerDetail({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('...');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
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
    <div className={`p-6 rounded-[24px] border ${
      isExpired 
        ? 'bg-red-50 border-red-100 text-red-700' 
        : 'bg-emerald-50 border-emerald-100 text-emerald-800'
    } flex flex-col gap-1.5 shadow-sm`}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Time Remaining</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-600' : 'bg-emerald-500 animate-pulse'}`}></span>
        <span className="text-xl sm:text-2xl font-black uppercase tracking-wider font-mono">
          {timeLeft}
        </span>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function OfferDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const res = await fetch(`/api/offers/${slug}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setOffer(data);
          setIsExpired(new Date(data.offerEndsAt).getTime() < Date.now());
        }
      } catch (err) {
        console.error('Failed to load offer details', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffer();
  }, [slug]);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Syncing Offer Details...</span>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-100 rounded-[40px] p-12 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-3xl mx-auto flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase">Offer Not Found</h2>
            <p className="text-gray-500 text-sm mt-2 font-medium leading-relaxed">
              The offer campaign you are looking for may have been removed or the URL is incorrect.
            </p>
          </div>
          <Link href="/offers" className="inline-block w-full">
            <span className="bg-gray-900 hover:bg-gray-800 text-white font-black uppercase text-xs tracking-widest py-4 rounded-xl transition-all shadow-xl flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Offers
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Back button header */}
      <div className="bg-white border-b border-gray-100/80 sticky top-16 z-30 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/offers">
            <span className="text-xs font-black text-gray-900 hover:text-red-600 uppercase tracking-widest flex items-center gap-2 group transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Offers
            </span>
          </Link>
          <button 
            onClick={handleShare}
            className="p-2 border border-gray-100 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase text-gray-700 active:scale-95 shrink-0"
          >
            <Share2 className="w-4 h-4 text-gray-400" />
            {copied ? 'Copied Link!' : 'Share'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Visual Image - Column 1 to 5 */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-5 relative aspect-[4/5] w-full bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-xl"
          >
            <Image
              src={offer.image}
              alt={offer.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
          </motion.div>

          {/* Description Content - Column 6 to 12 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-7 space-y-8"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-3.5 py-1.5 rounded-xl border border-red-100">
                <Tag className="w-3.5 h-3.5" />
                <span className="text-[9px] font-black uppercase tracking-wider">Campaign Details</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 uppercase tracking-tight italic leading-tight">
                {offer.title}
              </h1>

              <div className="flex items-center gap-2 text-gray-500 font-medium text-xs">
                <Calendar className="w-4 h-4 text-gray-300" />
                <span>Ends on: {new Date(offer.offerEndsAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Countdown Area */}
            <CountdownTimerDetail endTime={offer.offerEndsAt} />

            {isExpired && (
              <div className="bg-red-50 border border-red-100 rounded-[24px] p-5 flex items-start gap-3 text-red-800">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black uppercase tracking-wider">Campaign Finished</p>
                  <p className="text-xs leading-relaxed font-medium">
                    This offer is no longer valid as the campaign deadline has passed. Look at the general shop catalog for current active items.
                  </p>
                </div>
              </div>
            )}

            {/* Description Text */}
            <div className="bg-white rounded-[24px] border border-gray-100/80 p-6 sm:p-8 space-y-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Offer Overview</h3>
              <p className="text-gray-750 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {offer.description}
              </p>
            </div>

            {/* Call To Action */}
            {!isExpired && (
              <Link href={offer.buttonLink || '/shop'} className="block">
                <span className="w-full bg-red-600 hover:bg-gray-900 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-red-100/50 flex items-center justify-center gap-3">
                  {offer.buttonText || 'Shop Now'} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
