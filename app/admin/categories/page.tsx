'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Entity {
  id: string
  name: string
  slug: string
  description: string
  category?: string
  image?: string
}

export default function AdminCategorizationPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories')
  const [categories, setCategories] = useState<Entity[]>([])
  const [brands, setBrands] = useState<Entity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Forms
  const [newItem, setNewItem] = useState({ name: '', description: '', image: '', category: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', image: '', category: '' })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  // Set default category for brand when tab changes
  useEffect(() => {
    if (activeTab === 'brands' && categories.length > 0 && !newItem.category) {
      setNewItem(prev => ({ ...prev, category: categories[0].slug }))
    }
  }, [activeTab, categories])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [catRes, brandRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/brands')
      ])
      
      if (catRes.ok) {
        const data = await catRes.json()
        setCategories(data.categories || [])
      }
      if (brandRes.ok) {
        const data = await brandRes.json()
        setBrands(data.brands || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.name) return
    if (activeTab === 'brands' && !newItem.category) {
      alert('Parent category is required for brands')
      return
    }
    
    setIsAdding(true)
    const endpoint = activeTab === 'categories' ? '/api/categories' : '/api/brands'
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newItem),
      })
      if (response.ok) {
        const data = await response.json()
        const addedItem = activeTab === 'categories' ? data.category : data.brand
        if (activeTab === 'categories') setCategories([...categories, addedItem])
        else setBrands([...brands, addedItem])
        
        setNewItem({ name: '', description: '', image: '', category: categories[0]?.slug || '' })
      }
    } catch (error) {
      console.error(`Failed to add ${activeTab}:`, error)
    } finally {
      setIsAdding(false)
    }
  }

  const startEditing = (item: Entity) => {
    setEditingId(item.id)
    setEditForm({ 
      name: item.name, 
      description: item.description, 
      image: item.image || '',
      category: item.category || ''
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ name: '', description: '', image: '', category: '' })
  }

  const handleUpdateItem = async (slug: string) => {
    if (!editForm.name) return
    setIsUpdating(true)
    const endpoint = activeTab === 'categories' ? `/api/categories/${slug}` : `/api/brands/${slug}`
    
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm),
      })
      if (response.ok) {
        const data = await response.json()
        const updatedItem = activeTab === 'categories' ? data.category : data.brand
        
        if (activeTab === 'categories') {
          setCategories(categories.map(c => c.slug === slug ? updatedItem : c))
        } else {
          setBrands(brands.map(b => b.slug === slug ? updatedItem : b))
        }
        setEditingId(null)
      }
    } catch (error) {
      console.error(`Failed to update ${activeTab}:`, error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (slug: string) => {
    if (!confirm(`Are you sure you want to delete this ${activeTab}?`)) return
    const endpoint = activeTab === 'categories' ? `/api/categories/${slug}` : `/api/brands/${slug}`
    
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE'
      })
      if (response.ok) {
        if (activeTab === 'categories') setCategories(categories.filter((c) => c.slug !== slug))
        else setBrands(brands.filter((b) => b.slug !== slug))
      }
    } catch (error) {
      console.error(`Failed to delete ${activeTab}:`, error)
    }
  }

  const renderTable = (items: Entity[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-50">
            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Image</th>
            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
            {activeTab === 'brands' && <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">In Category</th>}
            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item) => (
            <tr key={item.id} className="group hover:bg-slate-50/30 transition-colors">
              <td className="px-8 py-4" colSpan={activeTab === 'brands' ? 4 : 3}>
                {editingId === item.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-4 w-full">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Name</label>
                      <Input 
                        value={editForm.name} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="h-10 text-xs font-bold border-2 border-red-500 rounded-xl bg-white shadow-sm"
                      />
                    </div>
                    {activeTab === 'brands' && (
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Parent Category</label>
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                          className="w-full h-10 px-3 text-[10px] font-black uppercase text-gray-600 border-2 border-gray-200 rounded-xl bg-white focus:border-red-500 outline-none"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.slug}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">Image URL</label>
                      <Input 
                        value={editForm.image} 
                        onChange={(e) => setEditForm({...editForm, image: e.target.value})}
                        className="h-10 text-[10px] font-medium border-2 border-gray-200 rounded-xl bg-white focus:border-red-500"
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
                        src={item.image || '/images/placeholder.webp'} 
                        alt={item.name} 
                        className="w-full h-full object-contain"
                        onError={(e) => (e.currentTarget.src = '/images/placeholder.webp')}
                      />
                    </div>
                    <div className="w-48">
                      <p className="text-sm font-black text-gray-900 group-hover:text-red-600 transition-colors uppercase tracking-tight">{item.name}</p>
                      <span className="text-[10px] font-bold text-gray-300 font-mono">/{item.slug}</span>
                    </div>
                    {activeTab === 'brands' && (
                       <div className="w-32">
                          <span className="bg-red-50 text-red-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-widest">In {item.category}</span>
                       </div>
                    )}
                    <p className="text-gray-500 text-xs font-medium leading-relaxed italic line-clamp-1 flex-1">{item.description || 'No description'}</p>
                  </div>
                )}
              </td>
              <td className="px-8 py-4 text-right">
                {editingId === item.id ? (
                  <div className="flex justify-end gap-2">
                    <Button 
                      onClick={() => handleUpdateItem(item.slug)} 
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
                      onClick={() => startEditing(item)}
                      className="text-gray-400 hover:text-black font-black uppercase tracking-widest text-[9px]"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.slug)}
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
  )

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">Loading categorization data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight leading-none mb-2">Categorization</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Manage your Product Hierarchy & Brand Identity</p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} value={activeTab} className="w-full" onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList className="bg-gray-50/50 p-1 rounded-xl h-auto border border-gray-100/50 mb-10">
          <TabsTrigger value="categories" className="px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-600">Categories</TabsTrigger>
          <TabsTrigger value="brands" className="px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-600">Brand Names</TabsTrigger>
        </TabsList>

        <Card className="p-8 border-2 border-gray-50 shadow-sm rounded-2xl overflow-hidden relative group mb-10">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
          <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            Add New {activeTab === 'categories' ? 'Category' : 'Brand Name'}
            <span className="w-8 h-[2px] bg-red-600 rounded-full"></span>
          </h2>
          <form onSubmit={handleAddItem} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Name</label>
                <Input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder={`e.g. ${activeTab === 'categories' ? 'Biscuits' : 'Parle-G'}`}
                  className="h-11 text-xs font-bold border-2 border-gray-50 rounded-xl focus:border-red-600 bg-gray-50/30"
                  required
                />
              </div>
              
              {activeTab === 'brands' && (
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Attach to Category</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      className="w-full h-11 px-4 text-[11px] font-black uppercase text-gray-600 border-2 border-gray-50 rounded-xl bg-gray-50/30 focus:border-red-600 focus:bg-white transition-all outline-none"
                      required
                    >
                      <option value="">Choose Parent Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.slug}>{c.name.toUpperCase()}</option>
                      ))}
                    </select>
                 </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Thumbnail Path</label>
                <Input
                  type="text"
                  value={newItem.image}
                  onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  placeholder="/images/example.webp"
                  className="h-11 text-xs font-bold border-2 border-gray-50 rounded-xl focus:border-red-600 bg-gray-50/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Brief Description</label>
                <Input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Key features..."
                  className="h-11 text-xs font-bold border-2 border-gray-50 rounded-xl focus:border-red-600 bg-gray-50/30"
                />
              </div>
            </div>
            <Button type="submit" disabled={isAdding} className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] bg-red-600 hover:bg-black transition-all shadow-lg shadow-red-100">
              {isAdding ? 'Processing...' : `Create ${activeTab === 'categories' ? 'Category' : 'Brand'}`}
            </Button>
          </form>
        </Card>

        <TabsContent value="categories">
          <Card className="border-2 border-gray-50 shadow-sm rounded-2xl overflow-hidden">
            {categories.length > 0 ? renderTable(categories) : (
                <div className="p-20 text-center text-gray-400 uppercase font-black text-[10px]">No categories found.</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="brands">
          <Card className="border-2 border-gray-50 shadow-sm rounded-2xl overflow-hidden">
            {brands.length > 0 ? renderTable(brands) : (
                <div className="p-20 text-center text-gray-400 uppercase font-black text-[10px]">No brands found.</div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
