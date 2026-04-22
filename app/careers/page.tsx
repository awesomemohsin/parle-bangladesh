'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Upload, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  X,
  FileText,
  DollarSign,
  Mail
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Mock Circulars for UI demonstration
const MOCK_CIRCULARS = [
  {
    id: "1",
    title: "Territory Sales Officer",
    location: "Dhaka, Bangladesh",
    type: "Full-time",
    deadline: "2026-05-15",
    description: "We are looking for a dynamic Territory Sales Officer to manage and expand our distribution network in Dhaka region.",
    requirements: [
      "Minimum 2-3 years of experience in FMCG sales",
      "Excellent communication and negotiation skills",
      "Ability to meet sales targets",
      "Familiarity with local retail markets"
    ],
    salaryRange: "Attractive Salary"
  },
  {
    id: "3",
    title: "Brand Executive",
    location: "Nabinagar, Ashulia",
    type: "Full-time",
    deadline: "2026-05-10",
    description: "Manage brand visibility, execute marketing campaigns, and monitor consumer trends for Parle products in Bangladesh.",
    requirements: [
      "Masters in Marketing or relevant field",
      "Creative mindset with strong execution capability",
      "Knowledge of digital marketing is a plus"
    ],
    salaryRange: "Negotiable"
  }
];

export default function CareersPage() {
  const [circulars, setCirculars] = useState<typeof MOCK_CIRCULARS>([]);
  const [selectedJob, setSelectedJob] = useState<typeof MOCK_CIRCULARS[0] | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    experience: "",
    message: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("parle_applied_jobs");
    if (saved) setAppliedJobs(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const fetchCirculars = async () => {
      try {
        const res = await fetch("/api/careers/circulars");
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setCirculars(data);
          } else {
            setCirculars(MOCK_CIRCULARS);
          }
        } else {
          setCirculars(MOCK_CIRCULARS);
        }
      } catch (err) {
        setCirculars(MOCK_CIRCULARS);
      }
    };
    fetchCirculars();
  }, []);

  const handleApplyClick = (job: typeof MOCK_CIRCULARS[0]) => {
    setSelectedJob(job);
    setIsFormOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload your resume/CV");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const data = new FormData();
      data.append("fullname", formData.fullname);
      data.append("email", formData.email);
      data.append("phone", formData.phone);
      data.append("experience", formData.experience);
      data.append("message", formData.message);
      data.append("position", selectedJob?.title || "General Application");
      data.append("resume", file);

      const response = await fetch("/api/careers/apply", {
        method: "POST",
        body: data,
      });

      if (response.ok) {
        toast.success("Application submitted successfully!");
        
        // Track locally
        if (selectedJob) {
          const newApplied = [...appliedJobs, selectedJob.title];
          setAppliedJobs(newApplied);
          localStorage.setItem("parle_applied_jobs", JSON.stringify(newApplied));
        }

        setIsFormOpen(false);
        setFormData({ fullname: "", email: "", phone: "", experience: "", message: "" });
        setFile(null);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit application");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter"
            >
              Build Your Career with <span className="text-red-600">Parle Bangladesh</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-gray-500 max-w-2xl mx-auto text-lg font-medium"
            >
              Join the team behind the world's most loved biscuits and snacks. We're looking for passionate individuals to help us grow.
            </motion.p>
          </div>

          {/* Job Listings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {circulars.map((job, index) => (
              <motion.div
                key={job.id || (job as any)._id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-red-50 rounded-2xl group-hover:bg-red-600 transition-colors">
                      <Briefcase className="w-6 h-6 text-red-600 group-hover:text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 px-3 py-1 rounded-full">
                      {job.type}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 mb-2 truncate group-hover:text-red-600 transition-colors">
                    {job.title}
                  </h3>
                  
                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-bold uppercase tracking-tight">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-bold uppercase tracking-tight">
                      <Clock className="w-3.5 h-3.5" />
                      Deadline: {new Date(job.deadline).toLocaleDateString()}
                    </div>
                    {job.salaryRange && (
                      <div className="flex items-center gap-2 text-emerald-600 text-sm font-black uppercase tracking-tight">
                        <DollarSign className="w-3.5 h-3.5" />
                        {job.salaryRange}
                      </div>
                    )}
                  </div>

                  <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-3">
                    {job.description}
                  </p>
                </div>

                <Button 
                  onClick={() => handleApplyClick(job)}
                  disabled={appliedJobs.includes(job.title)}
                  className={`w-full rounded-2xl py-6 font-black uppercase tracking-widest text-[11px] group active:scale-95 transition-all ${
                    appliedJobs.includes(job.title) 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-black hover:bg-red-600 text-white"
                  }`}
                >
                  {appliedJobs.includes(job.title) ? (
                    <>
                      Applied <CheckCircle2 className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Apply Now
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* General Application CTA */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-16 bg-gradient-to-br from-gray-900 to-black rounded-[3rem] p-8 md:p-12 text-center text-white"
          >
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic mb-4">
              Don't see a perfect fit?
            </h2>
            <p className="text-gray-400 font-medium mb-8 max-w-xl mx-auto">
              Submit a general application and we'll keep your profile in our database for future opportunities.
            </p>
            <Button 
              onClick={() => handleApplyClick({ 
                id: "general", 
                title: "General Application", 
                location: "Bangladesh", 
                type: "Full-time", 
                deadline: "", 
                description: "", 
                requirements: [], 
                salaryRange: "" 
              })}
              variant="outline" 
              className="bg-white text-black hover:bg-red-600 hover:text-white border-none rounded-2xl px-10 py-6 font-black uppercase tracking-widest text-[11px]"
            >
              Submit CV/Resume
            </Button>
            
            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">Or reach out via</p>
              <a 
                href="mailto:cfb@circlenetworkbd.net" 
                className="inline-flex items-center gap-2 text-white hover:text-red-600 transition-colors group"
              >
                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-red-600 transition-all">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold tracking-tight">cfb@circlenetworkbd.net</span>
              </a>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Application Modal */}
      <AnimatePresence>
        {isFormOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 md:p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Application Form</span>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                      Apply for {selectedJob.title}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setIsFormOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Full Name</Label>
                      <Input 
                        name="fullname"
                        required
                        placeholder="John Doe"
                        value={formData.fullname}
                        onChange={handleInputChange}
                        className="rounded-xl border-slate-200 focus:ring-red-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Email Address</Label>
                      <Input 
                        name="email"
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="rounded-xl border-slate-200 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Phone Number</Label>
                      <Input 
                        name="phone"
                        required
                        placeholder="+880123456789"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="rounded-xl border-slate-200 focus:ring-red-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Experience (Years)</Label>
                      <Input 
                        name="experience"
                        placeholder="e.g. 2+ years"
                        value={formData.experience}
                        onChange={handleInputChange}
                        className="rounded-xl border-slate-200 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Why should we hire you?</Label>
                    <Textarea 
                      name="message"
                      rows={3}
                      placeholder="Briefly describe your fit for this role..."
                      value={formData.message}
                      onChange={handleInputChange}
                      className="rounded-xl border-slate-200 focus:ring-red-600 resize-none"
                    />
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Resume / CV (PDF or Word)</Label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        id="resume-upload"
                      />
                      <label 
                        htmlFor="resume-upload"
                        className="flex items-center justify-center gap-3 w-full border-2 border-dashed border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-red-600 hover:bg-red-50/30 transition-all"
                      >
                        {file ? (
                          <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-emerald-600" />
                            <span className="text-sm font-bold text-gray-900">{file.name}</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-bold text-gray-400">Click to upload CV</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 hover:bg-black text-white rounded-2xl py-7 font-black uppercase tracking-[0.2em] text-[11px] group mt-4 active:scale-95"
                  >
                    {isSubmitting ? "Submitting..." : (
                      <>
                        Submit Application
                        <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
