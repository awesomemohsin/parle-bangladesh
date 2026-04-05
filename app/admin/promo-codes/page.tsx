'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Plus, Trash2, Edit, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromoCode {
  _id: string;
  code: string;
  discountAmount: number;
  maxUsage: number;
  currentUsage: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export default function PromoCodesAdmin() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [code, setCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const res = await fetch('/api/promo-codes');
      if (res.ok) {
        const data = await res.json();
        setPromoCodes(data);
      }
    } catch (err) {
      console.error('Failed to fetch promo codes', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setCode('');
    setDiscountAmount('');
    setMaxUsage('');
    setExpiresAt('');
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (promo: PromoCode) => {
    setEditingId(promo._id);
    setCode(promo.code);
    setDiscountAmount(promo.discountAmount.toString());
    setMaxUsage(promo.maxUsage.toString());
    
    if (promo.expiresAt) {
      // Format to YYYY-MM-DD for input type="date"
      const d = new Date(promo.expiresAt);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
      setExpiresAt(localDate);
    } else {
      setExpiresAt('');
    }
    
    setIsActive(promo.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const payload = {
      code,
      discountAmount: Number(discountAmount),
      maxUsage: Number(maxUsage),
      isActive,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
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
        setFormError(data.error || 'Failed to save promo code');
      } else {
        setIsModalOpen(false);
        fetchPromoCodes();
      }
    } catch (err: any) {
      setFormError('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    
    try {
      const res = await fetch(`/api/promo-codes/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPromoCodes();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Promo Codes</h1>
          <p className="text-sm text-gray-500 mt-1">Manage global discount codes and usage limits</p>
        </div>
        <Button onClick={openAddModal} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Promo Code
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-black tracking-widest text-gray-500">
                <th className="p-4 rounded-tl-2xl">Code</th>
                <th className="p-4">Discount (৳)</th>
                <th className="p-4">Usage Limits</th>
                <th className="p-4">Expires</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 text-sm">
                    No promo codes active. Click "Add Promo Code" to create one.
                  </td>
                </tr>
              ) : (
                promoCodes.map((promo) => (
                  <tr key={promo._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                        {promo.code}
                      </span>
                    </td>
                    <td className="p-4 font-black">৳ {promo.discountAmount}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{promo.currentUsage} / {promo.maxUsage}</span>
                        {promo.currentUsage >= promo.maxUsage && (
                          <span className="text-[10px] text-red-500 font-bold uppercase">Limit Reached</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-4">
                      {promo.isActive ? (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full uppercase">Active</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full uppercase">Disabled</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                       <button onClick={() => openEditModal(promo)} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDelete(promo._id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
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
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
               <h2 className="text-xl font-bold uppercase tracking-tight">{editingId ? 'Edit Promo Code' : 'New Promo Code'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-bold">
                   <AlertCircle className="w-4 h-4" /> {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono font-bold uppercase"
                  placeholder="e.g. FLASH50"
                  disabled={!!editingId} // Usually good practice to not change code string once published, but editable if needed.
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Discount (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold"
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Max Usage *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={maxUsage}
                    onChange={(e) => setMaxUsage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold"
                    placeholder="e.g. 100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                   <Calendar className="w-3 h-3" /> Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm text-gray-700"
                />
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
                  Promo is actively running
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-gray-500 font-bold hover:bg-gray-100">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-black text-white font-bold px-6">
                  {isSubmitting ? 'Saving...' : 'Save Promo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
