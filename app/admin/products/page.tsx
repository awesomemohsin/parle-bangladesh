'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface Variation {
  weight?: string;
  flavor?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  isDefault?: boolean;
}

interface Product {
  id: string
  name: string
  slug: string
  category: string
  variations: Variation[]
  description: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/products/${slug}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setProducts(products.filter((p) => p.slug !== slug))
      }
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Inventory...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Inventory</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Stock & Variation Control</p>
        </div>
        <Link href="/admin/products/new">
          <Button className="bg-red-600 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] px-6 py-4 h-10 rounded-lg shadow-lg shadow-red-100 transition-all active:scale-95">
            + New Product
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden border-2 border-gray-100 shadow-sm rounded-xl">
        {products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left font-black text-gray-400 uppercase tracking-widest text-[9px]">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left font-black text-gray-400 uppercase tracking-widest text-[9px]">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left font-black text-gray-400 uppercase tracking-widest text-[9px]">
                    Price (৳)
                  </th>
                  <th className="px-6 py-3 text-left font-black text-gray-400 uppercase tracking-widest text-[9px]">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-right font-black text-gray-400 uppercase tracking-widest text-[9px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((product) => {
                  const defaultVar = product.variations?.find(v => v.isDefault) || product.variations?.[0] || { price: 0, stock: 0 };
                  const totalStock = product.variations?.reduce((acc, v) => acc + (v.stock || 0), 0) || 0;

                  return (
                    <tr key={product.slug} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <p className="font-black text-gray-900 text-sm tracking-tighter leading-none">{product.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">/{product.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <p className="font-black text-red-600 text-sm tracking-tighter">
                          {defaultVar.discountPrice ? (
                            <span className="flex items-center gap-2">
                              ৳{Math.round(defaultVar.discountPrice)}
                              <span className="text-[9px] text-gray-300 line-through">৳{Math.round(defaultVar.price)}</span>
                            </span>
                          ) : (
                            `৳${Math.round(defaultVar.price)}`
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                            totalStock > 20
                              ? 'text-green-600 bg-green-50'
                              : totalStock > 0
                              ? 'text-orange-600 bg-orange-50'
                              : 'text-red-600 bg-red-50'
                          }`}
                        >
                          {totalStock} Left
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <Link href={`/admin/products/${product.slug}`}>
                          <Button variant="ghost" className="h-7 px-3 font-black text-[9px] uppercase tracking-widest hover:text-red-600 transition-all">
                            Manage
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(product.slug)}
                          className="h-7 px-2 font-black text-[9px] uppercase tracking-widest text-gray-200 hover:text-red-600 transition-all"
                        >
                          ×
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-600">
            <p>No products found. Create your first product!</p>
          </div>
        )}
      </Card>
    </div>
  )
}
