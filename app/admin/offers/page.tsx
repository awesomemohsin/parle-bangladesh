'use client';

import { useState, useEffect } from 'react';
import { Upload, Trash2, Eye, EyeOff, Plus, Loader2, Image as ImageIcon, CheckCircle2, Edit, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface Offer {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  offerEndsAt: string;
  isActive: boolean;
  buttonText?: string;
  buttonLink?: string;
  createdAt: string;
}

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') 
    .replace(/[^\w\-]+/g, '') 
    .replace(/\-\-+/g, '-') 
    .replace(/^-+/, '') 
    .replace(/-+$/, '');
};

const formatForInput = (dateString: string | Date) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const tzoffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

export default function OffersAdmin() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [offerEndsAt, setOfferEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [buttonText, setButtonText] = useState('Shop Now');
  const [buttonLink, setButtonLink] = useState('/shop');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  // Circle Network Settings State
  const [circleIsActive, setCircleIsActive] = useState(true);
  const [circlePercent, setCirclePercent] = useState(10);
  const [circleUrl, setCircleUrl] = useState('https://circlenetworkbd.net/');
  const [isSavingCircle, setIsSavingCircle] = useState(false);
  const [circleMessage, setCircleMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/circle-settings')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.isActive === 'boolean') {
          setCircleIsActive(Boolean(data.isActive));
          setCirclePercent(Number(data.discountPercent) || 10);
          setCircleUrl(data.partnerUrl || 'https://circlenetworkbd.net/');
        }
      })
      .catch(err => console.error('Failed to fetch circle settings', err));
  }, []);

  const handleToggleCircleIsActive = async (newActiveState: boolean) => {
    setCircleIsActive(newActiveState);
    setIsSavingCircle(true);
    setCircleMessage('');
    try {
      const res = await fetch('/api/admin/circle-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: newActiveState,
          discountPercent: Number(circlePercent),
          partnerUrl: circleUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCircleMessage(`Campaign ${newActiveState ? 'activated' : 'disabled'} & saved!`);
        setTimeout(() => setCircleMessage(''), 4000);
      } else {
        alert(data.error || 'Failed to update setting');
        setCircleIsActive(!newActiveState);
      }
    } catch (err) {
      alert('Error updating setting');
      setCircleIsActive(!newActiveState);
    } finally {
      setIsSavingCircle(false);
    }
  };

  const handleSaveCircleSettings = async () => {
    setIsSavingCircle(true);
    setCircleMessage('');
    try {
      const res = await fetch('/api/admin/circle-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: circleIsActive,
          discountPercent: Number(circlePercent),
          partnerUrl: circleUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCircleMessage('Circle Network campaign settings saved successfully!');
        setTimeout(() => setCircleMessage(''), 4000);
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (err) {
      alert('Error saving settings');
    } finally {
      setIsSavingCircle(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const fetchOffers = async () => {
    try {
      const res = await fetch('/api/admin/offers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setOffers(data);
      }
    } catch (err) {
      console.error('Failed to fetch offers', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setOfferEndsAt('');
    setIsActive(true);
    setButtonText('Shop Now');
    setButtonLink('/shop');
    setEditingOfferId(null);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    if (!editingOfferId) {
      setSlug(slugify(value));
    }
  };

  const handleEditClick = (offer: Offer) => {
    setEditingOfferId(offer._id);
    setTitle(offer.title);
    setSlug(offer.slug);
    setDescription(offer.description);
    setOfferEndsAt(formatForInput(offer.offerEndsAt));
    setIsActive(offer.isActive);
    setButtonText(offer.buttonText || 'Shop Now');
    setButtonLink(offer.buttonLink || '/shop');
    setFilePreviewUrl(offer.image);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    
    if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);

    if (selectedFile) {
      setFilePreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !description || !offerEndsAt) return;
    if (!file && !editingOfferId) return;

    setIsUploading(true);
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    formData.append('title', title);
    formData.append('slug', slug);
    formData.append('description', description);
    formData.append('offerEndsAt', offerEndsAt);
    formData.append('isActive', String(isActive));
    formData.append('buttonText', buttonText);
    formData.append('buttonLink', buttonLink);

    try {
      const url = editingOfferId 
        ? `/api/admin/offers/${editingOfferId}`
        : '/api/admin/offers';
      const method = editingOfferId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (res.ok) {
        fetchOffers();
        setIsModalOpen(false);
        resetState();
      } else {
        const errorData = await res.json();
        alert(`Failed: ${errorData.error || 'Unknown error occurred'}`);
      }
    } catch (err) {
      console.error('Operation failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const formData = new FormData();
      formData.append('isActive', String(!currentStatus));

      const res = await fetch(`/api/admin/offers/${id}`, {
        method: 'PATCH',
        body: formData,
      });
      if (res.ok) {
        fetchOffers();
      } else {
        const errorData = await res.json();
        alert(`Failed to update status: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this offer?')) return;
    try {
      const res = await fetch(`/api/admin/offers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchOffers();
      } else {
        const errorData = await res.json();
        alert(`Failed to delete: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Detailed Offers</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Manage public promotions and details on /offers</p>
        </div>
        <Button 
          onClick={() => { resetState(); setIsModalOpen(true); }}
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-6 py-6 h-auto flex items-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wider uppercase">Create New Offer</span>
        </Button>
      </div>

      {/* Circle Network Campaign Admin Control Card */}
      <div className="bg-gradient-to-br from-[#FDBC1F]/15 via-white to-amber-50/50 border border-[#FDBC1F]/40 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#FDBC1F]/20 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDBC1F]/20 border border-[#FDBC1F]/40 flex items-center justify-center shrink-0">
              <img src="/circle-logo-en.svg" alt="Circle Network" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Circle Network Partner Campaign</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${circleIsActive ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'}`}>
                  {circleIsActive ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Control live campaign visibility, discount rates, and partner link for Circle ISP clients.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-black uppercase tracking-wider text-gray-700">Campaign Status:</label>
            <button
              type="button"
              onClick={() => handleToggleCircleIsActive(!circleIsActive)}
              disabled={isSavingCircle}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${circleIsActive ? 'bg-[#FDBC1F]' : 'bg-gray-300'} disabled:opacity-50`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${circleIsActive ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Discount Percentage (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={circlePercent}
              onChange={(e) => setCirclePercent(Number(e.target.value))}
              className="w-full bg-white border border-gray-200 focus:border-[#FDBC1F] rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Partner Website URL</label>
            <input
              type="url"
              value={circleUrl}
              onChange={(e) => setCircleUrl(e.target.value)}
              className="w-full bg-white border border-gray-200 focus:border-[#FDBC1F] rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {circleMessage ? (
            <span className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {circleMessage}
            </span>
          ) : <span />}

          <Button
            onClick={handleSaveCircleSettings}
            disabled={isSavingCircle}
            className="bg-[#FDBC1F] hover:bg-[#e5a91a] text-gray-950 font-black rounded-2xl px-6 py-3.5 text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
          >
            {isSavingCircle ? (
              <span className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              'Save Campaign Settings'
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Loading Offers...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[40px] p-20 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-200" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">NO OFFERS CREATED</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto mt-1">Create your first offer to showcase premium discounts and active timers.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {offers.map((offer) => {
            const isExpired = new Date(offer.offerEndsAt).getTime() < Date.now();
            return (
              <div 
                key={offer._id} 
                className={`group bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col h-full ${
                  !offer.isActive || isExpired ? 'opacity-70' : ''
                }`}
              >
                <div className="relative aspect-square w-full bg-gray-50 overflow-hidden">
                  <Image
                    src={offer.image}
                    alt={offer.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-75 group-hover:scale-105"
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {!offer.isActive ? (
                      <span className="bg-gray-900/90 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md">Inactive</span>
                    ) : isExpired ? (
                      <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg">Expired</span>
                    ) : (
                      <span className="bg-emerald-600/90 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md">Active</span>
                    )}
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 z-20">
                    <button
                      onClick={() => toggleStatus(offer._id, offer.isActive)}
                      className="w-12 h-12 bg-white text-gray-900 hover:bg-gray-100 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                      title={offer.isActive ? 'Disable' : 'Enable'}
                    >
                      {offer.isActive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleEditClick(offer)}
                      className="w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl flex items-center justify-center transition-all active:scale-95"
                      title="Edit Offer"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteOffer(offer._id)}
                      className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl flex items-center justify-center transition-all active:scale-95"
                      title="Delete Offer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-black text-gray-900 leading-tight line-clamp-3">{offer.title}</h3>
                    <p className="text-xs text-gray-400 font-mono">/{offer.slug}</p>
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{offer.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <Calendar className="w-4 h-4 text-red-500" />
                      Ends:
                    </span>
                    <span className="font-mono text-gray-900">
                      {new Date(offer.offerEndsAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isUploading && setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 space-y-8 animate-in fade-in zoom-in duration-300 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                {editingOfferId ? 'Modify Offer' : 'Create Offer'}
              </h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                {editingOfferId ? 'Edit campaign specifics' : 'Launch a new promotion detail page'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Offer Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="e.g. Eid Mega Sale 2026"
                  required
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Slug (URL Endpoint)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-mono focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="eid-mega-sale-2026"
                  required
                  disabled={isUploading}
                />
                <p className="text-[9px] font-bold text-gray-450 uppercase ml-2">Available at: /offers/{slug || 'endpoint'}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Offer Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all min-h-[120px]"
                  placeholder="Detail the offer, discount percentages, code applications, rules, etc..."
                  required
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiration Date & Time</label>
                <input
                  type="datetime-local"
                  value={offerEndsAt}
                  onChange={(e) => setOfferEndsAt(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  required
                  disabled={isUploading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Button Text</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    placeholder="e.g. Shop Now"
                    required
                    disabled={isUploading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Redirect Link</label>
                  <input
                    type="text"
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    placeholder="e.g. /shop"
                    required
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Banner Image</label>
                <div 
                  className={`relative border-2 border-dashed rounded-3xl overflow-hidden transition-all bg-gray-50 hover:bg-gray-100/50 ${
                    filePreviewUrl ? 'border-red-550' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    disabled={isUploading}
                    required={!editingOfferId}
                  />
                   {filePreviewUrl ? (
                    <div className="p-6 flex flex-col items-center space-y-4">
                      <div className="relative w-full aspect-square max-w-[240px] rounded-2xl overflow-hidden border border-gray-100 shadow-md">
                        <Image
                          src={filePreviewUrl}
                          alt="Banner preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Change Image</p>
                    </div>
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-350 mb-2" />
                      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-tighter">Choose Image File</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-red-600 focus:ring-red-500 border-gray-300 cursor-pointer"
                  disabled={isUploading}
                />
                <label htmlFor="isActive" className="text-xs font-black text-gray-900 uppercase tracking-wider cursor-pointer select-none">
                  Activate Offer Instantly
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isUploading}
                  className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-wider text-[10px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="flex-[2] bg-gray-900 hover:bg-gray-800 text-white h-14 rounded-2xl font-bold uppercase tracking-wider text-[10px] shadow-xl flex items-center justify-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isUploading ? 'Uploading...' : 'Save Offer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
