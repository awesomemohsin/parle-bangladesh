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
  const isLoginRoute = pathname === "/auth/login";
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
        router.push("/auth/login");
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
          router.push("/auth/login");
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
        router.push("/auth/login");
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

  if (pathname.includes('/invoice')) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 flex bg-gray-50 overflow-hidden z-[100] print:hidden">
      <AdminSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Admin Header - Visible on all screens */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 shrink-0 z-40 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-900 border-2 border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition-all shadow-sm"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="hidden lg:flex flex-col">
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">Management Console</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">System Administration Hub</p>
            </div>

            <div className="lg:hidden flex flex-col">
              <h3 className="text-[16px] font-black text-red-600 uppercase tracking-tighter italic leading-none">Parle Admin</h3>
              <p className="text-[8px] font-bold text-gray-900 uppercase tracking-widest mt-0.5">Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="hidden md:flex flex-col items-end border-l border-gray-100 pl-4">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">System Status</span>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-gray-900 uppercase tracking-tighter">Encrypted Link Active</span>
               </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#F9FAFB] relative px-4 md:px-8 pt-8 print:p-0 print:bg-white">
          <div className="pb-12 max-w-[1600px] mx-auto w-full min-h-full print:pb-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
