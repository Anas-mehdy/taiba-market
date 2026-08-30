'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FolderKanban, ShoppingBag, Settings, LogOut, 
  Store, Menu, X, User, TrendingUp, Users, Boxes, Sparkles, Image as ImageIcon
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('المشرف');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Authenticated user session guard
  useEffect(() => {
    if (pathname === '/admin/login') {
      setCheckingAuth(false);
      return;
    }

    async function checkSession() {
      try {
        const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
        
        if (!isUrlConfigured) {
          // Bypassed session check in Demo mode
          setAdminEmail('admin@tayba.com');
          setCheckingAuth(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          document.cookie = "admin_session=; path=/; max-age=0; SameSite=Strict";
          router.push('/admin/login');
        } else {
          setAdminEmail(session.user.email || 'المشرف');
          setCheckingAuth(false);
        }
      } catch (err) {
        console.error(err);
      }
    }
    checkSession();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      if (isUrlConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      document.cookie = "admin_session=; path=/; max-age=0; SameSite=Strict";
      router.push('/admin/login');
    }
  };

  const navLinks = [
    { href: '/admin', label: 'لوحة التحكم والطلبات', icon: LayoutDashboard },
    { href: '/admin/banners', label: 'عروض وبانرات المتجر', icon: Sparkles },
    { href: '/admin/products', label: 'إدارة المنتجات', icon: ShoppingBag },
    { href: '/admin/categories', label: 'إدارة الأقسام', icon: FolderKanban },
    { href: '/admin/inventory', label: 'إدارة المخزون', icon: Boxes },
    { href: '/admin/statistics', label: 'الإحصائيات والأرشيف', icon: TrendingUp },
    { href: '/admin/customers', label: 'دليل الزبائن', icon: Users },
    { href: '/admin/settings', label: 'إعدادات المتجر والواتساب', icon: Settings },
  ];

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 font-sans text-emerald-600">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex min-h-screen bg-slate-50 text-slate-800 font-sans text-right">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside 
        className={`fixed top-0 bottom-0 right-0 w-64 bg-white border-l border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col print:hidden ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-xs shrink-0 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="ماركت طيبة" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-none">ماركت طيبة</h2>
              <span className="text-[10px] text-emerald-600 font-bold">لوحة الإدارة والمبيعات</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-slate-800 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#075E54] text-white shadow-md shadow-[#075E54]/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <User className="w-4 h-4 text-slate-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{adminEmail}</p>
              <p className="text-[9px] text-slate-400">حساب المشرف</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main content layout wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-14 sm:h-16 flex items-center justify-between px-3.5 sm:px-6 shrink-0 lg:justify-end print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              target="_blank"
              className="text-[11px] sm:text-xs font-bold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-[#075E54] border border-emerald-600/20 px-2.5 sm:px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">معاينة صفحة العروض</span>
              <span className="sm:hidden">العروض</span>
            </Link>
            <Link
              href="/products"
              target="_blank"
              className="text-[11px] sm:text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 sm:px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">معاينة الكتالوج</span>
              <span className="sm:hidden">الكتالوج</span>
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
