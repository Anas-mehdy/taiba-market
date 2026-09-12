'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Save, AlertCircle, CheckCircle2, Loader2, Phone, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function AdminSettings() {
  const [rawNumber, setRawNumber] = useState('');
  const [sanitizedNumber, setSanitizedNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // PIN Protection State
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinCode, setPinCode] = useState('1234');
  const [pinLoading, setPinLoading] = useState(true);
  const [pinSaving, setPinSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinStatusMsg, setPinStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Sanitization Helper Function
  // 1. Strip all spaces and "+".
  // 2. Remove leading "0" if "05xxxxxxxx" (turns into "5xxxxxxxx").
  // 3. Prefix with "90" if not already present, ensuring format: "905xxxxxxxx".
  const sanitizePhoneNumber = (input: string): string => {
    // Strip all non-digit characters (including spaces, +)
    let cleaned = input.replace(/\D/g, '');

    // Check if it starts with 0
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1); // Remove leading 0
    }

    // Now, if it starts with 905, it is already correct.
    // If it starts with 5, prepend 90.
    if (cleaned.startsWith('5') && cleaned.length === 10) {
      cleaned = '90' + cleaned;
    } else if (cleaned.startsWith('905') && cleaned.length === 12) {
      // Correct format
    } else if (cleaned.length > 0 && !cleaned.startsWith('90')) {
      // Default to adding country code if it looks like a standard number without it
      cleaned = '90' + cleaned;
    }

    return cleaned;
  };

  useEffect(() => {
    // Dynamic real-time preview of sanitization
    setSanitizedNumber(sanitizePhoneNumber(rawNumber));
  }, [rawNumber]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setStatusMsg(null);
      
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      if (!isUrlConfigured) {
        throw new Error('Supabase environment variables not configured');
      }

      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'whatsapp_number')
        .single();

      if (error) {
        // If row doesn't exist, seed it
        if (error.code === 'PGRST116') {
          await supabase.from('settings').insert({ key: 'whatsapp_number', value: '905000000000' });
          setRawNumber('905000000000');
        } else {
          throw error;
        }
      } else if (data && data.value) {
        setRawNumber(data.value);
      }
      
      setUsingMockData(false);
    } catch (err) {
      console.warn('Could not fetch settings from database. Loading preview mode.', err);
      setRawNumber('905000000000');
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchPinSettings = async () => {
    try {
      setPinLoading(true);
      const res = await fetch('/api/admin/settings/pin');
      if (res.ok) {
        const data = await res.json();
        setPinEnabled(data.enabled);
        setPinCode(data.pin || '1234');
      }
    } catch (err) {
      console.error('Failed to fetch PIN settings:', err);
    } finally {
      setPinLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchPinSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    // Validate sanitized number format
    if (!/^905\d{9}$/.test(sanitizedNumber)) {
      setStatusMsg({
        type: 'error',
        text: 'صيغة رقم الهاتف غير صالحة. يجب أن يتكون الرقم التركي من 12 خانة ويبدأ بـ 905 (مثال: 905300000000).'
      });
      return;
    }

    setSaving(true);

    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isUrlConfigured) {
        const { error } = await supabase
          .from('settings')
          .upsert({ key: 'whatsapp_number', value: sanitizedNumber });

        if (error) throw error;
      }

      setStatusMsg({
        type: 'success',
        text: 'تم حفظ رقم الواتساب وتحديث رابط الطلبات بنجاح!'
      });
      setRawNumber(sanitizedNumber);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء حفظ الإعدادات.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePinSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinStatusMsg(null);

    // Normalize Arabic digits
    const cleanedPin = pinCode
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
      .replace(/\D/g, '');

    if (pinEnabled && (!cleanedPin || cleanedPin.length < 3)) {
      setPinStatusMsg({
        type: 'error',
        text: 'يجب كتابة رمز سري مكوّن من 3 أرقام على الأقل عند تفعيل القفل.',
      });
      return;
    }

    setPinSaving(true);

    try {
      const res = await fetch('/api/admin/settings/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: pinEnabled,
          pin: cleanedPin || '1234',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في حفظ إعدادات الرمز السري');
      }

      setPinCode(cleanedPin || '1234');
      setPinStatusMsg({
        type: 'success',
        text: 'تم حفظ إعدادات الرمز السري بنجاح! تم تطبيق الحماية وتحديث أمان المتجر.',
      });
    } catch (err: any) {
      setPinStatusMsg({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء حفظ إعدادات الرمز السري.',
      });
    } finally {
      setPinSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning */}
      {usingMockData && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
          <span>وضع العرض التجريبي نشط. التعديلات ستتم محاكاة حفظها محلياً فقط.</span>
        </div>
      )}

      {/* Header Info */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">إعدادات النظام العامة</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">تعديل رقم الهاتف المستلم لطلبات الواتساب وتخصيص قنوات التوجيه للمبيعات</p>
      </div>

      <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">قناة استلام الطلبات (WhatsApp)</h2>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-550" />
            <p className="text-xs font-bold">جاري تحميل الإعدادات...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {/* Input field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">رقم الهاتف المستلم</label>
              
              <div className="relative">
                <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                  <Phone className="w-4.5 h-4.5" />
                </span>
                
                <input
                  type="text"
                  required
                  value={rawNumber}
                  onChange={(e) => setRawNumber(e.target.value)}
                  placeholder="أدخل رقم الواتساب (مثال: +90 530 000 00 00)"
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 outline-none rounded-xl pr-10 pl-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all text-right ltr"
                  disabled={saving}
                />
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                * يمكنك إدخال الرقم بأي صيغة (مع فراغات، مع إشارة +، أو بالبدء بـ 0). سيقوم النظام تلقائياً بتنظيف المدخلات وتنسيقها بالشكل الدولي المعتمد لدى شركة واتساب.
              </p>
            </div>

            {/* Live Sanitize Dynamic Preview Card */}
            {rawNumber && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300">المعالجة التلقائية الذكية:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-750">
                    <span className="text-slate-400 dark:text-slate-400 block mb-0.5">القيمة التي قمت بكتابتها:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200 font-medium">{rawNumber}</span>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-emerald-700 dark:text-emerald-300 block mb-0.5">الصيغة النهائية للحفظ (wa.me):</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">{sanitizedNumber || 'جاري المعالجة...'}</span>
                  </div>
                </div>
                {sanitizedNumber && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400">
                    رابط الطلب المباشر النشط للمتجر: <span className="font-mono text-emerald-600 dark:text-emerald-400 underline select-all">https://wa.me/{sanitizedNumber}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notification alert */}
            {statusMsg && (
              <div className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 font-semibold leading-relaxed border ${
                statusMsg.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
              }`}>
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Action button */}
            <button
              type="submit"
              disabled={saving || !rawNumber}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold py-3 px-5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4.5 h-4.5" />
              )}
              <span>حفظ التعديلات</span>
            </button>

          </form>
        )}
      </div>

      {/* Store PIN Protection Card */}
      <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">حماية المتجر برقم سري (PIN)</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">قفل استعراض المنتجات والأسعار لمنع المنافسين من التطفل</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() => setPinEnabled(!pinEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              pinEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            role="switch"
            aria-checked={pinEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                pinEnabled ? '-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {pinLoading ? (
          <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-550" />
            <p className="text-xs">جاري تحميل إعدادات الحماية...</p>
          </div>
        ) : (
          <form onSubmit={handleSavePinSettings} className="space-y-5">
            {/* Status indicator badge */}
            <div className={`p-3 rounded-2xl text-xs flex items-center justify-between font-semibold ${
              pinEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${pinEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>
                  {pinEnabled ? 'حماية المتجر مُفعّلة: المتجر مقفل برقم سري' : 'حماية المتجر معطلة: المتجر مفتوح لجميع الزوار بدون قفل'}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                pinEnabled ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {pinEnabled ? 'محمي' : 'مفتوح'}
              </span>
            </div>

            {/* PIN Input Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                الرقم السري للمتجر (أرقام فقط)
              </label>

              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="مثال: 1234 أو 2026"
                  disabled={pinSaving}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 outline-none rounded-xl px-10 py-3 text-base font-mono tracking-widest text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all text-center"
                />

                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
                >
                  {showPin ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                * يدعم النظام كتابة الأرقام باللغتين العربية (١٢٣٤) والإنجليزية (1234) تلقائياً لتسهيل الدخول على الزبائن.
              </p>
            </div>

            {/* Explanatory notes / Security feature details */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span><strong>جلسات طويلة الأمد:</strong> الزبون يدخل الرقم مرة واحدة فقط ويبقى المتجر مفتوحاً على جهازه لمدة سنة كاملة دون إزعاجه بطلب الرمز في كل زيارة.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span><strong>إبطال تلقائي للأجهزة القديمة:</strong> عند تغييرك للرقم السري هنا والضغط على حفظ، سيتم فوراً طرد كافة الأجهزة القديمة وإلغاء صلاحيتها وإجبار الجميع على إدخال الرمز الجديد (لحمايتك إذا تسرب الرقم لأحد المنافسين).</span>
              </div>
            </div>

            {/* Feedback alert */}
            {pinStatusMsg && (
              <div className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 font-semibold leading-relaxed border ${
                pinStatusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
              }`}>
                {pinStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{pinStatusMsg.text}</span>
              </div>
            )}

            {/* Action button */}
            <button
              type="submit"
              disabled={pinSaving}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold py-3 px-5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              {pinSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4.5 h-4.5" />
              )}
              <span>حفظ إعدادات الحماية</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
