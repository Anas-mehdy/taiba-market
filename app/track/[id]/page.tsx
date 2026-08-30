'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ShoppingBag, CheckCircle2, Clock, MapPin, Phone, User, 
  Store, MessageSquare, FileText, ChevronRight, Copy, 
  Sparkles, RefreshCw, AlertCircle, Bell, Truck, Package, 
  CheckCheck, Share2, Info, ArrowRight, ExternalLink
} from 'lucide-react';
import { isOfferActive, getOfferBonusQuantity, getOrderBoxSummary } from '@/lib/offerHelpers';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  price_at_purchase: number;
  product_name?: string | null;
  product_image?: string | null;
  applied_offer?: string | null;
  products?: {
    name: string;
    image_url?: string | null;
    has_offer?: boolean;
    offer_title?: string | null;
    offer_type?: 'unlimited' | 'date_limited' | 'stock_limited';
    offer_end_date?: string | null;
    offer_max_quantity?: number | null;
    offer_used_quantity?: number;
  } | null;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_address?: string | null;
  total_price: number;
  status: string;
  delivery_note?: string | null;
  status_updated_at?: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const STEPS = [
  {
    key: 'received',
    label: 'تم الاستلام',
    title: 'تم استلام الطلب',
    description: 'تم تسجيل طلبكم بنجاح وجاري مراجعته من قبل إدارة المتجر.',
    icon: CheckCircle2,
    color: 'emerald'
  },
  {
    key: 'preparing',
    label: 'جاري التجهيز',
    title: 'جاري تجهيز وتعبئة المواد',
    description: 'يقوم فريق ماركت طيبة بتجهيز وتغليف طلبكم بعناية.',
    icon: Package,
    color: 'amber'
  },
  {
    key: 'delivering',
    label: 'جاري التوصيل',
    title: 'الطلب في الطريق إليكم',
    description: 'عامل التوصيل في طريقه إليكم الآن لتسليم الطلبية.',
    icon: Truck,
    color: 'blue'
  },
  {
    key: 'delivered',
    label: 'تم التسليم',
    title: 'تم تسليم الطلب بنجاح',
    description: 'نتمنى لكم تجربة تسوق ممتعة. شكراً لثقتكم بماركت طيبة!',
    icon: CheckCheck,
    color: 'emerald'
  }
];

export default function TrackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeWhatsapp, setStoreWhatsapp] = useState('905000000000');
  const [storeName, setStoreName] = useState('ماركت طيبة');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastLivePing, setLastLivePing] = useState<Date>(new Date());

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'pending':
      case 'received':
        return 0;
      case 'preparing':
        return 1;
      case 'delivering':
        return 2;
      case 'delivered':
        return 3;
      default:
        return 0;
    }
  };

  const fetchOrderDetails = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      
      if (!isUrlConfigured) {
        // Fallback for demo preview
        const mockOrder: Order = {
          id: id || 'demo-order-123',
          customer_name: 'زبون ماركت طيبة',
          customer_phone: '05550001122',
          customer_address: 'شارع السوق المركزي، بناء الياسمين 4',
          total_price: 185.00,
          status: 'delivering',
          delivery_note: 'عامل التوصيل "أحمد" في طريقه إليكم، سيصل خلال 15 دقيقة تقريباً.',
          status_updated_at: new Date().toISOString(),
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          order_items: [
            {
              id: 'item-1',
              order_id: id || 'demo-order-123',
              product_id: 'p1',
              quantity: 2,
              price_at_purchase: 45.00,
              product_name: 'بسكويت شوكولاتة أولكر 12 قطعة',
              product_image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=120&auto=format&fit=crop&q=60'
            },
            {
              id: 'item-2',
              order_id: id || 'demo-order-123',
              product_id: 'p3',
              quantity: 1,
              price_at_purchase: 85.00,
              product_name: 'شاي تركي غوكسو 100 ظرف',
              product_image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=120&auto=format&fit=crop&q=60'
            }
          ]
        };
        setOrder(mockOrder);
        setLastLivePing(new Date());
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product_name,
            product_image,
            products (
              name,
              image_url,
              has_offer,
              offer_title,
              offer_type,
              offer_end_date,
              offer_max_quantity,
              offer_used_quantity
            )
          )
        `)
        .eq('id', id)
        .single();

      if (fetchErr) throw fetchErr;

      if (!data) {
        throw new Error('لم يتم العثور على الطلبية المطلوبة.');
      }

      const typedOrder: Order = {
        ...data,
        total_price: Number(data.total_price || 0),
        order_items: (data.order_items || []).map((item: any) => {
          const effectiveOffer = item.applied_offer || (item.products && isOfferActive(item.products) ? item.products.offer_title : null);
          return {
            ...item,
            price_at_purchase: Number(item.price_at_purchase || 0),
            applied_offer: effectiveOffer,
            product_name: item.product_name || item.products?.name,
            product_image: item.product_image || item.products?.image_url,
            products: item.products ? { ...item.products } : null
          };
        })
      };

      setOrder(typedOrder);
      setLastLivePing(new Date());
    } catch (err: any) {
      console.error('Fetch order tracking error:', err);
      if (!order) {
        setError(err.message || 'حدث خطأ أثناء تحميل بيانات الطلب');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch store settings (WhatsApp number & Store name)
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
            if (s.key === 'whatsapp_number' && s.value) setStoreWhatsapp(s.value);
            if (s.key === 'store_name' && s.value) setStoreName(s.value);
          });
        }
      } catch (err) {
        console.warn('Could not fetch settings:', err);
      }
    }
    fetchSettings();
  }, []);

  // Initial load and Realtime setup
  useEffect(() => {
    if (!id) return;
    fetchOrderDetails();

    const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (!isUrlConfigured) return;

    // Realtime subscription for instant updates when admin updates status or delivery note
    const channel = supabase
      .channel(`order-track-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`
        },
        (payload) => {
          if (payload.new) {
            setOrder(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                status: payload.new.status,
                delivery_note: payload.new.delivery_note,
                status_updated_at: payload.new.status_updated_at,
                total_price: Number(payload.new.total_price || prev.total_price)
              };
            });
            setLastLivePing(new Date());
          }
        }
      )
      .subscribe();

    // Auto-polling interval every 8 seconds as robust fallback
    const interval = setInterval(() => {
      fetchOrderDetails(true);
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [id]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
        <div className="w-14 h-14 border-4 border-[#128C7E] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">جاري تحميل حالة الطلبية المباشرة...</h2>
        <p className="text-xs text-slate-400 mt-1">ماركت طيبة • خدمة التوصيل المنزلي</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans space-y-4" dir="rtl">
        <div className="bg-rose-50 p-4 rounded-3xl text-rose-500 w-16 h-16 flex items-center justify-center shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-800">تعذر العثور على الطلبية</h1>
          <p className="text-xs text-slate-500 max-w-xs">{error || 'تأكد من صحة الرابط أو تواصل مع إدارة المتجر للمساعدة.'}</p>
        </div>
        <Link
          href="/"
          className="bg-[#075E54] hover:bg-[#128C7E] text-white font-bold py-2.5 px-6 rounded-2xl text-xs transition-all shadow-md active:scale-95"
        >
          العودة للصفحة الرئيسية
        </Link>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(order.status);
  const isPostponed = order.status === 'postponed';
  const isCancelled = order.status === 'cancelled';
  const currentStepInfo = STEPS[currentStepIdx] || STEPS[0];

  const whatsappMessageText = encodeURIComponent(
    `مرحباً ماركت طيبة، بخصوص طلبيتي رقم #${order.id.substring(0, 8)} (${order.customer_name}): أود الاستفسار عن التوصيل.`
  );
  const storeWhatsappChatUrl = `https://wa.me/${storeWhatsapp}?text=${whatsappMessageText}`;

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans pb-20 text-right text-slate-800" dir="rtl">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-[#075E54] to-[#128C7E] text-white px-4 py-4 shadow-md sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-300/50 shadow-sm shrink-0 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="ماركت طيبة" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">{storeName}</h1>
              <p className="text-[11px] text-teal-100 font-medium">متابعة وتتبع حالة الطلبية المباشرة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrderDetails(true)}
              disabled={isRefreshing}
              className="bg-white/10 hover:bg-white/20 active:scale-95 text-white p-2 rounded-xl border border-white/20 transition-all cursor-pointer flex items-center justify-center"
              title="تحديث يدوي"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/"
              className="bg-white/15 hover:bg-white/25 active:scale-95 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1"
            >
              <span>المتجر</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-xl mx-auto px-4 py-5 space-y-4">
        
        {/* Live Status Header Banner */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-700">تتبع مباشر للطلبية</span>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl">
              #{order.id.substring(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Current Status Highlights */}
          {isCancelled ? (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-700">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-black">تم إلغاء الطلب</h3>
                <p className="text-xs text-rose-600 mt-0.5">تم إلغاء هذه الطلبية من قبل إدارة المتجر.</p>
              </div>
            </div>
          ) : isPostponed ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800">
              <Clock className="w-6 h-6 shrink-0 text-amber-600" />
              <div>
                <h3 className="text-sm font-black">الطلب مؤجل</h3>
                <p className="text-xs text-amber-700 mt-0.5">تم تأجيل موعد تسليم الطلبية بناءً على الاتفاق.</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-50 text-[#128C7E] shadow-inner mb-1 border border-emerald-100">
                {currentStepIdx === 0 && <CheckCircle2 className="w-8 h-8 text-[#128C7E]" />}
                {currentStepIdx === 1 && <Package className="w-8 h-8 text-amber-600 animate-bounce" />}
                {currentStepIdx === 2 && <Truck className="w-8 h-8 text-[#128C7E] animate-pulse" />}
                {currentStepIdx === 3 && <CheckCheck className="w-8 h-8 text-emerald-600" />}
              </div>

              <div>
                <span className="inline-block bg-[#128C7E]/10 text-[#075E54] text-[11px] font-extrabold px-3 py-1 rounded-full mb-1">
                  المرحلة الحالية: {currentStepInfo.label}
                </span>
                <h2 className="text-lg font-black text-slate-850">{currentStepInfo.title}</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-1">
                  {currentStepInfo.description}
                </p>
              </div>
            </div>
          )}

          {/* Stepper Progress Visualizer */}
          {!isCancelled && !isPostponed && (
            <div className="pt-4 border-t border-slate-100">
              <div className="grid grid-cols-4 gap-1 sm:gap-2 relative">
                {STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  const isUpcoming = idx > currentStepIdx;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center relative group">
                      {/* Step Circle */}
                      <div 
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 relative z-10 ${
                          isCompleted
                            ? 'bg-[#128C7E] text-white shadow-xs'
                            : isCurrent
                            ? 'bg-[#075E54] text-white ring-4 ring-emerald-100 shadow-md scale-105'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <Icon className={`w-5 h-5 ${isCurrent ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                        )}
                      </div>

                      {/* Step Title Label */}
                      <span 
                        className={`text-[10.5px] mt-2 font-bold leading-tight ${
                          isCurrent 
                            ? 'text-[#075E54] font-black' 
                            : isCompleted 
                            ? 'text-slate-700' 
                            : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar line connecting steps */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-l from-[#128C7E] to-[#25D366] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(currentStepIdx / (STEPS.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Store Note / Announcement Box (ملاحظات المتجر وعامل التوصيل) */}
        {order.delivery_note && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-5 border-2 border-amber-200/90 shadow-sm space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-amber-500 p-1.5 rounded-xl text-white shadow-xs">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-amber-950">ملاحظة وتنبيه من إدارة المتجر / التوصيل:</h3>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-lg">
                تحديث فوري
              </span>
            </div>

            <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-3.5 border border-amber-200/60 shadow-2xs">
              <p className="text-xs font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                {order.delivery_note}
              </p>
            </div>

            {order.status_updated_at && (
              <p className="text-[10px] text-amber-700/80 font-medium">
                آخر تحديث للحالة: {formatDateTime(order.status_updated_at)}
              </p>
            )}
          </div>
        )}

        {/* Customer & Delivery Details Card */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800">بيانات المستلم والتوصيل</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center gap-2.5">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 block font-semibold">اسم العميل</span>
                <span className="font-bold text-slate-800 truncate block">{order.customer_name}</span>
              </div>
            </div>

            {order.customer_phone && (
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">رقم الهاتف</span>
                  <span className="font-bold text-slate-800 ltr block text-right font-mono">{order.customer_phone}</span>
                </div>
              </div>
            )}

            {order.customer_address && (
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-start gap-2.5 sm:col-span-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">عنوان التوصيل</span>
                  <span className="font-bold text-slate-800 leading-snug block">{order.customer_address}</span>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center gap-2.5 sm:col-span-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 block font-semibold">تاريخ ووقت تسجيل الطلب</span>
                <span className="font-bold text-slate-800 block">{formatDateTime(order.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items Breakdown */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-800">تفاصيل المواد المطلوبة ({order.order_items.length})</h3>
            </div>
            <Link 
              href={`/invoice/${order.id}`}
              className="text-[11px] font-bold text-[#128C7E] hover:underline flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>عرض الفاتورة المسعرة</span>
            </Link>
          </div>

          {/* Items list */}
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
            {order.order_items.map((item) => {
              const itemTotal = Number(item.price_at_purchase || 0) * item.quantity;
              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name || ''} 
                          className="w-full h-full object-cover"
                          loading="lazy" 
                        />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-slate-350 stroke-[1.5]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.product_name || 'منتج غير معروف'}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {item.quantity} {item.price_at_purchase > 0 ? `× ${Number(item.price_at_purchase).toFixed(2)} TL` : 'صندوق'}
                        {item.applied_offer && (
                          <span className="text-amber-600 font-bold mr-1">[{item.applied_offer}]</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-slate-800 shrink-0">
                    {item.price_at_purchase > 0 ? `${itemTotal.toFixed(2)} TL` : 'يحدد لاحقاً'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Box summary */}
          {(() => {
            const summary = getOrderBoxSummary(order.order_items);
            return (
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="text-[11px] text-slate-500">إجمالي عدد الصناديق:</span>
                <span className="font-mono text-xs bg-slate-200/60 px-2 py-0.5 rounded-lg text-slate-800">
                  {summary.bonusBoxes > 0 
                    ? `${summary.totalBoxes} صندوق (${summary.paidBoxes} أصلية + ${summary.bonusBoxes} عروض مجانية)`
                    : `${summary.paidBoxes} صندوق`
                  }
                </span>
              </div>
            );
          })()}

          {/* Grand Total */}
          <div className="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">المجموع الكلي:</span>
            <span className="text-base font-black text-[#128C7E]">
              {Number(order.total_price).toFixed(2)} TL
            </span>
          </div>
        </div>

        {/* Action Buttons Group */}
        <div className="space-y-2 pt-2">
          <a
            href={storeWhatsappChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white rounded-2xl py-3 px-4 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>تواصل مع ماركت طيبة عبر واتساب بخصوص الطلب</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyLink}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 active:scale-95 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-black">تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>نسخ رابط التتبع</span>
                </>
              )}
            </button>

            <Link
              href={`/invoice/${order.id}`}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 active:scale-95 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>تحميل الفاتورة PDF</span>
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center pt-4 text-[10px] text-slate-400 space-y-1">
          <p>يتم تحديث هذه الصفحة تلقائياً عند تغيير حالة الطلب من قبل المتجر.</p>
          <p className="font-medium">ماركت طيبة • الجودة والتوفير والتوصيل السريع</p>
        </div>

      </main>
    </div>
  );
}
