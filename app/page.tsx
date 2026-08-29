'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import { 
  Store, Search, ShoppingBag, ShoppingCart, Sparkles, 
  ArrowLeft, Tag, Gift, Maximize2, X, Phone, Flame, ChevronLeft,
  Clock, CheckCircle2, AlertCircle, Layers
} from 'lucide-react';

interface DailyOffer {
  id: string;
  title?: string | null;
  image_url: string;
  sort_order?: number;
  is_active?: boolean;
  link_url?: string | null;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
  sort_order?: number;
}

// Fallback high-quality promotional grocery banners for demo mode (similar to Rozana style)
const MOCK_BANNERS: DailyOffer[] = [
  {
    id: 'b1',
    title: 'عروض التوفير الكبرى - مساحيق ومناديل معطرة مع هدايا مجانية',
    image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=900&auto=format&fit=crop&q=80',
    sort_order: 0,
    is_active: true
  },
  {
    id: 'b2',
    title: 'عرض العصائر والمشروبات المنعشة - اشتري 5 واحصل على طرد مجاناً',
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=900&auto=format&fit=crop&q=80',
    sort_order: 1,
    is_active: true
  },
  {
    id: 'b3',
    title: 'مهرجان الأجبان والألبان الطازجة - أسعار خاصة لفترة محدودة',
    image_url: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=900&auto=format&fit=crop&q=80',
    sort_order: 2,
    is_active: true
  },
  {
    id: 'b4',
    title: 'قسم الأغذية المجففة والأرز والزيوت - جودة طيبة وسعر التوفير',
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=900&auto=format&fit=crop&q=80',
    sort_order: 3,
    is_active: true
  }
];

const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'ألبان وأجبان', sort_order: 0 },
  { id: '2', name: 'مشروبات وغازيات', sort_order: 1 },
  { id: '3', name: 'معلبات ومجففات', sort_order: 2 },
  { id: '4', name: 'بسكويت وحلويات', sort_order: 3 },
  { id: '5', name: 'منظفات وعناية', sort_order: 4 },
];

export default function HomePage() {
  const { totalQuantity, totalPrice } = useCart();
  const [banners, setBanners] = useState<DailyOffer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('905000000000');
  const [storeName, setStoreName] = useState('ماركت طيبة');

  // Handle hardware/browser back button for modal
  const openImagePreview = (url: string) => {
    setActivePreviewImage(url);
    window.history.pushState({ modal: 'banner-preview' }, '');
  };

  const closeImagePreview = () => {
    setActivePreviewImage(null);
    if (typeof window !== 'undefined' && window.history.state?.modal === 'banner-preview') {
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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
        if (!isUrlConfigured) {
          throw new Error('Supabase not configured');
        }

        // 1. Fetch Banners
        const { data: bannerData, error: bannerErr } = await supabase
          .from('daily_offers')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (bannerErr) throw bannerErr;

        // 2. Fetch Categories
        const { data: catData, error: catErr } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        // 3. Fetch Settings
        const { data: settingsData } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['whatsapp_number', 'store_name']);

        if (settingsData) {
          settingsData.forEach((s) => {
            if (s.key === 'whatsapp_number' && s.value) setWhatsappNumber(s.value);
            if (s.key === 'store_name' && s.value) setStoreName(s.value);
          });
        }

        if (bannerData && bannerData.length > 0) {
          setBanners(bannerData);
        } else {
          setBanners(MOCK_BANNERS);
        }

        setCategories(catData || MOCK_CATEGORIES);
        setUsingMockData(false);
      } catch (err) {
        console.warn('Loading demo fallback banners for Tayba Market:', err);
        setBanners(MOCK_BANNERS);
        setCategories(MOCK_CATEGORIES);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* Demo Warning Banner */}
      {usingMockData && (
        <div className="bg-amber-500 text-white px-4 py-1.5 text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shrink-0">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>وضع العرض التجريبي (غير متصل بقاعدة البيانات بعد). لإدخال بياناتك الحية، يرجى ربط Supabase.</span>
        </div>
      )}

      {/* Main App Header */}
      <header className="sticky top-0 bg-[#075E54] text-white px-4 py-3.5 shadow-md z-40 shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-[#128C7E] p-2 rounded-2xl text-white shadow-inner flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight truncate leading-tight">{storeName}</h1>
              <p className="text-[10px] text-teal-100 font-medium truncate mt-0.5">بقالية ومواد غذائية • عروض يومية وتوصيل سريع</p>
            </div>
          </div>

          {/* Quick WhatsApp Contact */}
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('مرحباً ماركت طيبة، لدي استفسار بخصوص الطلبات والعروض.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
          >
            <Phone className="w-3.5 h-3.5 fill-current" />
            <span>تواصل معنا</span>
          </a>
        </div>
      </header>

      {/* Search & Action Bar */}
      <section className="bg-white border-b border-slate-200 py-3 px-4 sticky top-[62px] z-30 shadow-xs">
        <div className="max-w-md mx-auto space-y-2.5">
          
          {/* Search Trigger Link to Products */}
          <Link
            href="/products"
            className="w-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 font-medium transition-all group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              <span>ابحث عن أي منتج في الماركت...</span>
            </div>
            <span className="text-[10px] bg-[#128C7E]/10 text-[#075E54] font-bold px-2 py-0.5 rounded-lg">
              فتح الكتالوج &larr;
            </span>
          </Link>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 snap-x">
            <Link
              href="/products"
              className="bg-emerald-50 text-[#075E54] border border-emerald-200/80 hover:bg-emerald-100 font-bold px-3 py-1 rounded-full text-[11px] whitespace-nowrap shrink-0 snap-start flex items-center gap-1 transition-all"
            >
              <Sparkles className="w-3 h-3 text-[#128C7E]" />
              <span>كافة الأصناف</span>
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1 rounded-full text-[11px] whitespace-nowrap shrink-0 snap-start transition-all"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Main Feed: Daily Offers & Banners (Rozana Style) */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-5">
          
          {/* Hero Section Title */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/10 p-1.5 rounded-xl text-amber-600">
                <Flame className="w-4 h-4 fill-amber-500" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-850 leading-tight">عروض وتخفيضات اليوم</h2>
                <p className="text-[10px] text-slate-400 font-medium">اضغط على أي صورة لتكبير العرض وتفاصيله</p>
              </div>
            </div>

            <Link
              href="/products"
              className="text-[11px] font-bold text-[#128C7E] hover:text-[#075E54] flex items-center gap-0.5 transition-colors"
            >
              <span>طلب مباشر</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Banners List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-3 border border-slate-100 shadow-xs space-y-3 animate-pulse">
                  <div className="w-full aspect-[16/9] bg-slate-200 rounded-2xl" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : banners.length > 0 ? (
            <div className="space-y-4">
              {banners.map((banner, index) => (
                <div
                  key={banner.id || index}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden hover:shadow-md transition-all duration-200 group"
                >
                  {/* Banner Image Container */}
                  <div
                    onClick={() => openImagePreview(banner.image_url)}
                    className="w-full aspect-[16/9] bg-slate-100 relative cursor-zoom-in overflow-hidden"
                  >
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      loading="lazy"
                    />
                    
                    {/* Floating Offer Badge */}
                    <div className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-xs">
                      <Gift className="w-3 h-3" />
                      <span>عرض اليوم</span>
                    </div>

                    {/* Zoom Icon Overlay */}
                    <div className="absolute bottom-3 left-3 bg-black/50 text-white p-1.5 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Banner Title & Quick Action */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    {banner.title && banner.title !== 'عرض اليوم' ? (
                      <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed flex-1 text-right">
                        {banner.title}
                      </h3>
                    ) : (
                      <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-amber-500" />
                        <span>عرض اليوم الترويجي</span>
                      </div>
                    )}

                    <Link
                      href="/products"
                      className="bg-[#128C7E] hover:bg-[#075E54] active:scale-95 text-white text-[11px] font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs shrink-0 flex items-center gap-1"
                    >
                      <span>اطلب الآن</span>
                      <ChevronLeft className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-100 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-600">لا توجد عروض منشورة اليوم</h3>
              <p className="text-xs text-slate-400">يمكنك تصفح جميع المنتجات المتاحة من خلال الكتالوج.</p>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 bg-[#075E54] text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md hover:bg-[#128C7E] transition-all"
              >
                <span>تصفح المنتجات</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Bottom Big CTA Card */}
          <div className="bg-gradient-to-br from-[#075E54] to-[#128C7E] text-white rounded-3xl p-5 shadow-lg space-y-3 relative overflow-hidden text-right">
            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-teal-100">
                <Store className="w-3 h-3" />
                <span>تسوق متكامل من ماركت طيبة</span>
              </div>
              <h3 className="text-base font-black leading-snug">
                هل تبحث عن أصناف أخرى؟
              </h3>
              <p className="text-xs text-teal-100 leading-relaxed max-w-xs">
                تصفح الكتالوج الكامل للبقالية واختر ما يلزمك لتصلك الفاتورة وتجهيز الطلب مباشرة.
              </p>
              <div className="pt-2">
                <Link
                  href="/products"
                  className="bg-white hover:bg-teal-50 active:scale-95 text-[#075E54] font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4 text-[#128C7E]" />
                  <span>فتح كتالوج المنتجات الكامل</span>
                </Link>
              </div>
            </div>
            
            {/* Background Decorative Circles */}
            <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute right-0 -top-10 w-28 h-28 bg-emerald-400/20 rounded-full blur-lg pointer-events-none" />
          </div>

        </div>
      </main>

      {/* Floating Bottom Cart Bar - Active only when items added */}
      {totalQuantity > 0 && (
        <div className="fixed bottom-16 left-0 right-0 py-2 px-4 pointer-events-none z-30">
          <div className="max-w-md mx-auto pointer-events-auto">
            <Link
              href="/checkout"
              className="bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl p-3.5 flex items-center justify-between shadow-xl active:scale-[0.99] transition-all duration-150 animate-bounce"
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 p-2 rounded-xl text-white">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-teal-50 font-medium">سلتك الحالية</p>
                  <p className="text-xs font-bold">{totalQuantity} مواد مختارة</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold bg-[#075E54] px-3 py-1.5 rounded-xl border border-teal-400/20">
                  {totalPrice.toFixed(2)} TL
                </span>
                <span className="text-xs font-bold leading-none">إتمام الطلب &larr;</span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Full-Screen Image Preview Modal */}
      {activePreviewImage && (
        <div 
          onClick={closeImagePreview}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out transition-opacity duration-300"
        >
          {/* Close Button */}
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
          
          {/* Centered Image */}
          <div className="relative max-w-full max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={activePreviewImage} 
              alt="Offer Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/5 select-none"
            />
          </div>
        </div>
      )}

    </div>
  );
}
