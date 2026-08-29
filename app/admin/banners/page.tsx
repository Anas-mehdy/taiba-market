'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, Plus, Trash2, Loader2, Image as ImageIcon, Upload, 
  AlertCircle, RefreshCw, GripVertical, Eye, EyeOff, X, Save, CheckCircle2, Link as LinkIcon
} from 'lucide-react';

interface DailyOffer {
  id: string;
  title?: string | null;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  link_url?: string | null;
  created_at?: string;
}

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
  }
];

const compressImage = (file: File, maxWidth = 1200): Promise<Blob | File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              const compressedFile = new File([blob], `${baseName.replace(/\s+/g, '_')}_banner_${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export default function AdminBanners() {
  const [banners, setBanners] = useState<DailyOffer[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      if (!isUrlConfigured) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await supabase
        .from('daily_offers')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data || []);
      setUsingMockData(false);
    } catch (err) {
      console.warn('Could not fetch banners from database, loading mock data:', err);
      const saved = localStorage.getItem('tayba_admin_banners');
      if (saved) {
        try {
          setBanners(JSON.parse(saved));
        } catch {
          setBanners(MOCK_BANNERS);
        }
      } else {
        setBanners(MOCK_BANNERS);
      }
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const saveLocalBanners = (updated: DailyOffer[]) => {
    setBanners(updated);
    if (usingMockData) {
      localStorage.setItem('tayba_admin_banners', JSON.stringify(updated));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMsg('');

    if (file) {
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeBytes) {
        alert('حجم الصورة كبير! يرجى اختيار صورة أقل من 5 ميغابايت.');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile && !imagePreview) {
      alert('يرجى اختيار صورة البوستر.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let finalImageUrl: string | null = imagePreview;
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isUrlConfigured && imageFile) {
        // Compress image
        const compressed = await compressImage(imageFile);
        const fileName = `banner-${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('banner-images')
          .upload(fileName, compressed, {
            cacheControl: '31536000',
            upsert: true
          });

        if (uploadError) {
          // If banner-images bucket not found, try product-images bucket as fallback
          const { error: fallbackUploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, compressed, {
              cacheControl: '31536000',
              upsert: true
            });

          if (fallbackUploadError) {
            const errStr = (uploadError.message || '') + ' ' + (fallbackUploadError.message || '');
            if (errStr.toLowerCase().includes('bucket not found') || (fallbackUploadError as any)?.statusCode === '404' || (fallbackUploadError as any)?.statusCode === 404) {
              throw new Error(
                "لم يتم العثور على حاوية التخزين (Bucket not found) في Supabase. يرجى إنشاء Bucket باسم 'banner-images' أو 'product-images' في قسم Storage داخل Supabase وجعلها عامة (Public)."
              );
            }
            throw new Error(`فشل رفع صورة البانر: ${fallbackUploadError.message || uploadError.message}`);
          }

          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          finalImageUrl = data.publicUrl;
        } else {
          const { data } = supabase.storage
            .from('banner-images')
            .getPublicUrl(fileName);
          finalImageUrl = data.publicUrl;
        }

        const { data: newBanner, error: insertError } = await supabase
          .from('daily_offers')
          .insert({
            title: 'عرض اليوم',
            image_url: finalImageUrl,
            sort_order: banners.length,
            is_active: true,
            link_url: null
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setBanners((prev) => [newBanner, ...prev]);
      } else {
        const mockNewBanner: DailyOffer = {
          id: 'local-' + Date.now(),
          title: 'عرض اليوم',
          image_url: imagePreview || 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=900&auto=format&fit=crop&q=80',
          sort_order: banners.length,
          is_active: true,
          link_url: null
        };
        saveLocalBanners([mockNewBanner, ...banners]);
      }

      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccessMsg('تمت إضافة بوستر العرض بنجاح!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إضافة العرض.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (banner: DailyOffer) => {
    setTogglingId(banner.id);
    const newStatus = !banner.is_active;

    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      if (isUrlConfigured && !usingMockData) {
        const { error } = await supabase
          .from('daily_offers')
          .update({ is_active: newStatus })
          .eq('id', banner.id);

        if (error) throw error;
      }

      const updated = banners.map(b => b.id === banner.id ? { ...b, is_active: newStatus } : b);
      saveLocalBanners(updated);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء تعديل حالة العرض.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    const confirmDelete = window.confirm('هل أنت متأكد من حذف هذا البوستر الإعلاني؟');
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      if (isUrlConfigured && !usingMockData) {
        const { error } = await supabase
          .from('daily_offers')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      const updated = banners.filter(b => b.id !== id);
      saveLocalBanners(updated);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء حذف العرض.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans text-right" dir="rtl">
      
      {/* Warning */}
      {usingMockData && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
          <span>وضع العرض التجريبي نشط. التعديلات ستنعكس محلياً في ذاكرة المتصفح.</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800">إدارة عروض وبانرات المتجر</h1>
          <p className="text-xs text-slate-500 mt-1">رفع بوسترات العروض الترويجية اليومية التي تظهر في الصفحة الرئيسية للماركت</p>
        </div>
        <button
          onClick={fetchBanners}
          disabled={loading}
          className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Add Banner Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">إضافة بوستر عرض جديد</h2>
          </div>

          <form onSubmit={handleAddBanner} className="space-y-4">
            
            {/* Poster Image File Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">صورة البوستر / الإعلان</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
                id="banner-file-input"
                disabled={submitting}
              />
              <label
                htmlFor="banner-file-input"
                className="w-full border-2 border-dashed border-slate-250 hover:border-[#128C7E] bg-slate-50 hover:bg-emerald-50/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-slate-500 min-h-[160px]"
              >
                {imagePreview ? (
                  <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-slate-200">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold opacity-0 hover:opacity-100 transition-opacity">
                      تغيير الصورة
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-[#128C7E]" />
                    <span className="text-xs font-bold text-slate-700">اضغط لرفع صورة العرض</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WEBP (بنسبة عرض 16:9 مستحسن)</span>
                  </>
                )}
              </label>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-xs font-bold">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (!imageFile && !imagePreview)}
              className="w-full bg-[#075E54] hover:bg-[#128C7E] disabled:bg-slate-200 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>نشر العرض في الصفحة الرئيسية</span>
            </button>
          </form>
        </div>

        {/* Banners List */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 lg:col-span-2 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800">العروض والبوسترات الحالية ({banners.length})</h2>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#128C7E]" />
              <p className="text-xs font-bold">جاري تحميل البانرات...</p>
            </div>
          ) : banners.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className={`border rounded-2xl overflow-hidden transition-all bg-white flex flex-col justify-between ${
                    banner.is_active ? 'border-slate-200 shadow-2xs' : 'border-slate-200/60 opacity-60 bg-slate-50'
                  }`}
                >
                  <div className="relative aspect-[16/9] bg-slate-100 border-b border-slate-100">
                    <img src={banner.image_url} alt="بوستر العرض" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleToggleActive(banner)}
                      disabled={togglingId === banner.id}
                      className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer ${
                        banner.is_active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {banner.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{banner.is_active ? 'نشط وظاهر' : 'مخفي'}</span>
                    </button>
                  </div>

                  <div className="p-3 flex items-center justify-between bg-white">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {banner.is_active ? 'معروض للزبائن' : 'غير معروض'}
                    </span>

                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      disabled={deletingId === banner.id}
                      className="p-1.5 px-3 text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="حذف العرض"
                    >
                      {deletingId === banner.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-xs font-bold text-slate-700">لا توجد عروض مضافة بعد</h3>
              <p className="text-[11px] text-slate-400">استخدم النموذج الجانبي لرفع أول بوستر إعلاني يظهر في الصفحة الرئيسية للمتجر.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
