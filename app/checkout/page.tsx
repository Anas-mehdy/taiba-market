'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { 
  ChevronRight, MessageSquare, User, FileText, ShoppingCart, 
  Trash2, ArrowRight, X, ShoppingBag, Phone, MapPin, Plus, Minus
} from 'lucide-react';

export default function CheckoutPage() {
  const { cart, totalPrice, totalQuantity, clearCart, removeFromCart, addToCart } = useCart();
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('905000000000');
  const [storeName, setStoreName] = useState('ماركت طيبة');
  const [errorMsg, setErrorMsg] = useState('');
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  // Modal zoom
  const openImagePreview = (url: string) => {
    setActivePreviewImage(url);
    window.history.pushState({ modal: 'image-preview' }, '');
  };

  const closeImagePreview = () => {
    setActivePreviewImage(null);
    if (typeof window !== 'undefined' && window.history.state?.modal === 'image-preview') {
      window.history.back();
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (activePreviewImage) {
        setActivePreviewImage(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activePreviewImage]);

  // Fetch active settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
        if (!isUrlConfigured) return;

        const { data } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['whatsapp_number', 'store_name']);

        if (data) {
          data.forEach((s) => {
            if (s.key === 'whatsapp_number' && s.value) setWhatsappNumber(s.value);
            if (s.key === 'store_name' && s.value) setStoreName(s.value);
          });
        }
      } catch (err) {
        console.warn('Could not fetch settings, using defaults.', err);
      }
    }
    fetchSettings();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!customerName.trim()) {
      setErrorMsg('يرجى إدخال اسمك أو اسم العائلة لتأكيد الطلب.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim()
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.orderId) {
        clearCart();
        if (data.whatsappUrl) {
          try {
            window.open(data.whatsappUrl, '_blank');
          } catch {
            // popup fallback
          }
        }
        router.push(`/track/${data.orderId}`);
        return;
      }

      const serverError = data?.error || 'تعذر تسجيل الطلب حالياً. يرجى المحاولة مرة أخرى.';
      setErrorMsg(serverError);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMsg('تعذر تسجيل الطلب حالياً. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 min-h-screen font-sans text-center pb-24">
        <div className="max-w-md mx-auto space-y-6">
          <div className="bg-teal-50 p-4 rounded-3xl text-[#128C7E] w-20 h-20 flex items-center justify-center mx-auto shadow-inner">
            <ShoppingCart className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-slate-800">سلتك فارغة حالياً</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              تصفح كتالوج منتجات ماركت طيبة وأضف المواد التي تحتاجها لإصدار الفاتورة وإرسالها مباشرة.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-[#075E54] hover:bg-[#128C7E] text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-md active:scale-95 text-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>تصفح المنتجات والأقسام</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-2xl transition-all text-xs"
            >
              <span>مشاهدة العروض اليومية</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans pb-24">
      {/* Header */}
      <header className="bg-[#075E54] text-white px-4 py-3.5 shadow-md z-40 shrink-0">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/products" className="hover:bg-[#128C7E] p-1.5 rounded-xl text-white transition-colors">
            <ChevronRight className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-base font-bold">معاينة الفاتورة والطلب</h1>
            <p className="text-[10px] text-teal-100 font-medium">ماركت طيبة • طلب سريع عبر واتساب</p>
          </div>
        </div>
      </header>

      {/* Main Form content */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-4">
          
          {/* Summary Invoice Header Card */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-bold text-slate-800">قائمة المواد المختارة ({totalQuantity})</h2>
              </div>
              <Link href="/products" className="text-[11px] font-bold text-[#128C7E] hover:underline">
                + إضافة مواد أخرى
              </Link>
            </div>

            {/* List of items */}
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto no-scrollbar pr-1">
              {cart.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  {/* Right side: Image Thumbnail & Text details */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      onClick={() => item.image_url && openImagePreview(item.image_url)}
                      className={`w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden relative group ${
                        item.image_url ? 'cursor-zoom-in hover:brightness-95 transition-all' : 'select-none'
                      }`}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-slate-350 stroke-[1.5]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate text-right">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 text-right font-medium">
                        {item.price !== null && item.price !== undefined && Number(item.price) > 0 ? (
                          `${item.quantity} × ${Number(item.price).toFixed(2)} TL`
                        ) : (
                          `الكمية: ${item.quantity}`
                        )}
                        {item.applied_offer && (
                          <span className="text-amber-600 font-bold mr-1">[{item.applied_offer}]</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Left side: Price total & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.price !== null && item.price !== undefined && Number(item.price) > 0 && (
                      <span className="text-xs font-black text-slate-800">
                        {(Number(item.price) * item.quantity).toFixed(2)} TL
                      </span>
                    )}
                    
                    {/* Compact Plus/Minus */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-slate-200 text-rose-500 rounded-md transition-colors"
                        title="تنقيص"
                      >
                        <Minus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <span className="text-[10px] font-bold px-1.5 min-w-4 text-center text-slate-700">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="p-1 hover:bg-slate-200 text-emerald-600 rounded-md transition-colors"
                        title="زيادة"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Row */}
            <div className="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">إجمالي الفاتورة التقريبي:</span>
              <span className="text-base font-black text-[#128C7E]">
                {totalPrice.toFixed(2)} TL
              </span>
            </div>
          </div>

          {/* Customer Info Form */}
          <form onSubmit={handleCheckout} className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-800">معلومات التوصيل والطلب</h2>
            </div>

            {/* Customer Name */}
            <div className="space-y-1">
              <label htmlFor="customerName" className="block text-[11px] font-bold text-slate-600 text-right">
                الاسم أو اسم العائلة <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: أبو أحمد، عائلة فلان..."
                  className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl pr-9 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right font-medium"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {/* Customer Phone (Optional) */}
            <div className="space-y-1">
              <label htmlFor="customerPhone" className="block text-[11px] font-bold text-slate-600 text-right">
                رقم الهاتف للتواصل <span className="text-slate-400 text-[10px] font-normal">(اختياري)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl pr-9 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right font-medium ltr"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Customer Address (Optional) */}
            <div className="space-y-1">
              <label htmlFor="customerAddress" className="block text-[11px] font-bold text-slate-600 text-right">
                العنوان أو الحي <span className="text-slate-400 text-[10px] font-normal">(اختياري للتوصيل المنزلي)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <input
                  id="customerAddress"
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="الشارع، البناء، رقم الشقة..."
                  className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl pr-9 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right font-medium"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-xs text-right font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#25D366] hover:bg-[#20ba59] disabled:bg-slate-300 text-white rounded-2xl py-3 px-4 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? 'جاري تجهيز الفاتورة...' : 'إرسال الفاتورة عبر واتساب إلى الماركت'}</span>
            </button>
            
            <p className="text-[10px] text-slate-400 text-center leading-tight">
              سيتم فتح تطبيق واتساب تلقائياً مع تفاصيل طلبك لتأكيد التجهيز والتوصيل.
            </p>
          </form>
        </div>
      </main>

      {/* Full-Screen Image Preview Modal */}
      {activePreviewImage && (
        <div 
          onClick={closeImagePreview}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out transition-opacity duration-300"
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              closeImagePreview();
            }}
            className="absolute top-6 left-6 bg-white/10 hover:bg-white/20 active:scale-95 text-white p-2.5 rounded-full border border-white/20 transition-all cursor-pointer shadow-lg z-50 flex items-center justify-center"
            title="إغلاق الصورة"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="relative max-w-full max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={activePreviewImage} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/5 select-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
