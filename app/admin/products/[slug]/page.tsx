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
  stock?: number
}

interface Product {
  id: string
  name: string
  slug: string
  category: string
  price: number
  stock: number
  description: string
  image: string
  rating: number
  weight?: string
  flavor?: string
  variations?: Variation[]
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

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories
        const catResponse = await fetch('/api/categories')
        if (catResponse.ok) {
          const data = await catResponse.json()
          setCategories(data.categories || [])
        }

        // Load product if editing
        if (!isNew) {
          const prodResponse = await fetch(`/api/products/${slug}`)
          if (prodResponse.ok) {
            const data = await prodResponse.json()
            setProduct(data.product)
          }
        } else {
          setProduct({
            id: '',
            name: '',
            slug: '',
            category: '',
            price: 0,
            stock: 0,
            description: '',
            image: '',
            rating: 0,
            weight: '',
            flavor: '',
            variations: [],
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

    setIsSaving(true)

    const updatedProduct = { ...product };
    if (updatedProduct.variations && updatedProduct.variations.length > 0) {
      updatedProduct.price = updatedProduct.variations[0].price;
      updatedProduct.stock = updatedProduct.variations.reduce((sum, v) => sum + (v.stock || 0), 0);
    }

    try {
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/products' : `/api/products/${slug}`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updatedProduct),
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!product) {
    return <div>Error loading product</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {isNew ? 'Add New Product' : 'Edit Product'}
      </h1>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <Input
              type="text"
              value={product.name}
              onChange={(e) =>
                setProduct({ ...product, name: e.target.value })
              }
              placeholder="e.g., Parle-G Gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={product.category}
              onChange={(e) =>
                setProduct({ ...product, category: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Weight
              </label>
              <Input
                type="text"
                value={product.weight || ''}
                onChange={(e) =>
                  setProduct({ ...product, weight: e.target.value })
                }
                placeholder="e.g., 200g"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Flavor
              </label>
              <Input
                type="text"
                value={product.flavor || ''}
                onChange={(e) =>
                  setProduct({ ...product, flavor: e.target.value })
                }
                placeholder="e.g., Chocolate"
              />
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Product Variations</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const variations = [...(product.variations || [])];
                  variations.push({ weight: '', flavor: '', price: 0, stock: 0 });
                  setProduct({ ...product, variations });
                }}
              >
                Add Variation
              </Button>
            </div>

            {product.variations && product.variations.length > 0 && (
              <div className="space-y-4">
                {product.variations.map((variation, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Weight</label>
                        <Input
                          type="text"
                          value={variation.weight || ''}
                          onChange={(e) => {
                            const variations = [...product.variations!];
                            variations[index].weight = e.target.value;
                            setProduct({ ...product, variations });
                          }}
                          className="h-9 text-sm"
                          placeholder="200g"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Flavor</label>
                        <Input
                          type="text"
                          value={variation.flavor || ''}
                          onChange={(e) => {
                            const variations = [...product.variations!];
                            variations[index].flavor = e.target.value;
                            setProduct({ ...product, variations });
                          }}
                          className="h-9 text-sm"
                          placeholder="Orange"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={variation.price}
                          onChange={(e) => {
                            const variations = [...product.variations!];
                            variations[index].price = parseFloat(e.target.value);
                            setProduct({ ...product, variations });
                          }}
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                          <Input
                            type="number"
                            value={variation.stock || 0}
                            onChange={(e) => {
                              const variations = [...product.variations!];
                              variations[index].stock = parseInt(e.target.value);
                              setProduct({ ...product, variations });
                            }}
                            className="h-9 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const variations = product.variations!.filter((_, i) => i !== index);
                            setProduct({ ...product, variations });
                          }}
                          className="text-red-600 border-red-200 hover:bg-red-50 h-9"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={product.description}
              onChange={(e) =>
                setProduct({ ...product, description: e.target.value })
              }
              placeholder="Product description..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Product'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
