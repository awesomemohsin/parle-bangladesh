import Link from 'next/link'
import Image from 'next/image'
import ProductCard from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star, Truck, ShieldCheck, Banknote, Zap } from 'lucide-react'
import { getProducts, getCategories } from '@/lib/data'
import { HomeHero, MotionDiv } from '@/components/home-client'
import HomeProductSection from '@/components/home/product-section'

export const metadata = {
  title: 'Home | Parle Bangladesh',
  description: 'Official Parle Bangladesh Shop. Get your favorite biscuits and snacks delivered home.'
}

export default async function HomePage() {
  const [categories, recentProducts, bestSellers] = await Promise.all([
    getCategories(),
    getProducts({ limit: 12 }), 
    getProducts({ sort: { ordersCount: -1 }, limit: 12 }) 
  ]);

  return (
    <div className="min-h-screen bg-white selection:bg-red-50">
      <HomeHero />

      {/* Promotional Offer Section */}
      <section className="bg-slate-50 border-b overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <MotionDiv>
            <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-lg shadow-slate-200/50 overflow-hidden">
              <div className="md:w-[20%] w-full aspect-[4/3] md:aspect-[1.2/1] bg-white rounded-xl flex items-center justify-center relative overflow-hidden group border border-slate-50 shadow-inner">
                <Image
                  src="/images/offers/free-delivery.png"
                  alt="Free Delivery"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain p-4 relative z-10 scale-90 group-hover:scale-100 transition-transform duration-700"
                />
              </div>

              <div className="flex-1 md:pl-2 py-6 md:py-0 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <span className="w-6 h-0.5 bg-red-600 rounded-full"></span>
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Special Offer</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-none uppercase mb-1.5">
                  Free Delivery Today
                </h2>
                <p className="text-xs text-gray-400 font-bold tracking-tight uppercase mb-0 max-w-lg">
                  Shop for <span className="text-gray-900 font-black">৳ 1000+</span> and get <span className="text-red-600 font-black italic">Free delivery</span> everywhere in Bangladesh.
                </p>
              </div>

              <div className="md:w-[20%] p-4 w-full">
                <Link href="/shop" className="w-full">
                  <Button className="w-full h-14 rounded-lg bg-white text-black hover:bg-red-600 hover:text-white font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 text-[10px]">
                    Shop Now
                  </Button>
                </Link>
              </div>
            </div>
          </MotionDiv>
        </div>
      </section>

      {/* Trust Badges */}
      <div className="bg-white border-b relative z-30 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
            {[
              { icon: Truck, label: 'Fast Delivery', sub: 'To your door' },
              { icon: ShieldCheck, label: 'Fresh Quality', sub: '100% Authentic' },
              { icon: Banknote, label: 'Best Prices', sub: 'Affordable snacks' },
              { icon: Star, label: 'Top Rated', sub: 'Customer favorite' },
            ].map((badge, i) => (
              <div key={i} className="flex flex-col items-center justify-center group text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                  <badge.icon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-black text-gray-900 uppercase tracking-tight">{badge.label}</h4>
                  <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest">{badge.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <section id="categories" className="py-16 bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-1 bg-red-600 rounded-full"></span>
                <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Collections</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight leading-none uppercase italic">
                Choose by Category
              </h2>
            </div>
            <Link href="/shop" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-600 transition-all flex items-center gap-2">
              See All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-stretch">
            {categories.map((cat: any, i: number) => (
              <MotionDiv key={cat._id || i} i={i} className="h-full">
                <Link
                  href={`/shop?category=${cat.slug}`}
                  className="group flex flex-col h-full bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:shadow-red-200/40 hover:border-red-100 hover:-translate-y-2 relative"
                >
                  <div className="relative w-full aspect-[16/10] bg-slate-50 overflow-hidden">
                    <Image
                      src={`/images/${cat.slug}/${cat.slug}.webp`}
                      alt={cat.name}
                      fill
                      priority={i < 2}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-opacity duration-700 group-hover:opacity-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                  </div>
                  <div className="flex flex-col px-6 py-6 md:px-8 md:py-8 flex-grow justify-between bg-white relative">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter italic leading-none group-hover:text-red-600 transition-colors duration-300">
                         {cat.name}
                       </h3>
                       <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-red-600 group-hover:shadow-lg group-hover:shadow-red-200 transition-all duration-300 transform group-hover:scale-110 shrink-0">
                          <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                       </div>
                    </div>
                    <p className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest line-clamp-2 max-w-[85%] leading-relaxed mt-auto">
                      {cat.description || `Explore our complete selection of freshly baked ${cat.name}.`}
                    </p>
                  </div>
                </Link>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      {/* Newly Arrived Products Section */}
      <section className="py-20 bg-slate-50/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-8 h-0.5 bg-red-600 rounded-full"></span>
              <span className="text-xs font-bold text-red-600 uppercase tracking-widest">New Arrival</span>
              <span className="w-8 h-0.5 bg-red-600 rounded-full"></span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight uppercase italic leading-none mb-6">
              Recently Added
            </h2>
          </div>

          {recentProducts.length > 0 ? (
            <HomeProductSection products={recentProducts} type="recent" />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Zap className="w-10 h-10 text-slate-100 mb-4 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                No new arrivals yet
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-8 h-0.5 bg-red-600 rounded-full"></span>
              <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Popular Picks</span>
              <span className="w-8 h-0.5 bg-red-600 rounded-full"></span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight uppercase italic leading-none mb-6">
              Best Sellers
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto font-bold uppercase tracking-tight">
              Most loved snacks loved by customers across the country.
            </p>
          </div>

          {bestSellers.length > 0 ? (
            <HomeProductSection products={bestSellers} type="bestseller" />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Star className="w-10 h-10 text-slate-100 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                No Best Sellers Yet
              </p>
            </div>
          )}

          <div className="mt-16 text-center">
            <Link href="/shop">
              <Button size="lg" className="h-14 px-10 rounded-xl bg-white text-black hover:bg-red-600 hover:text-white font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 text-xs">
                See All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-red-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/4 h-full bg-red-700/40 skew-x-[-10deg] translate-x-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center md:text-left">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2 text-white">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight uppercase italic leading-none mb-6">
                Joy in Every Bite
              </h2>
              <p className="text-red-100 text-base mb-8 leading-relaxed font-bold uppercase tracking-tight">
                Parle has been at the heart of snack time for generations. From iconic biscuits to premium cookies, we believe every bite should bring a moment of joy. We are proud to share these world-class flavors with every home in Bangladesh.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8 max-w-md mx-auto md:mx-0">
                <div>
                  <span className="text-4xl font-black block mb-1 tracking-tighter italic">90+</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Years of History</span>
                </div>
                <div>
                  <span className="text-4xl font-black block mb-1 tracking-tighter italic">100M+</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Happy Customers</span>
                </div>
              </div>
              <Link href="/shop">
                <Button size="lg" variant="secondary" className="h-14 px-10 rounded-xl font-bold uppercase tracking-widest bg-white text-red-600 hover:bg-slate-50 transition-colors text-xs shadow-xl shadow-black/10">
                  Read More
                </Button>
              </Link>
            </div>
            <div className="lg:w-1/2 relative hidden lg:block overflow-visible">
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src="/images/parle-website.webp"
                  alt="Parle History"
                  width={800}
                  height={800}
                  className="w-full h-auto max-h-[500px] object-contain drop-shadow-[-10px_20px_40px_rgba(0,0,0,0.3)] select-none transition-transform duration-700 transform scale-[1.25] hover:scale-[1.3] cursor-zoom-in"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
