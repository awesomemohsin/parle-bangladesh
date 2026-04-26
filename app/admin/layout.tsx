"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/admin-sidebar";
import NotificationCenter from "@/components/admin/notification-center";
import Footer from "@/components/footer";
import { ShieldAlert, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/admin/login";
  const { isAuthenticated, isLoading, user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !isLoginRoute && !isAuthenticated) {
      router.push("/admin/login");
    }
    
    if (!isLoading && isAuthenticated && user) {
      const isAdmin = user.role === 'admin' || user.role === 'moderator' || user.role === 'super_admin' || user.role === 'owner';
      if (!isAdmin) {
        router.push("/");
      }
    }
  }, [isLoading, isAuthenticated, isLoginRoute, router, user]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">
          Initializing Admin Systems...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-6 px-4 text-center">
        <ShieldAlert className="w-20 h-20 text-gray-900 animate-bounce" />
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">SECURITY CHECK</h1>
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
