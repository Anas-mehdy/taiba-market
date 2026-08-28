'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import { 
  Search, ShoppingBag, Plus, Minus, Store, MessageCircle, 
  AlertCircle, ShoppingCart, X, Package, Maximize2, Gift, Tag,
  ChevronRight, Sparkles, Filter
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  sort_order?: number;
}

interface Product {
  id: string;
  name: string;
  price: number | null;
  category_id: string;
  image_url: string | null;
  is_hidden?: boolean;
  has_offer?: boolean;
  offer_title?: string | null;
  offer_type?: 'unlimited' | 'date_limited' | 'stock_limited';
  offer_end_date?: string | null;
  offer_max_quantity?: number | null;
  offer_used_quantity?: number;
  note?: string | null;
}

const isOfferActive = (product: Product): boolean => {
  if (!product.has_offer || !product.offer_title || !product.offer_title.trim()) {
    return false;
  }
  
  if (product.offer_type === 'date_limited') {
    if (!product.offer_end_date) return false;
    const endDate = new Date(product.offer_end_date).getTime();
    if (isNaN(endDate) || Date.now() > endDate) return false;
  }

  if (product.offer_type === 'stock_limited') {
    if (product.offer_max_quantity === null || product.offer_max_quantity === undefined) return false;
    const used = product.offer_used_quantity || 0;
    if (used >= product.offer_max_quantity) return false;
  }

  return true;
};

// Fallback demo products for grocery supermarket
const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'ألبان وأجبان', sort_order: 0 },
  { id: '2', name: 'مشروبات وغازيات', sort_order: 1 },
  { id: '3', name: 'معلبات ومجففات', sort_order: 2 },
  { id: '4', name: 'بسكويت وحلويات', sort_order: 3 },
  { id: '5', name: 'منظفات وعناية', sort_order: 4 }
];

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'جبنة بيضاء كاملة الدسم بينار 500 غ', price: 110.00, category_id: '1', image_url: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=300&auto=format&fit=crop&q=80', has_offer: true, offer_title: 'خصم 15% اليوم' },
  { id: 'p2', name: 'لبن زبادي طازج سوتاس 1.5 كغ', price: 75.00, category_id: '1', image_url: null },
  { id: 'p3', name: 'كوكا كولا علب 330 مل', price: 25.00, category_id: '2', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80', has_offer: true, offer_title: 'اشتري 5 و احصل على 1 مجاناً' },
  { id: 'p4', name: 'شاي تركي ممتاز 100 ظرف', price: 85.00, category_id: '2', image_url: null },
  { id: 'p5', name: 'صلصة طماطم تات 800 غ', price: 55.00, category_id: '3', image_url: null },
  { id: 'p6', name: 'أرز تركي بالدو درجة أولى 1 كغ', price: 70.00, category_id: '3', image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80' },
  { id: 'p7', name: 'بسكويت شوكولاتة أولكر 12 قطعة', price: 45.00, category_id: '4', image_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&auto=format&fit=crop&q=80' },
  { id: 'p8', name: 'شوكولاتة داماك بالفستق الفاخر 80 غ', price: 65.00, category_id: '4', image_url: null },
  { id: 'p9', name: 'مسحوق غسيل أوتوماتيك 3 كغ', price: 160.00, category_id: '5', image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&auto=format&fit=crop&q=80', has_offer: true, offer_title: 'عرض توفير الغسيل' },
  { id: 'p10', name: 'سائل جلي صحون بريل 1 لتر', price: 48.00, category_id: '5', image_url: null }
];

function ProductsContent() {
  const { cart, addToCart, removeFromCart, totalQuantity, totalPrice } = useCart();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [usingMockData, setUsingMockData] = useState(false);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  // Sync category from URL param if changed
  useEffect(() => {
    const catFromUrl = searchParams.get('category');
    if (catFromUrl) {
      setSelectedCategory(catFromUrl);
    }
  }, [searchParams]);

  // Modal zoom handlers
  const openImagePreview = (url: string) => {
    setActivePreviewImage(url);
    window.history.pushState({ modal: 'product-preview' }, '');
  };

  const closeImagePreview = () => {
    setActivePreviewImage(null);
    if (typeof window !== 'undefined' && window.history.state?.modal === 'product-preview') {
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

        const res = await fetch('/api/store/products');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
          setProducts(data.products || []);
          setUsingMockData(false);
          return;
        }

        const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
        if (!isUrlConfigured) {
          throw new Error('Supabase not configured');
        }

        const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
        const { data: prodData } = await supabase.from('products').select('*').order('sort_order', { ascending: true });

        setCategories(catData || []);
        setProducts(prodData || []);
        setUsingMockData(false);
      } catch (err) {
        console.warn('Loading demonstration grocery catalog.', err);
        setCategories(MOCK_CATEGORIES);
        setProducts(MOCK_PRODUCTS);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter products by selected category and search query
  const filteredProducts = products.filter((product) => {
    if (product.is_hidden === true) return false;
    
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getProductQuantity = (productId: string) => {
    const cartItem = cart.find((item) => item.id === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans pb-24">
      {/* Top Banner for Demo Mode */}
      {usingMockData && (
        <div className="bg-amber-500 text-white px-4 py-1.5 text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shrink-0">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>وضع العرض التجريبي نشط (بيانات المنتجات التوضيحية).</span>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 bg-[#075E54] text-white px-4 py-3.5 shadow-md z-40 shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/" className="bg-[#128C7E] hover:bg-[#128C7E]/80 p-2 rounded-2xl text-white shadow-inner flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight truncate leading-tight">ماركت طيبة</h1>
              <p className="text-[10px] text-teal-100 font-medium truncate mt-0.5">كتالوج الأصناف والأسعار المباشرة</p>
            </div>
          </div>

          <Link
            href="/"
            className="bg-[#128C7E]/40 hover:bg-[#128C7E]/70 border border-[#128C7E]/40 rounded-xl px-2.5 py-1.5 text-[10px] text-teal-50 font-bold transition-all shrink-0 flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>العروض اليومية</span>
          </Link>
        </div>
      </header>

      {/* Sticky Filters & Search */}
      <section className="bg-white border-b border-slate-200 py-3 px-4 sticky top-[62px] z-30 shadow-xs">
        <div className="max-w-md mx-auto space-y-3">
          {/* Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="ابحث عن منتج أو صنف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none outline-none rounded-xl pr-9 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-slate-50 focus:ring-2 focus:ring-[#128C7E]/40 transition-all text-right font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Horizontal Slider */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 snap-x">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 snap-start ${
                selectedCategory === 'all'
                  ? 'bg-[#128C7E] text-white border-[#128C7E] shadow-xs'
                  : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
              }`}
            >
              الكل ({products.filter(p => !p.is_hidden).length})
            </button>
            {categories.map((category) => {
              const count = products.filter(p => p.category_id === category.id && !p.is_hidden).length;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 snap-start ${
                    selectedCategory === category.id
                      ? 'bg-[#128C7E] text-white border-[#128C7E] shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
                  }`}
                >
                  {category.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Products Catalog Area */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white p-3 rounded-3xl border border-slate-100 space-y-3 animate-pulse">
                  <div className="w-full aspect-square bg-slate-200 rounded-2xl" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (() => {
            const getGroupedProducts = () => {
              if (selectedCategory !== 'all') {
                const cat = categories.find(c => c.id === selectedCategory);
                const catProducts = filteredProducts.filter(p => p.category_id === selectedCategory);
                return cat ? [{ category: cat, products: catProducts }] : [];
              }
              
              return categories.map(cat => {
                const catProducts = filteredProducts.filter(p => p.category_id === cat.id);
                return { category: cat, products: catProducts };
              }).filter(group => group.products.length > 0);
            };

            const groupedCategories = getGroupedProducts();

            return groupedCategories.length > 0 ? (
              <div className="space-y-6">
                {groupedCategories.map(({ category, products: catProducts }) => (
                  <div key={category.id} className="space-y-3">
                    {/* Category section header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                      <div className="bg-[#128C7E]/10 p-1.5 rounded-xl text-[#128C7E] border border-[#128C7E]/10 shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-xs font-black text-slate-800 leading-tight">{category.name}</h2>
                        <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
                          {catProducts.length} {catProducts.length === 1 ? 'منتج واحد' : catProducts.length === 2 ? 'منتجين' : 'منتجات'}
                        </p>
                      </div>
                    </div>

                    {/* Product 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {catProducts.map((product) => {
                        const qty = getProductQuantity(product.id);
                        const offerActive = isOfferActive(product);
                        return (
                          <div
                            key={product.id}
                            className={`bg-white p-3 rounded-3xl border flex flex-col justify-between hover:shadow-xs transition-all duration-200 relative overflow-hidden ${
                              offerActive ? 'border-amber-300 ring-1 ring-amber-300/40' : 'border-slate-200/70'
                            }`}
                          >
                            {/* In-Stock Indicator dot */}
                            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 z-10 border border-white" title="متوفر" />

                            {/* Offer Badge Ribbon if active */}
                            {offerActive && (
                              <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[8.5px] font-black px-2 py-0.5 rounded-full z-10 shadow-2xs flex items-center gap-0.5">
                                <Gift className="w-2.5 h-2.5" />
                                <span>عرض خاص</span>
                              </div>
                            )}

                            {/* Product Image Wrapper */}
                            <div 
                              onClick={() => product.image_url && openImagePreview(product.image_url)}
                              className={`w-full aspect-square bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100 mb-2 relative shrink-0 group ${
                                product.image_url ? 'cursor-zoom-in' : 'select-none'
                              }`}
                            >
                              {product.image_url ? (
                                <>
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-200">
                                    <Maximize2 className="w-4 h-4 text-white filter drop-shadow-sm" />
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-350 space-y-1 select-none py-3">
                                  <ShoppingBag className="w-7 h-7 text-slate-300 stroke-[1.5]" />
                                  <span className="text-[8.5px] text-slate-400 font-bold">لا توجد صورة</span>
                                </div>
                              )}
                            </div>

                            {/* Info Area */}
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="text-xs font-bold text-slate-800 line-clamp-2 text-right mb-1 min-h-[30px] leading-tight">
                                  {product.name}
                                </h3>

                                {/* Offer Text Callout */}
                                {offerActive && (
                                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-1.5 mb-1.5 text-[9px] font-bold text-amber-900 text-right leading-tight flex items-start gap-1">
                                    <Tag className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <span>{product.offer_title}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Product Note Callout */}
                                {!offerActive && product.note && product.note.trim() && (
                                  <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-1.5 mb-1.5 text-[9px] font-medium text-slate-650 text-right leading-tight">
                                    <span>{product.note.trim()}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Price and Add Control */}
                              <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                                {/* Price Block */}
                                <div className="space-y-0.5">
                                  {product.price !== null && product.price !== undefined && Number(product.price) > 0 ? (
                                    <span className="text-xs font-black text-emerald-600 block leading-none">
                                      {Number(product.price).toFixed(2)} TL
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] font-extrabold text-amber-700 block leading-tight">
                                      تواصل للسعر
                                    </span>
                                  )}
                                </div>
                                
                                {/* Pill Controller */}
                                <div className="flex items-center bg-slate-50 border border-slate-200/50 rounded-full p-0.5 shadow-3xs">
                                  <button
                                    onClick={() => qty > 0 && removeFromCart(product.id)}
                                    disabled={qty === 0}
                                    className={`p-1 rounded-full transition-all shrink-0 select-none ${
                                      qty > 0 
                                        ? 'bg-white hover:bg-slate-100 text-slate-700 active:scale-90 shadow-3xs' 
                                        : 'bg-transparent text-slate-300 cursor-not-allowed'
                                    }`}
                                  >
                                    <Minus className="w-3 h-3 stroke-[2.5]" />
                                  </button>
                                  <span className={`w-4 text-center text-[10px] font-black select-none ${
                                    qty > 0 ? 'text-teal-900 font-black' : 'text-slate-400'
                                  }`}>
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => addToCart({
                                      id: product.id,
                                      name: product.name,
                                      price: product.price,
                                      image_url: product.image_url,
                                      applied_offer: offerActive ? product.offer_title : null
                                    })}
                                    className="bg-[#25D366] hover:bg-[#20ba59] text-white p-1 rounded-full transition-all active:scale-90 shrink-0 select-none shadow-3xs"
                                  >
                                    <Plus className="w-3 h-3 stroke-[2.5]" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-100 space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-xs font-bold text-slate-600">لم نجد أي منتجات تطابق بحثك</h3>
                <p className="text-[11px] text-slate-400">تأكد من كتابة الاسم بشكل صحيح أو تصفح الأقسام الأخرى.</p>
              </div>
            );
          })() : (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-100 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-xs font-bold text-slate-600">لم نجد أي منتجات تطابق بحثك</h3>
              <p className="text-[11px] text-slate-400">تأكد من كتابة الاسم بشكل صحيح أو تصفح الأقسام الأخرى.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-[#075E54] font-bold text-xs">
        جاري تحميل الكتالوج...
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
