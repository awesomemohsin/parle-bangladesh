'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Category {
  id: string
  name: string
  slug: string
  description: string
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newCategory, setNewCategory] = useState({ name: '', description: '', image: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', image: '' })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.name) return
    setIsAdding(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newCategory),
      })
      if (response.ok) {
        const data = await response.json()
        setCategories([...categories, data.category])
        setNewCategory({ name: '', description: '', image: '' })
      }
    } catch (error) {
      console.error('Failed to add category:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const startEditing = (category: Category) => {
    setEditingId(category.id)
    setEditForm({ name: category.name, description: category.description, image: (category as any).image || '' })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ name: '', description: '', image: '' })
  }

  const handleUpdateCategory = async (slug: string) => {
    if (!editForm.name) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/categories/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(editForm),
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(categories.map(c => c.slug === slug ? data.category : c))
        setEditingId(null)
      }
    } catch (error) {
      console.error('Failed to update category:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this category? All products in this category will be preserved but uncategorized.')) return
    try {
      const response = await fetch(`/api/categories/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (response.ok) {
        setCategories(categories.filter((c) => c.slug !== slug))
      }
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">Loading categories...</div>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight leading-none mb-2">Categories</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Organize your products collection</p>
        </div>
      </div>

      <Card className="p-8 border-2 border-gray-50 shadow-sm rounded-2xl overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
        <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
          Add New Category
          <span className="w-8 h-[2px] bg-red-600 rounded-full"></span>
        </h2>
        <form onSubmit={handleAddCategory} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Name</label>
              <Input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g. Biscuits"
                className="h-11 text-xs font-bold border-2 border-gray-50 rounded-xl focus:border-red-600"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Image URL</label>
              <Input
                type="text"
                value={newCategory.image}
                onChange={(e) => setNewCategory({ ...newCategory, image: e.target.value })}
                placeholder="/images/category-fav.webp"
                className="h-11 text-xs font-bold border-2 border-gray-50 rounded-xl focus:border-red-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Description</label>
              <Input
                type="text"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Quick summary..."
                className="h-11 text-xs font-bold border-2 border-gray-50 rounded-xl focus:border-red-600"
              />
            </div>
          </div>
          <Button type="submit" disabled={isAdding} className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] bg-red-600 hover:bg-black transition-all shadow-lg shadow-red-100">
            {isAdding ? 'Processing...' : 'Create Category'}
          </Button>
        </form>
      </Card>

      <Card className="border-2 border-gray-50 shadow-sm rounded-2xl overflow-hidden">
        {categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Image</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category Name</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((category) => (
                  <tr key={category.id} className="group hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-4" colSpan={3}>
                      {editingId === category.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 animate-in fade-in slide-in-from-left-2 duration-300">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Category Name</label>
                            <Input 
                              value={editForm.name} 
                              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                              className="h-10 text-xs font-bold border-2 border-red-500 rounded-xl bg-white shadow-sm"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Image URL</label>
                            <Input 
                              value={editForm.image} 
                              onChange={(e) => setEditForm({...editForm, image: e.target.value})}
                              className="h-10 text-[10px] font-medium border-2 border-gray-200 rounded-xl bg-white focus:border-red-500"
                              placeholder="/images/example.webp"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Description</label>
                            <Input 
                              value={editForm.description} 
                              onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                              className="h-10 text-xs font-bold border-2 border-gray-200 rounded-xl bg-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center p-2 border-2 border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                            <img 
                              src={(category as any).image || '/images/placeholder.webp'} 
                              alt={category.name} 
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 group-hover:text-red-600 transition-colors uppercase tracking-tight">{category.name}</p>
                            <span className="text-[10px] font-bold text-gray-300 font-mono">/{category.slug}</span>
                          </div>
                          <p className="text-gray-500 text-xs font-medium leading-relaxed italic line-clamp-1 ml-auto">{category.description || 'No description'}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-4 text-right">
                      {editingId === category.id ? (
                        <div className="flex justify-end gap-2">
                          <Button 
                            onClick={() => handleUpdateCategory(category.slug)} 
                            disabled={isUpdating}
                            className="h-9 px-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg"
                          >
                            {isUpdating ? 'Saving...' : 'Save'}
                          </Button>
                          <Button 
                            onClick={cancelEditing} 
                            variant="ghost"
                            className="h-9 px-4 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(category)}
                            className="text-gray-400 hover:text-black font-black uppercase tracking-widest text-[9px]"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.slug)}
                            className="text-gray-200 hover:text-red-600 font-black uppercase tracking-widest text-[9px]"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <span className="text-gray-300">📦</span>
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">No categories found.</p>
            <p className="text-gray-300 text-xs">Create your first category to start organizing products.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
