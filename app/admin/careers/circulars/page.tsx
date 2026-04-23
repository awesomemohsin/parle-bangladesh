'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Plus, Trash2, Edit, AlertCircle, Calendar, Briefcase, MapPin, Clock, DollarSign, ListChecks, Heart, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface JobCircular {
  _id: string;
  title: string;
  description: string;
  requirements: string[];
  benefits: string[];
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  salaryRange?: string;
  deadline: string;
  isActive: boolean;
  createdAt: string;
}

export default function JobCircularsAdmin() {
  const [circulars, setCirculars] = useState<JobCircular[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<"Full-time" | "Part-time" | "Contract" | "Internship">("Full-time");
  const [salaryRange, setSalaryRange] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  
  const [tempReq, setTempReq] = useState('');
  const [tempBenefit, setTempBenefit] = useState('');
  
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCirculars();
  }, []);

  const fetchCirculars = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/careers/circulars', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCirculars(data);
      } else if (res.status === 401) {
        window.location.href = '/admin/login';
      }
    } catch (err) {
      console.error('Failed to fetch circulars', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setLocation('');
    setType('Full-time');
    setSalaryRange('');
    setDeadline('');
    setIsActive(true);
    setRequirements([]);
    setBenefits([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (job: JobCircular) => {
    setEditingId(job._id);
    setTitle(job.title);
    setDescription(job.description);
    setLocation(job.location);
    setType(job.type);
    setSalaryRange(job.salaryRange || '');
    
    // Format deadline for input date
    const d = new Date(job.deadline);
    const localDate = format(d, 'yyyy-MM-dd');
    setDeadline(localDate);
    
    setIsActive(job.isActive);
    setRequirements(job.requirements || []);
    setBenefits(job.benefits || []);
    setFormError('');
    setIsModalOpen(true);
  };

  const addRequirement = () => {
    if (tempReq.trim()) {
      setRequirements([...requirements, tempReq.trim()]);
      setTempReq('');
    }
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const addBenefit = () => {
    if (tempBenefit.trim()) {
      setBenefits([...benefits, tempBenefit.trim()]);
      setTempBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const finalRequirements = tempReq.trim() ? [...requirements, tempReq.trim()] : requirements;
    const finalBenefits = tempBenefit.trim() ? [...benefits, tempBenefit.trim()] : benefits;

    const payload = {
      title,
      description,
      location,
      type,
      salaryRange,
      deadline: new Date(deadline).toISOString(),
      isActive,
      requirements: finalRequirements,
      benefits: finalBenefits
    };

    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `/api/admin/careers/circulars/${editingId}` : '/api/admin/careers/circulars';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || 'Failed to save circular');
        toast.error(data.message || 'Failed to save circular');
      } else {
        setIsModalOpen(false);
        fetchCirculars();
        toast.success(`Job post ${editingId ? 'updated' : 'created'} successfully!`);
      }
    } catch (err: any) {
      setFormError('Network error occurred');
      toast.error('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job post?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/careers/circulars/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCirculars();
        toast.success('Job post deleted');
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Failed to delete', err);
      toast.error('Network error');
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-10 h-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
            Job <span className="text-red-600">Circulars</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium">Manage and publish job openings on your career page.</p>
        </div>
        <Button onClick={openAddModal} className="bg-black hover:bg-red-600 text-white rounded-2xl py-6 px-8 font-black uppercase tracking-widest text-[11px] group active:scale-95 transition-all">
          <Plus className="w-4 h-4 mr-2" /> Create Job Post
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {circulars.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 shadow-sm">
             <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-4" />
             <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No circulars found</p>
          </div>
        ) : (
          circulars.map((job) => (
            <div key={job._id} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${job.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${job.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{job.title}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <MapPin className="w-3 h-3" /> {job.location}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <Clock className="w-3 h-3" /> Deadline: {format(new Date(job.deadline), 'dd MMM yyyy')}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${job.isActive ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 'border-slate-100 text-slate-400 bg-slate-50'}`}>
                            {job.isActive ? 'Active' : 'Draft/Closed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4">{job.description}</p>
                </div>

                <div className="flex items-center gap-2">
                   <button onClick={() => openEditModal(job)} className="p-4 bg-slate-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all active:scale-90">
                      <Edit className="w-5 h-5" />
                   </button>
                   <button onClick={() => handleDelete(job._id)} className="p-4 bg-slate-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all active:scale-90">
                      <Trash2 className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl my-auto overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
               <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Job Management</span>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none mt-1">
                    {editingId ? 'Edit Circular' : 'Create New Circular'}
                  </h2>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-2xl shadow-sm transition-all">
                  <X className="w-5 h-5" />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest">
                   <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-red-600 font-bold placeholder:text-gray-300 text-sm"
                    placeholder="e.g. Territory Sales Officer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-red-600 font-bold placeholder:text-gray-300 text-sm"
                    placeholder="e.g. Dhaka, Bangladesh"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Job Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-red-600 font-bold text-sm"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Salary Range</label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-red-600 font-bold placeholder:text-gray-300 text-sm"
                    placeholder="e.g. Negotiable"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                     Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-red-600 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Description *</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-red-600 font-bold placeholder:text-gray-300 resize-none text-sm"
                  placeholder="Summarize the role and responsibilities..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Requirements */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                     <ListChecks className="w-3 h-3 text-red-600" /> Requirements
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempReq}
                      onChange={(e) => setTempReq(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                      className="flex-1 px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-red-600 text-xs font-bold"
                      placeholder="Add requirement..."
                    />
                    <Button type="button" onClick={addRequirement} className="bg-black hover:bg-red-600 rounded-xl px-3 h-10">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-[80px] overflow-y-auto custom-scrollbar pr-1">
                    {requirements.map((req, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg group/item">
                        <span className="text-[10px] font-bold text-gray-600 truncate">{req}</span>
                        <button type="button" onClick={() => removeRequirement(i)} className="text-gray-300 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                     <Heart className="w-3 h-3 text-red-600" /> Benefits
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempBenefit}
                      onChange={(e) => setTempBenefit(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                      className="flex-1 px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-red-600 text-xs font-bold"
                      placeholder="Add benefit..."
                    />
                    <Button type="button" onClick={addBenefit} className="bg-black hover:bg-red-600 rounded-xl px-3 h-10">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-[80px] overflow-y-auto custom-scrollbar pr-1">
                    {benefits.map((benefit, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg group/item">
                        <span className="text-[10px] font-bold text-gray-600 truncate">{benefit}</span>
                        <button type="button" onClick={() => removeBenefit(i)} className="text-gray-300 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-none bg-slate-100 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-[10px] font-black uppercase tracking-widest text-gray-600 cursor-pointer">
                  Is Job Currently Active/Visible?
                </label>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-gray-400 font-black uppercase tracking-widest text-[9px] h-11 px-6 hover:bg-slate-50 rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-black hover:bg-red-600 text-white font-black uppercase tracking-widest text-[9px] h-11 px-10 rounded-xl active:scale-95 transition-all shadow-lg shadow-red-100">
                  {isSubmitting ? 'Processing...' : (editingId ? 'Update Circular' : 'Publish Job')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
