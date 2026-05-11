'use client';

import { useState, useEffect } from 'react';
import { Upload, Trash2, Eye, EyeOff, Plus, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface Poster {
  _id: string;
  imageUrl: string;
  link: string;
  altText: string;
  isActive: boolean;
  createdAt: string;
}

export default function PromoPostersAdmin() {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('/shop');
  const [altText, setAltText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPosters();
  }, []);

  const fetchPosters = async () => {
    try {
      const res = await fetch('/api/admin/promo-posters');
      if (res.ok) {
        const data = await res.json();
        setPosters(data);
      }
    } catch (err) {
      console.error('Failed to fetch posters', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('link', link);
    formData.append('altText', altText);

    try {
      const res = await fetch('/api/admin/promo-posters', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        fetchPosters();
        setIsModalOpen(false);
        setFile(null);
        setLink('/shop');
        setAltText('');
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    console.log(`[Frontend] Toggling status for: ${id}, Current: ${currentStatus}`);
    try {
      const res = await fetch(`/api/admin/promo-posters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      console.log(`[Frontend] Patch Response Status: ${res.status}`);
      if (res.ok) {
        fetchPosters();
      } else {
        const errorData = await res.json();
        console.error('[Frontend] Patch Failed:', errorData);
        alert(`Failed to update: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('[Frontend] Update error:', err);
    }
  };

  const deletePoster = async (id: string) => {
    console.log(`[Frontend] Requesting delete for: ${id}`);
    const fetchUrl = `/api/admin/promo-posters/${id}`;
    alert(`DEBUG: Fetching URL: ${fetchUrl}`);
    if (!confirm('Are you sure you want to delete this poster? It will be permanently removed from storage.')) return;
    try {
      const res = await fetch(fetchUrl, {
        method: 'DELETE',
      });
      console.log(`[Frontend] Delete Response Status: ${res.status}`);
      if (res.ok) {
        fetchPosters();
      } else {
        const errorData = await res.json();
        console.error('[Frontend] Delete Failed:', errorData);
        alert(`Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('[Frontend] Delete error:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">PROMO POSTERS</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Manage homepage welcome carousel banners</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-6 py-6 h-auto flex items-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wider uppercase">Add New Poster</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Loading posters...</p>
        </div>
      ) : posters.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[40px] p-20 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-200" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">NO POSTERS YET</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto mt-1">Upload your first promotional banner to show it on the homepage.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posters.map((poster) => (
            <div 
              key={poster._id} 
              className={`group relative bg-white rounded-[40px] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 ${!poster.isActive ? 'opacity-75' : ''}`}
            >
              <div className="relative aspect-[1080/1350] overflow-hidden">
                <Image
                  src={poster.imageUrl}
                  alt={poster.altText}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {!poster.isActive && (
                  <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-white/10 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20">Inactive</span>
                  </div>
                )}
                
                {/* Action Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8 gap-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStatus(poster._id, poster.isActive)}
                      className="flex-1 bg-white hover:bg-gray-100 text-gray-900 h-12 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 font-bold text-[10px] uppercase tracking-wider"
                    >
                      {poster.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {poster.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deletePoster(poster._id)}
                      className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{poster.altText}</p>
                <p className="text-xs text-gray-600 font-mono truncate">{poster.link}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isUploading && setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 space-y-8 animate-in fade-in zoom-in duration-300">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Upload Poster</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Add a new banner to the homepage</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Image</label>
                <div 
                  className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center transition-all ${file ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  {file ? (
                    <div className="text-center">
                      <p className="text-amber-600 font-bold text-xs truncate max-w-[200px]">{file.name}</p>
                      <p className="text-amber-400 text-[8px] font-black uppercase tracking-tighter mt-1">Click to change</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-tighter">Click to browse</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Redirect Link</label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  placeholder="/shop"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Alt Text</label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  placeholder="e.g. Winter Sale 50% Off"
                  required
                />
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
                  disabled={!file || isUploading}
                  className="flex-[2] bg-gray-900 hover:bg-gray-800 text-white h-14 rounded-2xl font-bold uppercase tracking-wider text-[10px] shadow-xl flex items-center justify-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploading ? 'Uploading...' : 'Upload Now'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
