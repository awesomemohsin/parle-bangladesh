"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/admin-sidebar";
import NotificationCenter from "@/components/admin/notification-center";
import Footer from "@/components/footer";
import { ShieldAlert, Menu } from "lucide-react";

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoginRoute) {
        setIsLoading(false);
        setIsAuthed(false);
        return;
      }

      let token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        router.push("/admin/login");
        setIsLoading(false);
        return;
      }

      try {
        const user = JSON.parse(userStr);
        
        // Decode and verify token properties locally
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        
        if (isExpired) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/admin/login");
          return;
        }

        // Role-based Security Layer
        const isAdmin = user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'super_admin' || user?.role === 'owner';


        if (!isAdmin) {
          alert('ACCESS DENIED: Unauthorized Entrance Identified.');
          router.push("/");
          setIsLoading(false);
          return;
        }

        setIsAuthed(true);
      } catch (e) {
        console.error("Auth check failed:", e);
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
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      <AdminSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      <main className="flex-1 overflow-auto bg-[#F9FAFB] relative px-4 md:px-8 pt-8">
        <div className="pb-12 max-w-[1600px] mx-auto w-full min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
