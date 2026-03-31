"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { ShieldAlert } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/admin/login";
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (isLoginRoute) {
        setIsLoading(false);
        setIsAuthed(false);
        return;
      }

      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        router.push("/admin/login");
        setIsLoading(false);
        return;
      }

      try {
        const user = JSON.parse(userStr);
        // Only allow admins or moderators
        const isAdmin = user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'super_admin';
        
        if (!isAdmin) {
          alert('ACCESS DENIED: Unauthorized Entrance Identified. Establishing Terminal Redirection...');
          router.push("/");
          setIsLoading(false);
          return;
        }

        setIsAuthed(true);
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isLoginRoute, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">
          Initializing Admin Systems...
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-6 px-4 text-center">
         <ShieldAlert className="w-20 h-20 text-red-600 animate-bounce" />
         <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">SECURITY ALERT</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identifying authorization clearance...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-[#F9FAFB]">
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full">
           {children}
        </div>
      </main>
    </div>
  );
}
