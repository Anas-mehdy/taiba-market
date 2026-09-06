'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Store, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already logged in, redirect straight to admin
  useEffect(() => {
    async function checkActiveSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        document.cookie = "admin_session=authenticated; path=/; max-age=86400; SameSite=Strict";
        router.push('/admin');
      }
    }
    checkActiveSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      
      if (!isUrlConfigured) {
        // Fallback for Demo mode
        if (email === 'admin@tayba.com' && password === 'admin123') {
          document.cookie = "admin_session=authenticated; path=/; max-age=86400; SameSite=Strict";
          router.push('/admin');
          return;
        } else {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة (في الوضع التجريبي استخدم: admin@tayba.com / admin123)');
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      if (data.session) {
        document.cookie = "admin_session=authenticated; path=/; max-age=86400; SameSite=Strict";
        router.push('/admin');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans relative overflow-hidden transition-colors duration-200" dir="rtl">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Floating Theme Toggle */}
      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800" />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-20 h-20 rounded-full overflow-hidden border-3 border-emerald-500/30 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="ماركت طيبة" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">لوحة الإدارة - ماركت طيبة</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">سجل الدخول لإدارة العروض اليومية، المنتجات، والطلبيات</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tayba.com"
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 outline-none rounded-xl pr-10 pl-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right font-medium"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              كلمة المرور
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 outline-none rounded-xl pr-10 pl-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right"
                disabled={loading}
              />
            </div>
          </div>

          {/* Errors alert */}
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-semibold leading-relaxed">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#075E54] hover:bg-[#128C7E] disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
          </button>
        </form>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-center">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <ArrowRight className="w-4 h-4 text-[#128C7E] dark:text-emerald-400" />
            <span>العودة إلى الصفحة الرئيسية للمتجر</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
