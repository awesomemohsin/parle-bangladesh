'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Variation {
  weight?: string
  flavor?: string
  price: number
  discountPrice?: number
  stock: number
  isDefault?: boolean
}

interface Product {
  id: string
  name: string
  slug: string
  category: string
  description: string
  image: string
  variations: Variation[]
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function AdminProductFormPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const isNew = slug === 'new'

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [activeDiscounts, setActiveDiscounts] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const catResponse = await fetch('/api/categories')
        if (catResponse.ok) {
          const data = await catResponse.json()
          setCategories(data.categories || [])
        }

        if (!isNew) {
          const prodResponse = await fetch(`/api/products/${slug}`)
          if (prodResponse.ok) {
            const data = await prodResponse.json()
            setProduct(data.product)
            
            // Initialize discount toggles
            const discounts: Record<number, boolean> = {}
            data.product.variations.forEach((v: Variation, i: number) => {
              if (v.discountPrice && v.discountPrice > 0) {
                discounts[i] = true
              }
            })
            setActiveDiscounts(discounts)
          }
        } else {
          setProduct({
            id: '',
            name: '',
            slug: '',
            category: '',
            description: '',
            image: '',
            variations: [{ weight: '', flavor: '', price: 0, stock: 0, isDefault: true }],
          })
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isNew, slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    if (product.variations.length === 0) {
      alert('Please add at least one variation')
      return
    }

    setIsSaving(true)

    try {
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/products' : `/api/products/${slug}`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      })

      if (response.ok) {
        router.push('/admin/products')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to save product:', error)
      alert('Failed to save product')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Inventory...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border-2 border-red-100">
        <p className="text-red-600 font-black uppercase tracking-widest text-xs">Error Loading Product</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
          {isNew ? 'New Product' : 'Modify Product'}
        </h1>
        <p className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.3em] leading-none">Database Synchronization Engine</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 items-start">
          
          {/* Main Info - Top horizontal strip */}
          <Card className="p-6 border-2 border-gray-100 shadow-sm rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Title</label>
                <Input
                  type="text"
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  className="h-10 text-xs font-bold border-2 border-gray-50 rounded-lg focus:border-red-600"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Slug</label>
                <Input
                  type="text"
                  value={product.slug}
                  onChange={(e) => setProduct({ ...product, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="h-10 text-[10px] font-mono border-2 border-gray-50 rounded-lg focus:border-red-600"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Category</label>
                <select
                  value={product.category}
                  onChange={(e) => setProduct({ ...product, category: e.target.value })}
                  required
                  className="w-full h-10 px-3 text-[10px] font-black uppercase text-gray-600 border-2 border-gray-50 rounded-lg bg-white focus:border-red-600 outline-none"
                >
                  <option value="">Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Image URL</label>
                <Input
                  type="text"
                  value={product.image}
                  onChange={(e) => setProduct({ ...product, image: e.target.value })}
                  className="h-10 text-[10px] border-2 border-gray-50 rounded-lg focus:border-red-600"
                />
              </div>
            </div>
          </Card>

          {/* Variations Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-4 bg-red-600"></span> Variation Inventory
              </h2>
              <Button
                type="button"
                onClick={() => {
                  const variations = [...(product.variations || [])];
                  variations.push({ weight: '', flavor: '', price: 0, stock: 0, isDefault: variations.length === 0 });
                  setProduct({ ...product, variations });
                }}
                className="h-8 px-4 bg-red-600 text-white hover:bg-black text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
              >
                + Add Variant
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {product.variations.map((variation, index) => (
                <Card key={index} className={`p-6 border-2 transition-all relative overflow-hidden ${variation.isDefault ? 'border-red-600 bg-red-50/10' : 'border-gray-50 bg-white hover:border-gray-100'}`}>
                  {variation.isDefault && (
                    <div className="absolute top-0 right-0 p-2">
                      <span className="text-[7px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded-bl-lg">Primary SKU</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-end">
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Weight</label>
                      <Input
                        type="text"
                        value={variation.weight}
                        onChange={(e) => {
                          const vars = [...product.variations];
                          vars[index].weight = e.target.value;
                          setProduct({ ...product, variations: vars });
                        }}
                        className="h-9 px-3 text-[10px] font-black border-2 border-gray-50 rounded-lg focus:border-red-600"
                        placeholder="e.g. 200g"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Flavor</label>
                      <Input
                        type="text"
                        value={variation.flavor}
                        onChange={(e) => {
                          const vars = [...product.variations];
                          vars[index].flavor = e.target.value;
                          setProduct({ ...product, variations: vars });
                        }}
                        className="h-9 px-3 text-[10px] font-black border-2 border-gray-50 rounded-lg focus:border-red-600"
                        placeholder="Original"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Normal Price</label>
                      <Input
                        type="number"
                        value={variation.price}
                        onChange={(e) => {
                          const vars = [...product.variations];
                          vars[index].price = parseFloat(e.target.value);
                          setProduct({ ...product, variations: vars });
                        }}
                        className="h-9 px-3 text-[10px] font-black text-red-600 border-2 border-gray-50 rounded-lg focus:border-red-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-1 justify-between pr-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">Promotion</label>
                        <input 
                          type="checkbox" 
                          checked={activeDiscounts[index] || (!!variation.discountPrice && variation.discountPrice > 0)}
                          onChange={(e) => {
                            const isChecked = e.target.checked
                            setActiveDiscounts({ ...activeDiscounts, [index]: isChecked })
                            if (!isChecked) {
                              const vars = [...product.variations];
                              vars[index].discountPrice = 0;
                              setProduct({ ...product, variations: vars });
                            }
                          }}
                          className="w-3 h-3 accent-red-600 cursor-pointer"
                        />
                      </div>
                      <Input
                        type="number"
                        value={variation.discountPrice || ''}
                        disabled={!activeDiscounts[index] && (!variation.discountPrice || variation.discountPrice === 0)}
                        onChange={(e) => {
                          const vars = [...product.variations];
                          vars[index].discountPrice = e.target.value ? parseFloat(e.target.value) : 0;
                          setProduct({ ...product, variations: vars });
                        }}
                        className="h-9 px-3 text-[10px] font-black border-2 border-gray-50 rounded-lg disabled:bg-gray-50 disabled:opacity-30 focus:border-red-600"
                        placeholder="Sale price"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Stock</label>
                      <Input
                        type="number"
                        value={variation.stock}
                        onChange={(e) => {
                          const vars = [...product.variations];
                          vars[index].stock = parseInt(e.target.value);
                          setProduct({ ...product, variations: vars });
                        }}
                        className="h-9 px-3 text-[10px] font-black border-2 border-gray-50 rounded-lg focus:border-red-600"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pb-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const vars = product.variations.map((v, i) => ({ ...v, isDefault: i === index }));
                          setProduct({ ...product, variations: vars });
                        }}
                        className={`h-9 px-4 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${variation.isDefault ? 'bg-black text-white' : 'text-gray-300 hover:text-red-600'}`}
                      >
                        Main SKU
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          if (product.variations.length === 1) return;
                          const vars = product.variations.filter((_, i) => i !== index);
                          if (variation.isDefault) vars[0].isDefault = true;
                          setProduct({ ...product, variations: vars });
                        }}
                        className="h-9 px-2 text-gray-200 hover:text-red-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </Button>
                    </div>
                  </div>
                </Card>
                ))}
              </div>
            </div>

          {/* Metadata - Bottom Section */}
          <Card className="p-6 border-2 border-gray-100 shadow-sm rounded-xl space-y-2">
            <label className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Product Description</label>
            <textarea
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              placeholder="Full description..."
              className="w-full p-4 h-24 text-[11px] font-medium text-gray-500 border-2 border-gray-50 rounded-xl focus:border-red-600 transition-all resize-none leading-relaxed outline-none"
            />
          </Card>

        </div>

        <div className="flex gap-4 pt-6 border-t border-gray-50">
          <Button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-red-600 hover:bg-black text-white font-black uppercase tracking-[0.3em] h-14 rounded-xl shadow-lg shadow-red-100 transition-all active:scale-95"
          >
            {isSaving ? 'Syncing...' : 'Update Database'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="px-10 border-2 border-black text-black font-black uppercase tracking-widest h-14 rounded-xl transition-all hover:bg-black hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
