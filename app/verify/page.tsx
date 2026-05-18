"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ShieldCheck, AlertTriangle, XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isTestParam = searchParams.get("test") === "true";
      const hasLocalFlag = localStorage.getItem("verify_test_authorized") === "true";

      if (isTestParam) {
        localStorage.setItem("verify_test_authorized", "true");
        setHasAccess(true);
        // Clean URL query from '?test=true' immediately
        const urlCode = searchParams.get("code");
        if (urlCode) {
          router.replace(`/verify?code=${urlCode}`);
        } else {
          router.replace("/verify");
        }
      } else if (hasLocalFlag) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (hasAccess === true) {
      const urlCode = searchParams.get("code");
      if (urlCode) {
        setCode(urlCode.toUpperCase());
        triggerVerification(urlCode);
      }
    }
  }, [searchParams, hasAccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    triggerVerification(code);
  };

  const triggerVerification = async (verifyCode: string) => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await res.json();
      setResult({
        ok: res.ok,
        status: data.status,
        message: data.message,
        error: data.error,
        productName: data.productName,
        verifiedAt: data.verifiedAt,
      });
    } catch (err) {
      console.error(err);
      setResult({
        ok: false,
        status: "error",
        error: "Failed to connect to the verification server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setResult(null);
    router.replace("/verify");
  };

  if (hasAccess === null) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 text-center py-16 space-y-6">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto" />
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Verification Portal...</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 text-center py-16 space-y-4">
        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">404</h1>
        <h2 className="text-lg font-bold text-gray-700 uppercase tracking-tight italic">Page Not Found</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button onClick={() => router.push("/")} className="h-10 bg-black text-white hover:bg-red-600 font-black uppercase text-[9px] tracking-widest rounded-xl transition-all shadow-md mt-4">
          Back to homepage
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      {/* State 1: Active Loading */}
      {isLoading && (
        <Card className="p-8 md:p-12 text-center bg-white rounded-[2.5rem] border-none shadow-2xl space-y-6">
          <Loader2 className="w-16 h-16 text-red-600 animate-spin mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tighter italic text-gray-900">Validating Authenticity...</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Querying Cryptographic Database</p>
          </div>
        </Card>
      )}

      {/* State 2: Success Verification (🟢 Authentic Product) */}
      {!isLoading && result?.ok && result?.status === "success" && (
        <Card className="p-8 md:p-12 text-center bg-emerald-500 rounded-[2.5rem] border-none shadow-2xl text-white space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-white text-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-700/20 mx-auto transform scale-110 animate-bounce">
            <ShieldCheck className="w-12 h-12" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Authentic Verified!</h2>
            <p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest">100% Genuine Parle Product</p>
          </div>

          <div className="p-6 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl space-y-3 text-left">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-emerald-200 tracking-widest">Product Details</span>
              <span className="text-lg font-black uppercase tracking-tight italic mt-0.5">{result.productName}</span>
            </div>
            <div className="flex flex-col border-t border-white/10 pt-2.5">
              <span className="text-[8px] font-black uppercase text-emerald-200 tracking-widest">Verification Time</span>
              <span className="text-xs font-bold mt-0.5">
                {new Date(result.verifiedAt).toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-50 leading-relaxed">
            This verification key has been activated. Future scans of this exact code will trigger a warning.
          </p>

          <Button onClick={resetForm} className="w-full h-12 bg-white text-emerald-600 hover:bg-black hover:text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg">
            Verify Another Product
          </Button>
        </Card>
      )}

      {/* State 3: Warning Duplicate Scan (🟡 Already Verified) */}
      {!isLoading && !result?.ok && result?.status === "already_verified" && (
        <Card className="p-8 md:p-12 text-center bg-amber-500 rounded-[2.5rem] border-none shadow-2xl text-white space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-20 h-20 bg-white text-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-700/20 mx-auto transform scale-110 animate-pulse">
            <AlertTriangle className="w-12 h-12" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Security Alert!</h2>
            <p className="text-[10px] font-black uppercase text-amber-100 tracking-widest">Code Already Verified Previously</p>
          </div>

          <div className="p-6 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl space-y-3 text-left">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-amber-200 tracking-widest">Product Reference</span>
              <span className="text-lg font-black uppercase tracking-tight italic mt-0.5">{result.productName}</span>
            </div>
            <div className="flex flex-col border-t border-white/10 pt-2.5">
              <span className="text-[8px] font-black uppercase text-amber-200 tracking-widest">Original Scan Time</span>
              <span className="text-xs font-bold mt-0.5 text-white">
                {new Date(result.verifiedAt).toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div className="bg-black/10 border border-white/10 p-4 rounded-xl text-left text-[10px] font-bold leading-relaxed text-amber-50">
            ⚠️ <span className="font-black uppercase tracking-wide">Warning:</span> Anti-counterfeit codes can only be verified **1 time**. If you just purchased this product and are seeing this alert, this code may have been copied, indicating a potential counterfeit item. Please contact support.
          </div>

          <Button onClick={resetForm} className="w-full h-12 bg-white text-amber-600 hover:bg-black hover:text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg">
            Scan Another Code
          </Button>
        </Card>
      )}

      {/* State 4: Danger Invalid / Error (🔴 Counterfeit Alert) */}
      {!isLoading && result && !result.ok && result.status !== "already_verified" && (
        <Card className="p-8 md:p-12 text-center bg-rose-600 rounded-[2.5rem] border-none shadow-2xl text-white space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-20 h-20 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-2xl shadow-rose-900/20 mx-auto">
            <XCircle className="w-12 h-12" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Validation Failed</h2>
            <p className="text-[10px] font-black uppercase text-rose-100 tracking-widest">Invalid Verification Key</p>
          </div>

          <div className="bg-black/10 border border-white/10 p-5 rounded-2xl text-left text-xs font-bold leading-relaxed text-rose-50 space-y-2">
            <p>🚫 <span className="font-black uppercase tracking-wide">Error Details:</span></p>
            <p className="font-black">{result.error}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => setResult(null)} className="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-1">
              <RefreshCw className="w-4 h-4" />
              <span>Retry Entry</span>
            </Button>
            <Button onClick={resetForm} className="flex-1 h-12 bg-white text-rose-600 hover:bg-black hover:text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg">
              Start Fresh
            </Button>
          </div>
        </Card>
      )}

      {/* State 5: Neutral Input State */}
      {!isLoading && !result && (
        <Card className="p-8 md:p-12 text-center bg-white rounded-[2.5rem] border-gray-100 shadow-2xl shadow-slate-200 space-y-8 relative overflow-hidden animate-in fade-in duration-500">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-50 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-3">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 border border-red-100 mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-gray-900 leading-none">Product Verification</h2>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Enter the unique code printed on your product</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <input
                type="text"
                placeholder="e.g. PRL-A1B2-C3D4"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full h-14 px-4 text-center text-lg font-black uppercase tracking-[0.25em] text-gray-700 border-2 border-slate-100 bg-slate-50/50 rounded-2xl focus:border-red-600 focus:bg-white outline-none transition-all placeholder:tracking-normal placeholder:font-bold placeholder:text-gray-300"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-red-600 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl shadow-red-500/10 hover:shadow-none transition-all"
            >
              Verify Authenticity
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-16 md:py-24 font-sans selection:bg-red-100 selection:text-red-900">
      
      {/* Top Banner Navigation */}
      <div className="absolute top-6 left-6 z-10">
        <a href="/" className="flex items-center gap-1.5 text-gray-400 hover:text-red-600 font-black text-[9px] uppercase tracking-widest transition-all">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to site
        </a>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-4">Loading Verification Console...</p>
        </div>
      }>
        <VerifyContent />
      </Suspense>

      {/* Footer Branding */}
      <div className="text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mt-8">
        🛡️ PARLE BANGLADESH SECURED VERIFICATION GATEWAY
      </div>
    </div>
  );
}
