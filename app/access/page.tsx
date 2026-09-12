'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, KeyRound, ArrowLeft, MessageCircle, AlertCircle, CheckCircle2, Loader2, Delete } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

// Helper to sanitize & normalize Arabic-Indic digits
function normalizeDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .replace(/\D/g, ''); // keep numbers only
}

function AccessGateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [storeInfo, setStoreInfo] = useState<{ whatsappNumber: string; storeName: string }>({
    whatsappNumber: '905421511879',
    storeName: 'ماركت طيبة',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch store WhatsApp number for direct support button
  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await fetch('/api/store/auth/pin-info');
        if (res.ok) {
          const data = await res.json();
          if (data.whatsappNumber) {
            setStoreInfo({
              whatsappNumber: data.whatsappNumber,
              storeName: data.storeName || 'ماركت طيبة',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load store info:', err);
      }
    }
    fetchInfo();
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = normalizeDigits(e.target.value);
    setPin(clean);
    if (errorMsg) setErrorMsg('');
  };

  const handleKeypadPress = (digit: string) => {
    if (loading || success) return;
    if (pin.length >= 10) return;
    setPin((prev) => prev + digit);
    if (errorMsg) setErrorMsg('');
  };

  const handleKeypadBackspace = () => {
    if (loading || success) return;
    setPin((prev) => prev.slice(0, -1));
    if (errorMsg) setErrorMsg('');
  };

  const handleKeypadClear = () => {
    if (loading || success) return;
    setPin('');
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin || loading || success) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/store/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'الرمز السري غير صحيح');
      }

      setSuccess(true);
      // Wait a moment to show success feedback, then navigate
      setTimeout(() => {
        router.push(returnUrl);
        router.refresh();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'الرمز السري غير صحيح، يرجى المحاولة مرة أخرى.');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const whatsappLink = `https://wa.me/${storeInfo.whatsappNumber}?text=${encodeURIComponent(
    `السلام عليكم، أنا زبون لدى ${storeInfo.storeName} وأود الحصول على الرمز السري للدخول إلى المتجر.`
  )}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans relative overflow-hidden transition-colors duration-200" dir="rtl">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 sm:w-96 h-80 sm:h-96 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Bar with Theme Toggle */}
      <header className="w-full max-w-md flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt={storeInfo.storeName} className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{storeInfo.storeName}</span>
        </div>
        <ThemeToggle className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-sm" />
      </header>

      {/* Main Card */}
      <main className="w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-xl space-y-6">
        {/* Header / Lock Icon */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
              أهلاً بكم في {storeInfo.storeName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
              يرجى إدخال الرمز السري للاطلاع على المنتجات والأسعار
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute inset-y-0 right-4 flex items-center text-slate-400">
                <KeyRound className="w-5 h-5" />
              </span>

              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={pin}
                onChange={handleInputChange}
                placeholder="أدخل الرمز السري هنا..."
                disabled={loading || success}
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 outline-none rounded-2xl pr-12 pl-4 py-3.5 text-center text-xl font-mono tracking-widest text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
              />
            </div>

            {/* Error / Success Feedback */}
            {errorMsg && (
              <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>تم التحقق بنجاح! جاري فتح المتجر...</span>
              </div>
            )}
          </div>

          {/* On-screen Numeric Keypad for fast mobile tapping */}
          <div className="grid grid-cols-3 gap-2 pt-1" dir="ltr">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                disabled={loading || success}
                className="h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-750 active:scale-95 text-slate-800 dark:text-slate-100 font-mono font-bold text-lg rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all flex items-center justify-center cursor-pointer select-none"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleKeypadClear}
              disabled={loading || success || !pin}
              className="h-12 bg-slate-100/60 hover:bg-slate-200/60 dark:bg-slate-800/40 dark:hover:bg-slate-750 active:scale-95 text-slate-500 dark:text-slate-400 font-medium text-xs rounded-xl border border-slate-200/40 dark:border-slate-700/40 transition-all flex items-center justify-center cursor-pointer select-none disabled:opacity-40"
            >
              مسح
            </button>

            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              disabled={loading || success}
              className="h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-750 active:scale-95 text-slate-800 dark:text-slate-100 font-mono font-bold text-lg rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleKeypadBackspace}
              disabled={loading || success || !pin}
              className="h-12 bg-slate-100/60 hover:bg-slate-200/60 dark:bg-slate-800/40 dark:hover:bg-slate-750 active:scale-95 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200/40 dark:border-slate-700/40 transition-all flex items-center justify-center cursor-pointer select-none disabled:opacity-40"
              title="حذف خانة"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success || !pin}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold py-3.5 px-6 rounded-2xl text-base flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحقق...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>تم الدخول</span>
              </>
            ) : (
              <>
                <span>دخول إلى المتجر</span>
                <ArrowLeft className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Persistence Note & WhatsApp Contact */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            * يتم حفظ تسجيل الدخول على جهازك تلقائياً لتتصفح المتجر براحة دون تكرار إدخال الرمز.
          </p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-4 py-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 transition-all w-full"
          >
            <MessageCircle className="w-4 h-4" />
            <span>طلب الرمز السري عبر واتساب</span>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md text-center py-2 text-[11px] text-slate-400 dark:text-slate-500">
        جميع الحقوق محفوظة &copy; {new Date().getFullYear()} {storeInfo.storeName}
      </footer>
    </div>
  );
}

export default function AccessGatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    }>
      <AccessGateContent />
    </Suspense>
  );
}
