"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to submit request");
        return;
      }

      setMessage(data.message);
    } catch (err) {
      setError("Connection interrupted. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-12 relative overflow-hidden">
      {/* Abstract Background Design */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#ff000010_0%,transparent_50%)]"></div>
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#ff00000a_0%,transparent_50%)]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
           <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
             Parle <span className="text-red-600">Secure</span>
           </h2>
           <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em] mt-3">Authentication Protocol</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <ShieldCheck className="w-24 h-24 text-white" />
          </div>

          <div className="relative">
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Password Recovery</h1>
            <p className="text-sm font-medium text-gray-400 leading-relaxed mb-8">Enter your registered email identity to initiate a secure recovery sequence.</p>

            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6 p-4 rounded-2xl bg-red-600 text-white text-[11px] font-black uppercase tracking-widest border-none">
                ERR: {error}
              </motion.div>
            )}
            
            {message && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest border-none text-center">
                Protocol Initiated. Check your inbox or spam folder.
              </motion.div>
            )}

            {!message ? (
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Identity (Email)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="YOU@EXAMPLE.COM"
                      className="bg-white/5 border-2 border-transparent focus:border-red-600 text-white rounded-2xl h-14 pl-12 text-[11px] font-bold uppercase transition-all tracking-widest outline-none shadow-none focus-visible:ring-0"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-14 bg-red-600 hover:bg-white hover:text-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-red-900/20 active:scale-95 border-none"
                >
                  {isLoading ? "Synchronizing..." : "Initiate Recovery"}
                </Button>
              </form>
            ) : (
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                   <p className="text-xs text-gray-300 font-medium mb-4">A secure link has been dispatched to your mailbox. Please check your Inbox or Spam folder. Follow the link within 60 minutes to finalize the reset.</p>
                   <Button 
                      onClick={() => setMessage("")}
                      variant="ghost" 
                      className="text-red-500 hover:text-white hover:bg-red-600 font-black uppercase text-[10px] tracking-widest"
                    >
                      Resend Link
                   </Button>
                </div>
            )}

            <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center">
              <Link href="/auth/login" className="inline-flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-red-600 uppercase tracking-widest transition-colors group">
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                Return to Login
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
