'use client';

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Phone, Mail, MapPin, Send, Facebook, MessageCircle, Building2, User } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

function ContactContent() {
  const searchParams = useSearchParams()
  const [type, setType] = useState<'regular' | 'corporate'>('regular')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    email: '',
    organizationName: '',
    message: ''
  })

  useEffect(() => {
    const queryType = searchParams.get('type')
    if (queryType === 'corporate') {
      setType('corporate')
      document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })
    } else if (queryType === 'regular') {
      setType('regular')
    }
  }, [searchParams])

  // Validation
  const isFormValid = () => {
    if (type === 'regular') {
      return formData.name.trim() !== '' && formData.number.trim() !== '';
    } else {
      return formData.name.trim() !== '' && formData.number.trim() !== '' && formData.organizationName.trim() !== '';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast.error('Please fill all required fields')
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type })
      });

      if (response.ok) {
        setShowSuccess(true)
        setFormData({ name: '', number: '', email: '', organizationName: '', message: '' })
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch (error) {
      toast.error('Failed to send message. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden bg-slate-900 border-b border-white/10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.2, scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-red-600 rounded-full blur-[120px]" 
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter uppercase italic leading-none mb-6">
              Contact <span className="text-red-600">Us</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Have questions about our products or want to partner with us? We'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Contact Information & Toggle */}
            <div className="space-y-12">
              {/* Type Toggle */}
              <div className="bg-slate-50 p-2 rounded-3xl flex gap-2 border border-slate-100 w-fit">
                <button
                  onClick={() => setType('regular')}
                  className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${type === 'regular' ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'text-gray-400 hover:bg-white'}`}
                >
                  <User className="w-4 h-4" />
                  Regular
                </button>
                <button
                  onClick={() => setType('corporate')}
                  className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${type === 'corporate' ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'text-gray-400 hover:bg-white'}`}
                >
                  <Building2 className="w-4 h-4" />
                  Corporate
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Phone */}
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Call/WhatsApp</p>
                  <a href="tel:+8801958113002" className="text-xl font-black text-gray-900 hover:text-red-600 transition-colors italic">
                    +8801958-113002
                  </a>
                </div>

                {/* Email */}
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email</p>
                  <a href="mailto:cfb@circlenetworkbd.net" className="text-[13px] font-black text-gray-900 hover:text-red-600 transition-colors uppercase italic break-all">
                    cfb@circlenetworkbd.net
                  </a>
                </div>
              </div>

              {/* Address Card */}
              <div className="p-8 bg-slate-900 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8">
                   <MapPin className="w-16 h-16 text-red-600 opacity-20" />
                </div>
                <div className="relative">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-4">Our Office</h3>
                  <p className="text-gray-400 text-lg leading-relaxed mb-8">
                    Circle Enterprise . Unity trade Center, Pollibiddut Bus Stand Nabinagar, Ashulia, Savar, Dhaka-1344
                  </p>
                  <div className="flex items-center gap-4">
                    <Link href="https://www.facebook.com/parlebangladesh/" target="_blank" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                      <Facebook className="w-5 h-5" />
                    </Link>
                    <Link href="https://wa.me/8801958113002" target="_blank" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div id="contact-form" className="scroll-mt-32 bg-white p-8 lg:p-12 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-100">
               <div className="mb-10">
                 <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none italic mb-4">
                   {type === 'regular' ? 'Regular' : 'Corporate'} <span className="text-red-600">Inquiry</span>
                 </h3>
                 <p className="text-gray-500 font-medium">Please fill in your details below.</p>
               </div>
               
               <form onSubmit={handleSubmit} className="space-y-6">
                 <AnimatePresence mode="wait">
                    <motion.div 
                      key={type}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Name *</label>
                          <input 
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            type="text" 
                            required 
                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-600/20 focus:bg-white transition-all text-sm font-bold" 
                            placeholder="Your Name" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Phone Number *</label>
                          <input 
                            name="number"
                            value={formData.number}
                            onChange={handleChange}
                            type="tel" 
                            required 
                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-600/20 focus:bg-white transition-all text-sm font-bold" 
                            placeholder="+8801xxx-xxxxxx" 
                          />
                        </div>
                      </div>

                      {type === 'corporate' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Organization Name *</label>
                          <input 
                            name="organizationName"
                            value={formData.organizationName}
                            onChange={handleChange}
                            type="text" 
                            required 
                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-600/20 focus:bg-white transition-all text-sm font-bold" 
                            placeholder="Your Company Name" 
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email Address (Optional)</label>
                        <input 
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          type="email" 
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-600/20 focus:bg-white transition-all text-sm font-bold" 
                          placeholder="example@mail.com" 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Your Message (Optional)</label>
                        <textarea 
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={4} 
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-600/20 focus:bg-white transition-all text-sm font-bold resize-none" 
                          placeholder="What would you like to ask?" 
                        />
                      </div>
                    </motion.div>
                 </AnimatePresence>

                 <motion.button 
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   disabled={loading || !isFormValid()}
                   type="submit" 
                   className={`w-full py-5 bg-red-600 hover:bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-3 active:scale-95 ${loading || !isFormValid() ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                   {loading ? (
                     <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   ) : (
                     <>
                       <Send className="w-5 h-5" />
                       Send Request
                     </>
                   )}
                 </motion.button>
               </form>
            </div>

          </div>
        </div>
      </section>

      {/* Google Map Section - Contained */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[500px] w-full bg-slate-100 relative rounded-[3rem] overflow-hidden border-4 border-white shadow-[0_30px_100px_rgba(0,0,0,0.05)] group">
             <iframe 
               src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d911.753636441421!2d90.26315919999999!3d23.924539!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755e85f478c8343%3A0xc72e18f02d1430f7!2z4KaH4KaJ4Kao4Ka_4Kaf4Ka_IOCmn-CnjeCmsOCnh-CmoSDgprjgp4fgpqjgp43gpp_gpr7gprA!5e0!3m2!1sen!2sbd!4v1775541863863!5m2!1sen!2sbd" 
               width="100%" 
               height="100%" 
               style={{ border: 0 }} 
               allowFullScreen={true} 
               loading="lazy" 
               referrerPolicy="no-referrer-when-downgrade"
               className="w-full h-full transition-all duration-1000"
             ></iframe>
             <div className="absolute top-8 right-8 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-200 shadow-2xl">
                   <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest leading-none">Unity Trade Center</p>
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">Ashulia, Savar</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md bg-white rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="flex flex-col items-center justify-center pt-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
               <motion.div
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ type: "spring", damping: 10, stiffness: 100 }}
               >
                 <CheckCircle2 className="w-12 h-12 text-green-600" />
               </motion.div>
            </div>
            <DialogTitle className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none text-center">
              Request <span className="text-red-600">Submitted</span>
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-gray-500 text-center mt-4 px-4 leading-relaxed">
              Thank you for contacting <span className="text-red-600 font-bold">Parle Bangladesh</span>. 
              Our team will get back to you shortly at the number provided.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pb-8 mt-4">
            <Button 
               onClick={() => setShowSuccess(false)}
               className="bg-red-600 hover:bg-black text-white px-10 py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-red-100 transition-all active:scale-95"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ContactContent />
    </Suspense>
  )
}
