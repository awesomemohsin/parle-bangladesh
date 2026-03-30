'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Truck, ShieldCheck, Banknote, Zap } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description: string
  image?: string
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  image: string
  stock: number
  category: string
  ordersCount?: number
  variations?: any[]
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [bestSellers, setBestSellers] = useState<Product[]>([])
  const { addItem } = useCart()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    document.title = 'Home | Parle Bangladesh'
    const loadData = async () => {
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/products?sort=orders&limit=8'), // Sort by most ordered
        ])

        if (categoriesRes.ok) {
          const data = await categoriesRes.json()
          setCategories(data.categories || [])
        }

        if (productsRes.ok) {
          const data = await productsRes.json()
          setBestSellers((data.products || []).slice(0, 8))
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-white selection:bg-red-50">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 to-black/60 z-10" />
          <img 
            src="/images/hero-bg.webp" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-50 scale-105 animate-slow-zoom"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558961359-61f0c17086fb?q=80&w=2000&auto=format&fit=crop';
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full text-white">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="inline-block px-4 py-1.5 bg-red-600 text-[10px] font-bold uppercase tracking-widest rounded-full mb-6">
              Official Parle Shop
            </span>
            <h1 className="text-6xl md:text-7xl font-bold leading-[0.95] mb-6 tracking-tighter uppercase italic">
              Bite into Pure <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Deliciousness</span>
            </h1>
            <p className="text-lg text-gray-300 font-bold mb-10 leading-relaxed max-w-lg uppercase tracking-tight">
              Get your favorite biscuits and snacks delivered fresh to your door across Bangladesh.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/shop">
                <Button size="lg" className="h-16 px-10 rounded-xl bg-red-600 hover:bg-white hover:text-red-600 text-base font-bold uppercase tracking-widest transition-all shadow-xl shadow-red-900/20 group">
                  Start Shopping
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/shop/categories/biscuits">
                <Button size="lg" variant="outline" className="h-16 px-10 rounded-xl border-white/40 bg-white/5 backdrop-blur-sm text-white hover:bg-white hover:text-black hover:border-white text-base font-bold uppercase tracking-widest transition-all">
                  Browse Biscuits
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Promotional Offer Section */}
      <section className="bg-slate-50 border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center gap-6 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-lg shadow-slate-200/50 overflow-hidden"
          >
            <div className="md:w-[20%] w-full aspect-[4/3] md:aspect-[1.2/1] bg-white rounded-xl flex items-center justify-center relative overflow-hidden group border border-slate-50 shadow-inner">
               <img 
                 src="/images/offers/free-delivery.png" 
                 alt="Free Delivery" 
                 className="w-full h-full object-contain relative z-10 scale-90 group-hover:scale-100 transition-transform duration-700"
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
                 <Button className="w-full h-14 rounded-lg bg-black hover:bg-red-600 text-white font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 text-[10px]">
                    Shop Now
                 </Button>
               </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <div className="bg-white border-b relative z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
            {[
              { icon: Truck, label: 'Fast Delivery', sub: 'To your door' },
              { icon: ShieldCheck, label: 'Fresh Quality', sub: '100% Authentic' },
              { icon: Banknote, label: 'Best Prices', sub: 'Affordable snacks' },
              { icon: Star, label: 'Top Rated', sub: 'Customer favorite' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                  <badge.icon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-tight">{badge.label}</h4>
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{badge.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <section className="py-16 bg-slate-50/30">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Link
                  href={`/shop/categories/${cat.slug}`}
                  className="group relative block aspect-[4/5] rounded-3xl overflow-hidden bg-slate-100 border-2 border-white shadow-lg"
                >
                  <img 
                    src={cat.image || `/images/${cat.slug}/thumb.webp`} 
                    alt={cat.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.8] group-hover:brightness-90"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex flex-col justify-end">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-1">
                      {cat.name}
                    </h3>
                    <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest group-hover:text-white transition-colors duration-300">
                      View Items
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="py-20 bg-white">
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

          {!isLoading && bestSellers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
              {bestSellers.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="absolute -top-2 -right-2 z-10">
                     <span className="bg-black text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded shadow-lg border border-white/10">
                       Best Seller
                     </span>
                  </div>
                  <ProductCard
                    {...product}
                    variations={product.variations || []}
                    onAddToCart={(v) => {
                      addItem({
                        productId: product.id,
                        productName: product.name,
                        productSlug: product.slug,
                        price: v.price,
                        image: product.image,
                        quantity: 1,
                        weight: v.weight,
                        flavor: v.flavor,
                      })
                    }}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
               <Star className="w-10 h-10 text-slate-100 mb-4" />
               <p className="text-[10px] font-bold uppercase tracking-widest">
                 {isLoading ? 'Checking Stock...' : 'No Best Sellers Yet'}
               </p>
            </div>
          )}

          <div className="mt-16 text-center">
            <Link href="/shop">
              <Button size="lg" className="h-14 px-10 rounded-xl bg-black hover:bg-red-600 text-white font-bold uppercase tracking-widest transition-all active:scale-95 text-xs">
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
            <div className="lg:w-1/2 relative hidden lg:block">
               <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 group">
                  <img 
                    src="https://images.unsplash.com/photo-1579306194872-64d3b7bac4c2?q=80&w=1200&auto=format&fit=crop" 
                    alt="History" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
