"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lock, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If no token, return early
  if (!token) {
    return (
      <Card className="bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 text-center">
        <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6">
           <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">Invalid Token</h2>
        <p className="text-sm font-medium text-gray-400 leading-relaxed mb-8">
          The security token is missing or malformed. Access denied.
        </p>
        <Link href="/auth/forgot-password">
           <Button className="w-full h-12 bg-white text-black hover:bg-red-600 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all">
              Request New Protocol
           </Button>
        </Link>
      </Card>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Min length: 6 characters required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to finalize update");
        return;
      }

      setMessage(data.message);
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (err) {
      setError("Connection lost. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5">
         <Lock className="w-24 h-24 text-white" />
      </div>

      <div className="relative">
        <h1 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Verify Update</h1>
        <p className="text-sm font-medium text-gray-400 leading-relaxed mb-8">Establish a new encrypted credential for your identity.</p>

        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6 p-4 rounded-2xl bg-red-600 text-white text-[11px] font-black uppercase tracking-widest border-none">
            ERR: {error}
          </motion.div>
        )}
        
        {message && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-6 rounded-2xl bg-emerald-600 text-white text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3" />
            <p className="text-[11px] font-black uppercase tracking-widest">Update Finalized</p>
            <p className="text-[10px] font-medium opacity-80 mt-1">Redirecting to login portal...</p>
          </motion.div>
        )}

        {!message && (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">New Credential</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/5 border-2 border-transparent focus:border-red-600 text-white rounded-2xl h-14 pl-12 text-[11px] font-bold transition-all tracking-widest outline-none shadow-none focus-visible:ring-0"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Credential</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/5 border-2 border-transparent focus:border-red-600 text-white rounded-2xl h-14 pl-12 text-[11px] font-bold transition-all tracking-widest outline-none shadow-none focus-visible:ring-0"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-14 bg-red-600 hover:bg-white hover:text-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-red-900/20"
            >
              {isLoading ? "Encrypting..." : "Commit Update"}
            </Button>
          </form>
        )}

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <Link href="/auth/login" className="text-[10px] font-black text-gray-500 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 group">
              Back to Login
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
      </div>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#ff000010_0%,transparent_50%)]"></div>
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#ff00000a_0%,transparent_50%)]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
           <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
             Parle <span className="text-red-600">Secure</span>
           </h2>
           <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em] mt-3">Finalizing Protocol</p>
        </div>

        <Suspense fallback={<div className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-gray-500 animate-pulse bg-white/5 rounded-[2.5rem]">Initializing Handshake...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
