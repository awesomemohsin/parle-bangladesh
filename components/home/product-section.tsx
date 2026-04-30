'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProductCard from '@/components/product-card'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductSectionProps {
  products: any[]
  type: 'recent' | 'bestseller'
}

export default function HomeProductSection({ products, type }: ProductSectionProps) {
  const [page, setPage] = useState(0)
  const [displayProducts, setDisplayProducts] = useState<any[]>([])
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    // Shuffle logic for "Different Daily"
    const seed = new Date().getDate()
    const shuffled = [...products].sort((a, b) => {
      const hashA = (a._id || a.slug).split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + seed
      const hashB = (b._id || b.slug).split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + seed
      return (hashA % 10) - (hashB % 10)
    })
    
    setDisplayProducts(shuffled.slice(0, 8)) // Exactly 8 products
  }, [products])

  useEffect(() => {
    if (displayProducts.length <= 4 || isHovered) return

    const timer = setInterval(() => {
      setPage((prev) => (prev + 1) % 2)
    }, 5000)

    return () => clearInterval(timer)
  }, [displayProducts, isHovered])

  if (displayProducts.length === 0) return null

  // Show 4 products at a time
  const currentProducts = displayProducts.slice(page * 4, (page * 4) + 4)

  return (
    <div 
      className="relative group/carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Navigation Arrows */}
      {displayProducts.length > 4 && (
        <>
          <button
            onClick={() => setPage((prev) => (prev - 1 + 2) % 2)}
            className="absolute -left-2 lg:-left-12 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setPage((prev) => (prev + 1) % 2)}
            className="absolute -right-2 lg:-right-12 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div className="min-h-[400px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-10 sm:gap-y-12"
          >
            {currentProducts.map((product, i) => (
              <div key={product._id} className="relative">
                <Badge type={type} />
                <ProductCard id={product._id} {...product} priority={page === 0} />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Indicators */}
      {displayProducts.length > 4 && (
        <div className="flex justify-center gap-2 mt-12">
          {[0, 1].map((i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-1.5 transition-all duration-500 rounded-full ${
                page === i ? 'w-10 bg-red-600' : 'w-2 bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Badge({ type }: { type: 'recent' | 'bestseller' }) {
    const text = type === 'recent' ? 'New' : 'Best Seller'
    const color = type === 'recent' ? 'bg-red-600' : 'bg-black'
    
    return (
        <div className="absolute -top-2 -right-2 z-10">
            <span className={`${color} text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded shadow-lg border border-white/10`}>
                {text}
            </span>
        </div>
    )
}
