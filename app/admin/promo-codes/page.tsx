'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Plus, Trash2, Edit, AlertCircle, Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Discount {
  _id: string;
  code?: string;
  type: 'promo' | 'flat';
  discountType: 'fixed' | 'percentage';
  discountAmount: number;
  maxUsage: number;
  currentUsage: number;
  isActive: boolean;
  status: 'pending' | 'approved' | 'declined';
  allProducts: boolean;
  applicableProducts: string[];
  applicableVariations?: string[];
  minOrderAmount: number;
  maxDiscountAmount: number;
  expiresAt?: string;
  createdBy?: string;
  freeShipping?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VariationInfo {
  _id?: string;
  weight?: string;
  flavor?: string;
  price: number;
}

interface ProductInfo {
  id: string;
  name: string;
  variations?: VariationInfo[];
}

export default function DiscountsAdmin() {
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [code, setCode] = useState('');
  const [type, setType] = useState<'promo' | 'flat'>('promo');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountAmount, setDiscountAmount] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [allProducts, setAllProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [freeShipping, setFreeShipping] = useState(false);
  
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDiscounts();
    fetchProducts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const res = await fetch('/api/promo-codes');
      if (res.ok) {
        const data = await res.json();
        setDiscounts(data);
      }
    } catch (err) {
      console.error('Failed to fetch discounts', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setCode('');
    setType('promo');
    setDiscountType('fixed');
    setDiscountAmount('');
    setMaxUsage('10');
    setExpiresAt('');
    setIsActive(true);
    setMinOrderAmount('0');
    setMaxDiscountAmount('0');
    setAllProducts(true);
    setSelectedProducts(products.map(p => p.id));
    
    // Select all variations by default
    const allVars: string[] = [];
    products.forEach(p => {
      p.variations?.forEach(v => {
        allVars.push(`${p.id}:${v.weight || ''}:${v.flavor || ''}`);
      });
    });
    setSelectedVariations(allVars);
    
    setFreeShipping(false);
    setFormError('');
    setSearchQuery('');
    setIsModalOpen(true);
  };

  const openEditModal = (discount: Discount) => {
    setEditingId(discount._id);
    setCode(discount.code || '');
    setType(discount.type || 'promo');
    setDiscountType(discount.discountType || 'fixed');
    setDiscountAmount(discount.discountAmount.toString());
    setMaxUsage(discount.maxUsage.toString());
    setMinOrderAmount(discount.minOrderAmount?.toString() || '0');
    setMaxDiscountAmount(discount.maxDiscountAmount?.toString() || '0');
    setAllProducts(discount.allProducts || false);
    setFreeShipping(discount.freeShipping || false);
    
    if (discount.allProducts) {
      setSelectedProducts(products.map(p => p.id));
      const allVars: string[] = [];
      products.forEach(p => {
        p.variations?.forEach(v => {
          allVars.push(`${p.id}:${v.weight || ''}:${v.flavor || ''}`);
        });
      });
      setSelectedVariations(allVars);
    } else {
      setSelectedProducts(discount.applicableProducts || []);
      setSelectedVariations(discount.applicableVariations || []);
    }
    
    if (discount.expiresAt) {
      const d = new Date(discount.expiresAt);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
      setExpiresAt(localDate);
    } else {
      setExpiresAt('');
    }
    
    setIsActive(discount.isActive);
    setFormError('');
    setSearchQuery('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const totalVariationsCount = products.reduce((sum, p) => sum + (p.variations?.length || 0), 0);
    const isActuallyAllSelected = products.length > 0 && 
      selectedProducts.length === products.length && 
      selectedVariations.length === totalVariationsCount;

    const payload = {
      code: type === 'promo' ? code : undefined,
      type,
      discountType,
      discountAmount: Number(discountAmount),
      maxUsage: Number(maxUsage),
      isActive,
      allProducts: isActuallyAllSelected,
      applicableProducts: isActuallyAllSelected ? [] : selectedProducts,
      applicableVariations: isActuallyAllSelected ? [] : selectedVariations,
      minOrderAmount: Number(minOrderAmount),
      maxDiscountAmount: Number(maxDiscountAmount),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      freeShipping
    };

    try {
      const url = editingId ? `/api/promo-codes/${editingId}` : '/api/promo-codes';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to save discount');
      } else {
        setIsModalOpen(false);
        fetchDiscounts();
      }
    } catch (err: any) {
      setFormError('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;
    
    try {
      const res = await fetch(`/api/promo-codes/${id}`, { method: 'DELETE' });
      if (res.ok) fetchDiscounts();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const toggleProduct = (productId: string) => {
    const productObj = products.find(p => p.id === productId);
    const productVarKeys = productObj?.variations?.map(v => `${productId}:${v.weight || ''}:${v.flavor || ''}`) || [];
    const isProdSelected = selectedProducts.includes(productId);
    
    if (isProdSelected) {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
      setSelectedVariations(prev => prev.filter(key => !productVarKeys.includes(key)));
    } else {
      setSelectedProducts(prev => [...prev, productId]);
      setSelectedVariations(prev => [...prev, ...productVarKeys]);
    }
  };

  const toggleVariation = (productId: string, vKey: string) => {
    const isVarSelected = selectedVariations.includes(vKey);
    let newVars = [...selectedVariations];
    
    if (isVarSelected) {
      newVars = newVars.filter(key => key !== vKey);
    } else {
      newVars.push(vKey);
    }
    setSelectedVariations(newVars);

    // If at least one variation is selected, the product must be selected
    const productObj = products.find(p => p.id === productId);
    const productVarKeys = productObj?.variations?.map(v => `${productId}:${v.weight || ''}:${v.flavor || ''}`) || [];
    const hasAnyVarSelected = productVarKeys.some(key => newVars.includes(key));
    
    if (hasAnyVarSelected) {
      if (!selectedProducts.includes(productId)) {
        setSelectedProducts(prev => [...prev, productId]);
      }
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map(p => p.id));
      const allVars: string[] = [];
      products.forEach(p => {
        p.variations?.forEach(v => {
          allVars.push(`${p.id}:${v.weight || ''}:${v.flavor || ''}`);
        });
      });
      setSelectedVariations(allVars);
    } else {
      setSelectedProducts([]);
      setSelectedVariations([]);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Discounts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage promo codes and flat discounts across products</p>
        </div>
        <Button onClick={openAddModal} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Discount
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-black tracking-widest text-gray-500">
                <th className="p-4 rounded-tl-2xl">Type / Code</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Min Order</th>
                <th className="p-4">Applicability</th>
                <th className="p-4">Usage</th>
                <th className="p-4">Requested By</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {discounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 text-sm">
                    No discounts active. Click "Add Discount" to create one.
                  </td>
                </tr>
              ) : (
                discounts.map((discount) => (
                  <tr key={discount._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">
                          {discount.type === 'promo' ? 'Promo Code' : 'Flat Discount'}
                        </span>
                        {discount.type === 'promo' && (
                          <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 w-fit">
                            {discount.code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-black">
                      {discount.discountType === 'percentage' ? `${discount.discountAmount}%` : `৳ ${discount.discountAmount}`}
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-500">
                      {discount.minOrderAmount > 0 ? `৳ ${discount.minOrderAmount}` : 'None'}
                    </td>
                    <td className="p-4">
                       <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-gray-700">
                             {discount.allProducts ? 'All Products' : `${discount.applicableProducts?.length || 0} Products`}
                          </span>
                          {!discount.allProducts && discount.applicableVariations && discount.applicableVariations.length > 0 && (
                            <span className="text-[9px] font-black uppercase text-amber-600">
                              {discount.applicableVariations.length} Variations
                            </span>
                          )}
                       </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{discount.currentUsage} / {discount.maxUsage}</span>
                        {discount.currentUsage >= discount.maxUsage && (
                          <span className="text-[10px] text-red-500 font-bold uppercase">Limit Reached</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[150px]" title={discount.createdBy || 'System'}>
                          {discount.createdBy || 'System'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {new Date(discount.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {discount.status === 'pending' ? (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter w-fit">Pending Approval</span>
                        ) : discount.status === 'declined' ? (
                          <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter w-fit">Declined</span>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter w-fit">Approved</span>
                        )}
                        
                        {discount.isActive ? (
                          <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">● Live</span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">○ Inactive</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                       <button onClick={() => openEditModal(discount)} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDelete(discount._id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]`}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
               <h2 className="text-xl font-bold uppercase tracking-tight">{editingId ? 'Edit Discount' : 'New Discount'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-bold">
                   <AlertCircle className="w-4 h-4" /> {formError}
                </div>
              )}
 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Discount Type</label>
                    <div className="flex gap-2">
                       <button 
                         type="button"
                         onClick={() => setType('promo')}
                         className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${type === 'promo' ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-100' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                       >
                         Promo Code
                       </button>
                       <button 
                         type="button"
                         onClick={() => setType('flat')}
                         className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${type === 'flat' ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-100' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                       >
                         Flat Discount
                       </button>
                    </div>
                  </div>
 
                  {type === 'promo' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Promo Code *</label>
                      <input
                        type="text"
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono font-bold uppercase"
                        placeholder="e.g. FLASH50"
                        disabled={!!editingId}
                      />
                    </div>
                  )}
 
                  <div className={`grid ${discountType === 'percentage' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 text-[9px]">Type</label>
                      <select 
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold text-xs"
                      >
                        <option value="fixed">৳</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 text-[9px]">Value *</label>
                      <input
                        type="number"
                        required
                        step="any"
                        min="0.01"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold text-xs"
                        placeholder={discountType === 'percentage' ? '10' : '50'}
                      />
                    </div>
                    {discountType === 'percentage' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 text-[9px]">Max Cap</label>
                        <input
                          type="number"
                          min="0"
                          value={maxDiscountAmount}
                          onChange={(e) => setMaxDiscountAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold text-xs"
                          placeholder="e.g. 100"
                        />
                      </div>
                    )}
                  </div>
 
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Max Usage Total</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={maxUsage}
                        onChange={(e) => setMaxUsage(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold"
                        placeholder="e.g. 1000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Min Order Amount</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={minOrderAmount}
                        onChange={(e) => setMinOrderAmount(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold"
                        placeholder="e.g. 500"
                      />
                    </div>
                  </div>
 
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                       <Calendar className="w-3 h-3" /> Expiration Date
                    </label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      min={getTodayDateString()}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm text-gray-700"
                    />
                  </div>
 
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
                    <input
                      type="checkbox"
                      id="freeShipping"
                      checked={freeShipping}
                      onChange={(e) => setFreeShipping(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="freeShipping" className="text-xs font-black uppercase tracking-widest text-gray-700 cursor-pointer">
                      Grant Free Shipping
                    </label>
                  </div>
 
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="isActive" className="text-sm font-bold text-gray-700 cursor-pointer">
                      Discount is actively running
                    </label>
                  </div>
                  <p className="text-[10px] text-amber-600 font-bold italic">
                    * Note: New discounts require Level 2 approval before going live.
                  </p>
                </div>
 
                  <div className="space-y-4 border-l border-gray-100 pl-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Apply To Products</label>
                      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-gray-100 mb-3">
                        <input
                          type="checkbox"
                          id="allProducts"
                          checked={products.length > 0 && selectedProducts.length === products.length}
                          onChange={(e) => handleSelectAllProducts(e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <label htmlFor="allProducts" className="text-xs font-black uppercase tracking-widest text-gray-700 cursor-pointer">
                          Select All Products
                        </label>
                      </div>
  
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Specific Products</p>
                        </div>
                        <div className="p-2 border-b border-gray-100 bg-white flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs outline-none bg-transparent placeholder-gray-400 text-gray-700"
                          />
                        </div>
                        <div className="max-h-[250px] overflow-y-auto divide-y divide-gray-100">
                          {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">No products found</div>
                          ) : (
                            products
                              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map(product => {
                                const isProdSelected = selectedProducts.includes(product.id);
                                return (
                                  <div key={product.id} className="flex flex-col border-b border-gray-100">
                                    <div 
                                      onClick={() => toggleProduct(product.id)}
                                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isProdSelected ? 'bg-amber-50/30' : ''}`}
                                    >
                                      <span className="text-xs font-bold text-gray-750">{product.name}</span>
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isProdSelected ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-gray-300'}`}>
                                        {isProdSelected && <Plus className="w-3 h-3 rotate-45" />}
                                      </div>
                                    </div>
                                    
                                    {isProdSelected && product.variations && product.variations.length > 1 && (
                                      <div className="bg-slate-50/50 pl-8 pr-3 py-2 space-y-2 border-t border-gray-50">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-455">Fine-tune Flavors / Variations</p>
                                        {product.variations.map((v, vIdx) => {
                                          const vKey = `${product.id}:${v.weight || ''}:${v.flavor || ''}`;
                                          const isVarSelected = selectedVariations.includes(vKey);
                                          const labelName = [v.weight, v.flavor].filter(Boolean).join(" - ") || `Option ${vIdx + 1}`;
                                          return (
                                            <div 
                                              key={vIdx}
                                              onClick={(e) => { e.stopPropagation(); toggleVariation(product.id, vKey); }}
                                              className="flex items-center justify-between cursor-pointer hover:opacity-85 py-1"
                                            >
                                              <span className="text-[11px] font-medium text-gray-600">{labelName} (৳{v.price})</span>
                                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isVarSelected ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-gray-300'}`}>
                                                {isVarSelected && <Plus className="w-2.5 h-2.5 rotate-45" />}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 sticky bottom-0 bg-white">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-gray-500 font-bold hover:bg-gray-100">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-black text-white font-bold px-6 min-w-[120px]">
                  {isSubmitting ? 'Saving...' : 'Save Discount'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
