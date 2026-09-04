'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ShoppingBag, Loader2, Image as ImageIcon, Upload, AlertCircle, RefreshCw, GripVertical, Eye, EyeOff, X, Pencil, Search, Tag, Gift, Clock, PackageCheck, AlertTriangle, FileText, Scale, Maximize2, Minimize2 } from 'lucide-react';

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
  sort_order?: number;
  is_hidden?: boolean;
  unit_type?: 'piece' | 'kg' | 'gram' | 'liter' | 'custom' | string;
  unit_label?: string;
  min_quantity?: number;
  step_quantity?: number;
  pricing_unit_step?: number;
  has_offer?: boolean;
  offer_title?: string | null;
  offer_type?: 'unlimited' | 'date_limited' | 'stock_limited';
  offer_end_date?: string | null;
  offer_max_quantity?: number | null;
  offer_used_quantity?: number;
  note?: string | null;
  categories?: {
    name: string;
  } | null;
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


const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'خضار وفواكه طازجة', sort_order: 0 },
  { id: '2', name: 'بهارات ومكسرات', sort_order: 1 },
  { id: '3', name: 'بسكويت وحلويات', sort_order: 2 },
  { id: '4', name: 'مشروبات وغازيات', sort_order: 3 },
  { id: '5', name: 'معلبات وأغذية مجففة', sort_order: 4 }
];

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'طماطم بلدية طازجة', price: 25.00, category_id: '1', image_url: null, unit_type: 'kg', unit_label: 'كغ', min_quantity: 0.5, step_quantity: 0.5, pricing_unit_step: 1, categories: { name: 'خضار وفواكه طازجة' } },
  { id: 'p2', name: 'خيار بلدي نخب أول', price: 30.00, category_id: '1', image_url: null, unit_type: 'kg', unit_label: 'كغ', min_quantity: 0.5, step_quantity: 0.5, pricing_unit_step: 1, categories: { name: 'خضار وفواكه طازجة' } },
  { id: 'p3', name: 'فلفل أسود حب فاخر', price: 20.00, category_id: '2', image_url: null, unit_type: 'gram', unit_label: 'غرام', min_quantity: 50, step_quantity: 50, pricing_unit_step: 50, categories: { name: 'بهارات ومكسرات' } },
  { id: 'p4', name: 'كمون مطحون نقي', price: 15.00, category_id: '2', image_url: null, unit_type: 'gram', unit_label: 'غرام', min_quantity: 100, step_quantity: 100, pricing_unit_step: 100, categories: { name: 'بهارات ومكسرات' } },
  { id: 'p5', name: 'بسكويت شوكولاتة أولكر 12 قطعة', price: 45.00, category_id: '3', image_url: null, unit_type: 'piece', unit_label: 'صندوق', min_quantity: 1, step_quantity: 1, pricing_unit_step: 1, categories: { name: 'بسكويت وحلويات' } },
  { id: 'p6', name: 'شاي تركي غوكسو 100 ظرف', price: 85.00, category_id: '4', image_url: null, unit_type: 'piece', unit_label: 'علبة', min_quantity: 1, step_quantity: 1, pricing_unit_step: 1, categories: { name: 'مشروبات وغازيات' } }
];

const compressImage = (file: File, maxWidth = 800): Promise<Blob | File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const draw = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if larger than maxWidth
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // Fill canvas background with white (prevents transparent PNGs from rendering with black backgrounds in JPEG)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const uniqueSafeName = `product_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
                const compressedFile = new File([blob], uniqueSafeName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.75 // 75% quality is perfect for web speed
          );
        };

        // Ensure the image is fully decoded before drawing to canvas to prevent blank/black image issues
        if ('decode' in img) {
          img.decode()
            .then(draw)
            .catch((err) => {
              console.warn('Image decode failed, drawing immediately:', err);
              draw();
            });
        } else {
          draw();
        }
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form fields - Special Offer
  const [hasOffer, setHasOffer] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerType, setOfferType] = useState<'unlimited' | 'date_limited' | 'stock_limited'>('unlimited');
  const [offerEndDate, setOfferEndDate] = useState('');
  const [offerMaxQuantity, setOfferMaxQuantity] = useState('');

  // Form fields - Unit & Weight
  const [unitType, setUnitType] = useState<'piece' | 'kg' | 'gram' | 'liter' | 'custom'>('piece');
  const [unitLabel, setUnitLabel] = useState('قطعة');
  const [minQuantity, setMinQuantity] = useState('1');
  const [stepQuantity, setStepQuantity] = useState('1');
  const [pricingUnitStep, setPricingUnitStep] = useState('1');

  // Form fields - Product Note
  const [hasNote, setHasNote] = useState(false);
  const [note, setNote] = useState('');

  // Edit product states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditFullscreen, setIsEditFullscreen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageAction, setEditImageAction] = useState<'keep' | 'new' | 'remove'>('keep');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Edit product states - Special Offer
  const [editHasOffer, setEditHasOffer] = useState(false);
  const [editOfferTitle, setEditOfferTitle] = useState('');
  const [editOfferType, setEditOfferType] = useState<'unlimited' | 'date_limited' | 'stock_limited'>('unlimited');
  const [editOfferEndDate, setEditOfferEndDate] = useState('');
  const [editOfferMaxQuantity, setEditOfferMaxQuantity] = useState('');
  const [editOfferUsedQuantity, setEditOfferUsedQuantity] = useState(0);

  // Edit product states - Unit & Weight
  const [editUnitType, setEditUnitType] = useState<'piece' | 'kg' | 'gram' | 'liter' | 'custom'>('piece');
  const [editUnitLabel, setEditUnitLabel] = useState('قطعة');
  const [editMinQuantity, setEditMinQuantity] = useState('1');
  const [editStepQuantity, setEditStepQuantity] = useState('1');
  const [editPricingUnitStep, setEditPricingUnitStep] = useState('1');

  // Preset Handlers
  const applyAddUnitPreset = (presetKey: string) => {
    if (presetKey === 'piece') {
      setUnitType('piece');
      setUnitLabel('قطعة');
      setMinQuantity('1');
      setStepQuantity('1');
      setPricingUnitStep('1');
    } else if (presetKey === 'kg_half') {
      setUnitType('kg');
      setUnitLabel('كغ');
      setMinQuantity('0.5');
      setStepQuantity('0.5');
      setPricingUnitStep('1');
    } else if (presetKey === 'kg_full') {
      setUnitType('kg');
      setUnitLabel('كغ');
      setMinQuantity('1');
      setStepQuantity('1');
      setPricingUnitStep('1');
    } else if (presetKey === 'gram_100') {
      setUnitType('gram');
      setUnitLabel('غرام');
      setMinQuantity('100');
      setStepQuantity('100');
      setPricingUnitStep('100');
    } else if (presetKey === 'gram_50') {
      setUnitType('gram');
      setUnitLabel('غرام');
      setMinQuantity('50');
      setStepQuantity('50');
      setPricingUnitStep('50');
    } else if (presetKey === 'custom') {
      setUnitType('custom');
    }
  };

  const applyEditUnitPreset = (presetKey: string) => {
    if (presetKey === 'piece') {
      setEditUnitType('piece');
      setEditUnitLabel('قطعة');
      setEditMinQuantity('1');
      setEditStepQuantity('1');
      setEditPricingUnitStep('1');
    } else if (presetKey === 'kg_half') {
      setEditUnitType('kg');
      setEditUnitLabel('كغ');
      setEditMinQuantity('0.5');
      setEditStepQuantity('0.5');
      setEditPricingUnitStep('1');
    } else if (presetKey === 'kg_full') {
      setEditUnitType('kg');
      setEditUnitLabel('كغ');
      setEditMinQuantity('1');
      setEditStepQuantity('1');
      setEditPricingUnitStep('1');
    } else if (presetKey === 'gram_100') {
      setEditUnitType('gram');
      setEditUnitLabel('غرام');
      setEditMinQuantity('100');
      setEditStepQuantity('100');
      setEditPricingUnitStep('100');
    } else if (presetKey === 'gram_50') {
      setEditUnitType('gram');
      setEditUnitLabel('غرام');
      setEditMinQuantity('50');
      setEditStepQuantity('50');
      setEditPricingUnitStep('50');
    } else if (presetKey === 'custom') {
      setEditUnitType('custom');
    }
  };

  // Edit product states - Product Note
  const [editHasNote, setEditHasNote] = useState(false);
  const [editNote, setEditNote] = useState('');


  // Status
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Drag and drop states
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sales history states
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const filteredDisplayProducts = products.filter((p) => {
    const matchesCategory = selectedFilterCategory === 'all' || p.category_id === selectedFilterCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      if (!isUrlConfigured) {
        throw new Error('Supabase environment variables not configured');
      }

      // Fetch Categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (catError) throw catError;
      setCategories(catData || []);

      // Fetch Products with joined Category Name sorted by sort_order
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (prodError) throw prodError;

      const typedProducts: Product[] = (prodData || []).map((prod: any) => ({
        ...prod,
        categories: prod.categories ? { name: prod.categories.name } : null
      }));

      setProducts(typedProducts);
      setUsingMockData(false);
    } catch (err) {
      console.warn('Could not fetch data from database. Loading preview mode.', err);
      setCategories(MOCK_CATEGORIES);
      setProducts(MOCK_PRODUCTS);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop Handlers for product sorting
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggingId) {
      setDragOverId(id);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) return;

    // Filtered list we are currently looking at
    const displayList = [...filteredDisplayProducts];

    const draggingIndex = displayList.findIndex(p => p.id === draggingId);
    const targetIndex = displayList.findIndex(p => p.id === targetId);

    if (draggingIndex === -1 || targetIndex === -1) return;

    // Reorder inside the active display list
    const [removed] = displayList.splice(draggingIndex, 1);
    displayList.splice(targetIndex, 0, removed);

    // Assign new sequential sort_orders for items inside this category
    const updatedDisplayList = displayList.map((prod, idx) => ({
      ...prod,
      sort_order: idx
    }));

    // Merge updates back into the main products list preserving other categories' positions
    let displayListIdx = 0;
    const updatedProducts = products.map((prod) => {
      if (selectedFilterCategory === 'all' || prod.category_id === selectedFilterCategory) {
        return updatedDisplayList[displayListIdx++];
      }
      return prod;
    });

    setProducts(updatedProducts);
    setDraggingId(null);
    setDragOverId(null);

    setSavingOrder(true);
    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      
      if (isUrlConfigured) {
        // Upsert only the updated category items in database
        const updates = updatedDisplayList.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          category_id: p.category_id,
          image_url: p.image_url,
          sort_order: p.sort_order
        }));

        const { error } = await supabase
          .from('products')
          .upsert(updates);

        if (error) throw error;
      } else {
        console.log('Database not connected. Saved custom sort order locally.');
      }
    } catch (err) {
      console.error('Failed to save drag-and-drop sort order:', err);
      alert('حدث خطأ أثناء حفظ الترتيب الجديد في قاعدة البيانات.');
    } finally {
      setSavingOrder(false);
    }
  };

  const fetchSalesHistory = async (productId: string, productName: string) => {
    try {
      setLoadingHistory(true);
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      
      if (isUrlConfigured) {
        const { data, error } = await supabase
          .from('order_items')
          .select(`
            quantity,
            price_at_purchase,
            product_name,
            orders (
              id,
              customer_name,
              created_at,
              status
            )
          `)
          .or(`product_id.eq.${productId},product_name.eq.${productName}`);
        
        if (error) throw error;
        
        const formatted = (data || [])
          .filter((item: any) => item.orders)
          .map((item: any) => ({
            customer_name: item.orders.customer_name,
            created_at: item.orders.created_at,
            quantity: item.quantity,
            price_at_purchase: item.price_at_purchase || 0,
            status: item.orders.status,
            order_id: item.orders.id
          }))
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
        setSalesHistory(formatted);
      } else {
        const todayStr = new Date().toISOString();
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString();
        const twoDaysAgoStr = new Date(Date.now() - 172800000).toISOString();
        
        const mockSales: Record<string, any[]> = {
          'p1': [
            { customer_name: 'سوبر ماركت الياسمين', created_at: todayStr, quantity: 5, price_at_purchase: 45.00, status: 'pending', order_id: 'm-ord1' },
            { customer_name: 'بقالة النور', created_at: yesterdayStr, quantity: 10, price_at_purchase: 45.00, status: 'delivered', order_id: 'm-ord2' },
            { customer_name: 'سوبر ماركت الياسمين', created_at: twoDaysAgoStr, quantity: 3, price_at_purchase: 40.00, status: 'delivered', order_id: 'prev-ord1' }
          ],
          'p3': [
            { customer_name: 'بقالة النور', created_at: todayStr, quantity: 2, price_at_purchase: 85.00, status: 'pending', order_id: 'm-ord2' },
            { customer_name: 'محلات الأمل (مؤجلة)', created_at: yesterdayStr, quantity: 4, price_at_purchase: 85.00, status: 'postponed', order_id: 'm-ord3' },
            { customer_name: 'بقالة النور', created_at: twoDaysAgoStr, quantity: 1, price_at_purchase: 80.00, status: 'delivered', order_id: 'prev-ord2' }
          ]
        };
        
        setSalesHistory(mockSales[productId] || [
          { customer_name: 'سوبر ماركت الياسمين', created_at: todayStr, quantity: 2, price_at_purchase: 50.00, status: 'delivered', order_id: 'mock-sample-1' },
          { customer_name: 'أسواق أورفا الغذائية', created_at: yesterdayStr, quantity: 5, price_at_purchase: 48.00, status: 'delivered', order_id: 'mock-sample-2' }
        ]);
      }
    } catch (err: any) {
      console.error('Error fetching sales history:', err);
      alert('حدث خطأ أثناء تحميل سجل مبيعات المنتج.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMsg(''); // Clear any previous error messages
    
    if (file) {
      // 1. Validate file size (e.g. 3MB limit)
      const maxSizeBytes = 3 * 1024 * 1024; // 3MB
      if (file.size > maxSizeBytes) {
        alert("حجم الصورة كبير جداً! الحد الأقصى المسموح به هو 3 ميجابايت لضمان سرعة تحميل صفحة المتجر للزبائن. يرجى اختيار صورة أصغر أو مضغوطة.");
        setErrorMsg("حجم الصورة المحدد أكبر من 3 ميجابايت. يرجى استخدام صورة أصغر.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        setImageFile(null);
        setImagePreview(null);
        return;
      }

      // 2. Validate file type (especially for HEIC / HEIF raw formats on iPhone/Android)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(file.type) || fileExtension === 'heic' || fileExtension === 'heif') {
        alert("صيغة الصورة غير مدعومة! يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP. (صيغ الكاميرا الخام مثل HEIC / HEIF غير مدعومة مباشرة في متصفحات الويب).");
        setErrorMsg("صيغة الصورة غير مدعومة. يرجى استخدام صيغة متوافقة مع الويب (JPG, PNG, WEBP).");
        if (fileInputRef.current) fileInputRef.current.value = '';
        setImageFile(null);
        setImagePreview(null);
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

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setEditErrorMsg('');
    
    if (file) {
      const maxSizeBytes = 3 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert("حجم الصورة كبير جداً! الحد الأقصى المسموح به هو 3 ميجابايت لضمان سرعة تحميل صفحة المتجر للزبائن. يرجى اختيار صورة أصغر أو مضغوطة.");
        setEditErrorMsg("حجم الصورة المحدد أكبر من 3 ميجابايت. يرجى استخدام صورة أصغر.");
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(file.type) || fileExtension === 'heic' || fileExtension === 'heif') {
        alert("صيغة الصورة غير مدعومة! يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP. (صيغ الكاميرا الخام مثل HEIC / HEIF غير مدعومة مباشرة في متصفحات الويب).");
        setEditErrorMsg("صيغة الصورة غير مدعومة. يرجى استخدام صيغة متوافقة مع الويب (JPG, PNG, WEBP).");
        return;
      }

      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCloseEdit = () => {
    setEditingProduct(null);
    setIsEditFullscreen(false);
    setEditName('');
    setEditPrice('');
    setEditCategoryId('');
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditImageAction('keep');
    setEditErrorMsg('');
    setEditHasOffer(false);
    setEditOfferTitle('');
    setEditOfferType('unlimited');
    setEditOfferEndDate('');
    setEditOfferMaxQuantity('');
    setEditOfferUsedQuantity(0);
    setEditUnitType('piece');
    setEditUnitLabel('قطعة');
    setEditMinQuantity('1');
    setEditStepQuantity('1');
    setEditPricingUnitStep('1');
  };

  // Keyboard shortcut (Escape) and prevent background scrolling while edit modal is open
  useEffect(() => {
    if (!editingProduct) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [editingProduct]);

  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditFullscreen(false);
    setEditName(product.name);
    setEditPrice(product.price !== null && product.price !== undefined ? product.price.toString() : '');
    setEditCategoryId(product.category_id);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditImageAction(product.image_url ? 'keep' : 'new');
    setEditErrorMsg('');

    // Set special offer edit state
    setEditHasOffer(product.has_offer || false);
    setEditOfferTitle(product.offer_title || '');
    setEditOfferType(product.offer_type || 'unlimited');
    
    let formattedEndDate = '';
    if (product.offer_end_date) {
      try {
        const d = new Date(product.offer_end_date);
        // Format to YYYY-MM-DDTHH:mm for datetime-local input
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        formattedEndDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      } catch (e) {
        console.warn('Could not format offer_end_date', e);
      }
    }
    setEditOfferEndDate(formattedEndDate);
    setEditOfferMaxQuantity(product.offer_max_quantity !== null && product.offer_max_quantity !== undefined ? product.offer_max_quantity.toString() : '');
    setEditOfferUsedQuantity(product.offer_used_quantity || 0);

    // Set unit & weight edit state
    setEditUnitType((product.unit_type as any) || 'piece');
    setEditUnitLabel(product.unit_label || 'قطعة');
    setEditMinQuantity(product.min_quantity !== null && product.min_quantity !== undefined ? product.min_quantity.toString() : '1');
    setEditStepQuantity(product.step_quantity !== null && product.step_quantity !== undefined ? product.step_quantity.toString() : '1');
    setEditPricingUnitStep(product.pricing_unit_step !== null && product.pricing_unit_step !== undefined ? product.pricing_unit_step.toString() : '1');

    // Set product note edit state
    const hasActiveNote = !product.has_offer && !!product.note && !!product.note.trim();
    setEditHasNote(hasActiveNote);
    setEditNote(product.note || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim() || !editCategoryId) return;

    setEditErrorMsg('');
    setSubmitting(true);

    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      let finalImageUrl = editingProduct.image_url;

      if (isUrlConfigured) {
        if (editImageAction === 'remove') {
          if (editingProduct.image_url) {
            try {
              const fileName = editingProduct.image_url.split('/').pop();
              if (fileName) {
                await supabase.storage.from('product-images').remove([fileName]);
              }
            } catch (storageErr) {
              console.warn('Could not delete product image from storage bucket:', storageErr);
            }
          }
          finalImageUrl = null;
        } else if (editImageAction === 'new' && editImageFile) {
          const safeUniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          let fileToUpload: File | Blob = editImageFile;
          let fileName = `product_${safeUniqueId}.jpg`;

          try {
            const compressed = await compressImage(editImageFile);
            fileToUpload = compressed;
            fileName = `product_${safeUniqueId}.jpg`;
          } catch (compressErr) {
            console.warn('Image compression failed, uploading original image:', compressErr);
            const rawExt = editImageFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
            const ext = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(rawExt) ? rawExt : 'jpg';
            fileName = `product_${safeUniqueId}.${ext}`;
          }

          const filePath = `${fileName}`;

          if (editingProduct.image_url) {
            try {
              const oldFileName = editingProduct.image_url.split('/').pop();
              if (oldFileName) {
                await supabase.storage.from('product-images').remove([oldFileName]);
              }
            } catch (storageErr) {
              console.warn('Could not delete old product image from storage bucket:', storageErr);
            }
          }

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, fileToUpload, {
              cacheControl: '31536000',
              upsert: true
            });

          if (uploadError) {
            console.error('Image upload failed:', uploadError);
            throw new Error(`فشل رفع الصورة إلى السحابة: ${uploadError.message}. يرجى محاولة استخدام صورة أخرى أو بحجم أصغر.`);
          }

          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          
          finalImageUrl = data.publicUrl;
        }

        const parsedPrice = editPrice.trim() ? parseFloat(editPrice) : null;
        const noteValue = !editHasOffer && editHasNote && editNote.trim() ? editNote.trim() : null;
        const offerPayload = {
          has_offer: editHasOffer,
          offer_title: editHasOffer && editOfferTitle.trim() ? editOfferTitle.trim() : null,
          offer_type: editHasOffer ? editOfferType : 'unlimited',
          offer_end_date: editHasOffer && editOfferType === 'date_limited' && editOfferEndDate ? new Date(editOfferEndDate).toISOString() : null,
          offer_max_quantity: editHasOffer && editOfferType === 'stock_limited' && editOfferMaxQuantity ? parseInt(editOfferMaxQuantity, 10) : null,
          offer_used_quantity: editHasOffer && editOfferType === 'stock_limited' ? editOfferUsedQuantity : 0,
          note: noteValue
        };

        const parsedEditMin = editMinQuantity ? parseFloat(editMinQuantity) : 1;
        const parsedEditStep = editStepQuantity ? parseFloat(editStepQuantity) : 1;
        const parsedEditPricing = editPricingUnitStep ? parseFloat(editPricingUnitStep) : 1;
        const unitPayload = {
          unit_type: editUnitType || 'piece',
          unit_label: editUnitLabel.trim() || 'قطعة',
          min_quantity: parsedEditMin > 0 ? parsedEditMin : 1,
          step_quantity: parsedEditStep > 0 ? parsedEditStep : 1,
          pricing_unit_step: parsedEditPricing > 0 ? parsedEditPricing : 1
        };

        const { data: updatedProd, error: updateError } = await supabase
          .from('products')
          .update({
            name: editName.trim(),
            price: parsedPrice,
            category_id: editCategoryId,
            image_url: finalImageUrl,
            ...offerPayload,
            ...unitPayload
          })
          .eq('id', editingProduct.id)
          .select('*, categories(name)')
          .single();

        if (updateError) throw updateError;

        const typedProd: Product = {
          ...updatedProd,
          categories: updatedProd.categories ? { name: updatedProd.categories.name } : null
        };

        setProducts((prev) =>
          prev.map((prod) => (prod.id === editingProduct.id ? typedProd : prod))
        );
      } else {
        const matchingCat = categories.find(c => c.id === editCategoryId);
        const noteValue = !editHasOffer && editHasNote && editNote.trim() ? editNote.trim() : null;
        const parsedEditMin = editMinQuantity ? parseFloat(editMinQuantity) : 1;
        const parsedEditStep = editStepQuantity ? parseFloat(editStepQuantity) : 1;
        const parsedEditPricing = editPricingUnitStep ? parseFloat(editPricingUnitStep) : 1;

        const mockUpdatedProd: Product = {
          ...editingProduct,
          name: editName.trim(),
          price: editPrice.trim() ? parseFloat(editPrice) : null,
          category_id: editCategoryId,
          image_url: editImageAction === 'remove' ? null : (editImageAction === 'new' ? editImagePreview : editingProduct.image_url),
          has_offer: editHasOffer,
          offer_title: editHasOffer && editOfferTitle.trim() ? editOfferTitle.trim() : null,
          offer_type: editHasOffer ? editOfferType : 'unlimited',
          offer_end_date: editHasOffer && editOfferType === 'date_limited' && editOfferEndDate ? new Date(editOfferEndDate).toISOString() : null,
          offer_max_quantity: editHasOffer && editOfferType === 'stock_limited' && editOfferMaxQuantity ? parseInt(editOfferMaxQuantity, 10) : null,
          offer_used_quantity: editHasOffer && editOfferType === 'stock_limited' ? editOfferUsedQuantity : 0,
          note: noteValue,
          unit_type: editUnitType || 'piece',
          unit_label: editUnitLabel.trim() || 'قطعة',
          min_quantity: parsedEditMin > 0 ? parsedEditMin : 1,
          step_quantity: parsedEditStep > 0 ? parsedEditStep : 1,
          pricing_unit_step: parsedEditPricing > 0 ? parsedEditPricing : 1,
          categories: matchingCat ? { name: matchingCat.name } : null
        };

        setProducts((prev) =>
          prev.map((prod) => (prod.id === editingProduct.id ? mockUpdatedProd : prod))
        );
      }

      handleCloseEdit();
    } catch (err: any) {
      console.error(err);
      setEditErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء تعديل المنتج.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;

    setErrorMsg('');
    setSubmitting(true);

    try {
      let finalImageUrl: string | null = null;
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isUrlConfigured) {
        // 1. Upload image to Storage if exists
        if (imageFile) {
          // Compress image client-side first
          const safeUniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          let fileToUpload: File | Blob = imageFile;
          let fileName = `product_${safeUniqueId}.jpg`;

          try {
            const compressed = await compressImage(imageFile);
            fileToUpload = compressed;
            fileName = `product_${safeUniqueId}.jpg`;
          } catch (compressErr) {
            console.warn('Image compression failed, uploading original image:', compressErr);
            const rawExt = imageFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
            const ext = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(rawExt) ? rawExt : 'jpg';
            fileName = `product_${safeUniqueId}.${ext}`;
          }

          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, fileToUpload, {
              cacheControl: '31536000',
              upsert: true
            });

          if (uploadError) {
            console.error('Image upload failed:', uploadError);
            throw new Error(`فشل رفع الصورة إلى السحابة: ${uploadError.message}. يرجى محاولة استخدام صورة أخرى أو بحجم أصغر.`);
          } else {
            const { data } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);
            
            finalImageUrl = data.publicUrl;
          }
        }

        // 2. Insert product row in DB
        const parsedPrice = price.trim() ? parseFloat(price) : null;
        const noteValue = !hasOffer && hasNote && note.trim() ? note.trim() : null;
        const offerPayload = {
          has_offer: hasOffer,
          offer_title: hasOffer && offerTitle.trim() ? offerTitle.trim() : null,
          offer_type: hasOffer ? offerType : 'unlimited',
          offer_end_date: hasOffer && offerType === 'date_limited' && offerEndDate ? new Date(offerEndDate).toISOString() : null,
          offer_max_quantity: hasOffer && offerType === 'stock_limited' && offerMaxQuantity ? parseInt(offerMaxQuantity, 10) : null,
          offer_used_quantity: 0,
          note: noteValue
        };

        const parsedMin = minQuantity ? parseFloat(minQuantity) : 1;
        const parsedStep = stepQuantity ? parseFloat(stepQuantity) : 1;
        const parsedPricing = pricingUnitStep ? parseFloat(pricingUnitStep) : 1;
        const unitPayload = {
          unit_type: unitType || 'piece',
          unit_label: unitLabel.trim() || 'قطعة',
          min_quantity: parsedMin > 0 ? parsedMin : 1,
          step_quantity: parsedStep > 0 ? parsedStep : 1,
          pricing_unit_step: parsedPricing > 0 ? parsedPricing : 1
        };

        const { data: newProd, error: insertError } = await supabase
          .from('products')
          .insert({
            name: name.trim(),
            price: parsedPrice,
            category_id: categoryId,
            image_url: finalImageUrl,
            ...offerPayload,
            ...unitPayload
          })
          .select('*, categories(name)')
          .single();

        if (insertError) throw insertError;

        const typedProd: Product = {
          ...newProd,
          categories: newProd.categories ? { name: newProd.categories.name } : null
        };

        setProducts((prev) => [typedProd, ...prev]);
      } else {
        // Mock add
        const matchingCat = categories.find(c => c.id === categoryId);
        const noteValue = !hasOffer && hasNote && note.trim() ? note.trim() : null;
        const parsedMin = minQuantity ? parseFloat(minQuantity) : 1;
        const parsedStep = stepQuantity ? parseFloat(stepQuantity) : 1;
        const parsedPricing = pricingUnitStep ? parseFloat(pricingUnitStep) : 1;

        const mockNewProd: Product = {
          id: Math.random().toString(),
          name: name.trim(),
          price: price.trim() ? parseFloat(price) : null,
          category_id: categoryId,
          image_url: imagePreview,
          has_offer: hasOffer,
          offer_title: hasOffer && offerTitle.trim() ? offerTitle.trim() : null,
          offer_type: hasOffer ? offerType : 'unlimited',
          offer_end_date: hasOffer && offerType === 'date_limited' && offerEndDate ? new Date(offerEndDate).toISOString() : null,
          offer_max_quantity: hasOffer && offerType === 'stock_limited' && offerMaxQuantity ? parseInt(offerMaxQuantity, 10) : null,
          offer_used_quantity: 0,
          note: noteValue,
          unit_type: unitType || 'piece',
          unit_label: unitLabel.trim() || 'قطعة',
          min_quantity: parsedMin > 0 ? parsedMin : 1,
          step_quantity: parsedStep > 0 ? parsedStep : 1,
          pricing_unit_step: parsedPricing > 0 ? parsedPricing : 1,
          categories: matchingCat ? { name: matchingCat.name } : null
        };
        setProducts((prev) => [mockNewProd, ...prev]);
      }

      // Reset form
      setName('');
      setPrice('');
      setCategoryId('');
      setImageFile(null);
      setImagePreview(null);
      setHasOffer(false);
      setOfferTitle('');
      setOfferType('unlimited');
      setOfferEndDate('');
      setOfferMaxQuantity('');
      setHasNote(false);
      setNote('');
      setUnitType('piece');
      setUnitLabel('قطعة');
      setMinQuantity('1');
      setStepQuantity('1');
      setPricingUnitStep('1');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء إضافة المنتج.');
    } finally {
      setSubmitting(false);
    }
  };


  const handleDeleteProduct = async (id: string, name: string, imageUrl: string | null) => {
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف المنتج "${name}"؟`);
    if (!confirmDelete) return;

    setErrorMsg('');
    setDeletingId(id);

    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isUrlConfigured) {
        // Optionally delete image from storage
        if (imageUrl) {
          try {
            const fileName = imageUrl.split('/').pop();
            if (fileName) {
              await supabase.storage.from('product-images').remove([fileName]);
            }
          } catch (storageErr) {
            console.warn('Could not delete product image from storage bucket:', storageErr);
          }
        }

        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      // Remove from state
      setProducts((prev) => prev.filter((prod) => prod.id !== id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حذف المنتج.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleVisibility = async (id: string, currentHidden: boolean) => {
    setErrorMsg('');
    setTogglingId(id);

    try {
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      const newHiddenState = !currentHidden;

      if (isUrlConfigured) {
        const { error } = await supabase
          .from('products')
          .update({ is_hidden: newHiddenState })
          .eq('id', id);

        if (error) throw error;
      }

      // Update state
      setProducts((prev) =>
        prev.map((prod) =>
          prod.id === id ? { ...prod, is_hidden: newHiddenState } : prod
        )
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تعديل ظهور المنتج.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning */}
      {usingMockData && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
          <span>وضع العرض التجريبي نشط. لإمكانية تخزين الصور حياً يرجى إعداد Supabase Storage ودلو `product-images`.</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">إدارة المنتجات</h1>
          <p className="text-xs text-slate-500 mt-1">تعديل وإضافة السلع الغذائية وتحديد أسعارها بالليرة التركية وتحميل صورها مباشرة</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer shadow-sm"
          title="تحديث البيانات"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Create Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">إضافة منتج جديد</h2>
          </div>

          <form onSubmit={handleAddProduct} className="space-y-4">
            {/* Product Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600">اسم المنتج</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم السلعة (مثال: قهوة تركي 250 غ)"
                className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right"
                disabled={submitting}
              />
            </div>

            {/* Product Price */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600">
                السعر (بالليرة التركية TL) <span className="text-slate-400 font-normal">(اختياري - يترك فارغاً للسعر عند الطلب)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="يحدد عند الطلب"
                className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right"
                disabled={submitting}
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600">قسم تصنيف المنتج</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl px-4 py-3 text-sm text-slate-850 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right cursor-pointer"
                disabled={submitting}
              >
                <option value="" disabled className="text-slate-400">اختر القسم المناسب...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="text-slate-800 bg-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600">صورة المنتج</label>
              <div 
                className="w-full bg-slate-50 border border-dashed border-slate-200 hover:border-slate-350 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-32 relative overflow-hidden"
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20 disabled:cursor-not-allowed"
                  disabled={submitting}
                />
                
                {imagePreview ? (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-white">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity gap-1.5 text-xs font-bold">
                      <Upload className="w-4 h-4" />
                      <span>تغيير الصورة</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">انقر لتحميل صورة المنتج</span>
                    <span className="text-[10px] text-slate-400">صيغ JPG, PNG (حد أقصى 2 ميجا)</span>
                  </>
                )}
              </div>
            </div>

            {/* Unit & Weight Measurement Settings Card */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 space-y-3 text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>نظام البيع والقياس (الأوزان والوحدات)</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-lg">
                  {unitLabel || 'قطعة'}
                </span>
              </div>

              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                حدد كيف يباع هذا المنتج (بالكيلو، نصف كيلو، غرام، قطعة):
              </p>

              {/* Quick Presets Grid */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => applyAddUnitPreset('piece')}
                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                    unitType === 'piece'
                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-[11px]">📦 بالقطعة / صندوق</div>
                  <div className={`text-[9px] ${unitType === 'piece' ? 'text-emerald-100' : 'text-slate-400'}`}>زيادة 1 قطعة</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyAddUnitPreset('kg_half')}
                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                    unitType === 'kg' && stepQuantity === '0.5'
                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-[11px]">🥦 خضار (نصف كغ)</div>
                  <div className={`text-[9px] ${unitType === 'kg' && stepQuantity === '0.5' ? 'text-emerald-100' : 'text-slate-400'}`}>خطوة +0.5 كغ</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyAddUnitPreset('kg_full')}
                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                    unitType === 'kg' && stepQuantity === '1'
                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-[11px]">⚖️ خضار (1 كغ)</div>
                  <div className={`text-[9px] ${unitType === 'kg' && stepQuantity === '1' ? 'text-emerald-100' : 'text-slate-400'}`}>خطوة +1 كغ</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyAddUnitPreset('gram_100')}
                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                    unitType === 'gram' && stepQuantity === '100'
                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-[11px]">🌿 بهارات (100 غرام)</div>
                  <div className={`text-[9px] ${unitType === 'gram' && stepQuantity === '100' ? 'text-emerald-100' : 'text-slate-400'}`}>خطوة 100 غ</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyAddUnitPreset('gram_50')}
                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                    unitType === 'gram' && stepQuantity === '50'
                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-[11px]">🌶️ بهارات خفيفة (50 غ)</div>
                  <div className={`text-[9px] ${unitType === 'gram' && stepQuantity === '50' ? 'text-emerald-100' : 'text-slate-400'}`}>خطوة 50 غ</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyAddUnitPreset('custom')}
                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                    unitType === 'custom'
                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-[11px]">⚙️ تخصيص يدوي</div>
                  <div className={`text-[9px] ${unitType === 'custom' ? 'text-emerald-100' : 'text-slate-400'}`}>تحديد القيم يدوياً</div>
                </button>
              </div>

              {/* Detailed / Custom inputs */}
              <div className="pt-2 border-t border-emerald-200/60 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">اسم الوحدة المعروضة</label>
                    <input
                      type="text"
                      value={unitLabel}
                      onChange={(e) => setUnitLabel(e.target.value)}
                      placeholder="مثال: كغ / غرام / علبة"
                      className="w-full bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">الحد الأدنى للطلب</label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      placeholder="مثال: 0.5 أو 50"
                      className="w-full bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">مقدار الزيادة بالزر (+/-)</label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={stepQuantity}
                      onChange={(e) => setStepQuantity(e.target.value)}
                      placeholder="مثال: 0.5 أو 50"
                      className="w-full bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">السعر محسوب لكل كمية</label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={pricingUnitStep}
                      onChange={(e) => setPricingUnitStep(e.target.value)}
                      placeholder="1 للكيلو / 100 للغرام"
                      className="w-full bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Special Offer Card */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Gift className="w-4 h-4 text-amber-600" />
                  <span>إضافة عرض خاص للمنتج</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasOffer}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasOffer(checked);
                      if (checked) {
                        setHasNote(false);
                        setNote('');
                      }
                    }}
                    className="sr-only peer"
                    disabled={submitting}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {hasOffer && (
                <div className="space-y-3 pt-1 border-t border-amber-200/60 text-right">
                  {/* Offer Title Input */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">تفاصيل العرض المخصص</label>
                    <input
                      type="text"
                      required={hasOffer}
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      placeholder="مثال: اشتر 10 صناديق واحصل على 1 مجاناً"
                      className="w-full bg-white border border-amber-300/80 outline-none rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-right"
                      disabled={submitting}
                    />
                  </div>

                  {/* Validity Option Radio Buttons */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">صلاحية العرض (اختر خياراً):</label>
                    <div className="space-y-1.5 text-xs">
                      <label className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50/40">
                        <input
                          type="radio"
                          name="addOfferType"
                          value="unlimited"
                          checked={offerType === 'unlimited'}
                          onChange={() => setOfferType('unlimited')}
                          className="accent-amber-600"
                        />
                        <span className="font-semibold text-slate-800">1- بدون تاريخ انتهاء</span>
                        <span className="text-[10px] text-slate-400 mr-auto">(يوقفه الأدمن يدوياً)</span>
                      </label>

                      <label className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50/40">
                        <input
                          type="radio"
                          name="addOfferType"
                          value="date_limited"
                          checked={offerType === 'date_limited'}
                          onChange={() => setOfferType('date_limited')}
                          className="accent-amber-600"
                        />
                        <span className="font-semibold text-slate-800">2- تاريخ انتهاء محدد</span>
                      </label>

                      {offerType === 'date_limited' && (
                        <div className="pr-6 pt-1">
                          <input
                            type="datetime-local"
                            required={offerType === 'date_limited'}
                            value={offerEndDate}
                            onChange={(e) => setOfferEndDate(e.target.value)}
                            className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>
                      )}

                      <label className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50/40">
                        <input
                          type="radio"
                          name="addOfferType"
                          value="stock_limited"
                          checked={offerType === 'stock_limited'}
                          onChange={() => setOfferType('stock_limited')}
                          className="accent-amber-600"
                        />
                        <span className="font-semibold text-slate-800">3- عدد صناديق محدد</span>
                      </label>

                      {offerType === 'stock_limited' && (
                        <div className="pr-6 pt-1">
                          <input
                            type="number"
                            min="1"
                            required={offerType === 'stock_limited'}
                            value={offerMaxQuantity}
                            onChange={(e) => setOfferMaxQuantity(e.target.value)}
                            placeholder="عدد الصناديق المتاحة (مثال: 50)"
                            className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 text-right"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product Note Card */}
            <div className="bg-sky-50/60 border border-sky-200/80 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>إضافة ملاحظة للمنتج</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasNote}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasNote(checked);
                      if (checked) {
                        setHasOffer(false);
                        setOfferTitle('');
                      }
                    }}
                    className="sr-only peer"
                    disabled={submitting}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              {hasNote && (
                <div className="space-y-2 pt-1 border-t border-sky-200/60 text-right">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">نص الملاحظة</label>
                    <input
                      type="text"
                      required={hasNote}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="مثال: علبة زجاجية / يحتوي على مكسرات..."
                      className="w-full bg-white border border-sky-300/80 outline-none rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-right"
                      disabled={submitting}
                    />
                  </div>
                  <p className="text-[10px] text-sky-700 font-medium">
                    ℹ️ تظهر هذه الملاحظة تحت المنتج مباشرة بدون أي كلمات إضافية (مثل "عرض" أو "ملاحظة").
                  </p>
                </div>
              )}
            </div>

            {errorMsg && (

              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-800 p-3 rounded-xl text-xs font-semibold leading-relaxed">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim() || !categoryId}
              className="w-full bg-emerald-650 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              style={{ backgroundColor: '#128C7E' }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4.5 h-4.5" />
              )}
              <span>إضافة المنتج للمتجر</span>
            </button>
          </form>
        </div>

        {/* Products Table/List */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 lg:col-span-2 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800">المنتجات المتوفرة حالياً ({filteredDisplayProducts.length})</h2>
            </div>
            
            {/* Filters (Search & Category) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث عن اسم منتج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 outline-none rounded-xl pr-9 pl-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right"
                />
              </div>

              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 font-bold">عرض القسم:</span>
                <select
                  value={selectedFilterCategory}
                  onChange={(e) => setSelectedFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 outline-none rounded-xl px-3 py-1.5 text-xs text-slate-800 cursor-pointer focus:border-emerald-600 transition-colors"
                >
                  <option value="all">كل الأقسام</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-bold">جاري تحميل المنتجات من المستودع...</p>
            </div>
          ) : filteredDisplayProducts.length > 0 ? (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500">
                    <th className="pb-3 text-right">المنتج</th>
                    <th className="pb-3 text-right">القسم</th>
                    <th className="pb-3 text-right">السعر</th>
                    <th className="pb-3 text-center w-28">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDisplayProducts.map((product, index) => (
                    <tr 
                      key={product.id}
                      draggable={!submitting && !savingOrder}
                      onDragStart={(e) => handleDragStart(e, product.id)}
                      onDragOver={(e) => handleDragOver(e, product.id)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, product.id)}
                      className={`align-middle transition-all cursor-grab active:cursor-grabbing hover:bg-slate-50/50 ${
                        draggingId === product.id ? 'opacity-40 bg-slate-100' : ''
                      } ${
                        dragOverId === product.id ? 'border-b-2 border-emerald-500 bg-emerald-500/5' : 'border-b border-slate-100'
                      } ${
                        product.is_hidden ? 'opacity-70 bg-slate-50/20' : ''
                      }`}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0 p-1" title="اسحب لإعادة الترتيب">
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <div 
                            onClick={() => product.image_url && setActivePreviewImage(product.image_url)}
                            className={`w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-sm text-emerald-600 font-bold ${
                              product.image_url ? 'cursor-zoom-in hover:brightness-95 transition-all' : 'select-none'
                            }`}
                          >
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              product.name.charAt(0)
                            )}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductForHistory(product);
                                fetchSalesHistory(product.id, product.name);
                              }}
                              className="text-sm font-bold text-slate-800 line-clamp-1 flex items-center gap-1.5 hover:text-[#128C7E] hover:underline transition-all cursor-pointer border-none bg-transparent text-right outline-none p-0"
                              title="اضغط لعرض سجل مبيعات هذا المنتج بالتفصيل للزبائن"
                            >
                              <span>{product.name}</span>
                              {product.is_hidden && (
                                <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-amber-250 shrink-0">
                                  مخفي
                                </span>
                              )}
                            </button>
                            
                            {product.has_offer && product.offer_title && (
                              <div className="flex items-center gap-1 text-[10px] flex-wrap">
                                {isOfferActive(product) ? (
                                  <span className="bg-amber-100/90 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Gift className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>{product.offer_title}</span>
                                    {product.offer_type === 'stock_limited' && typeof product.offer_max_quantity === 'number' && (
                                      <span className="bg-amber-200/80 px-1.5 py-0.2 rounded text-[9px] font-extrabold mr-1">
                                        متبقي: {Math.max(0, product.offer_max_quantity - (product.offer_used_quantity || 0))} صندوق
                                      </span>
                                    )}

                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 border border-slate-200 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>عُرض منتهي: {product.offer_title}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {product.note && !product.has_offer && (
                              <div className="flex items-center gap-1 text-[10px] flex-wrap">
                                <span className="bg-sky-50 text-sky-800 border border-sky-200 font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-sky-600 shrink-0" />
                                  <span>{product.note}</span>
                                </span>
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                      <td className="py-3 text-sm text-slate-600">
                        {product.categories?.name || 'بدون قسم'}
                      </td>
                      <td className="py-3 text-sm font-extrabold text-emerald-600 whitespace-nowrap">
                        {product.price !== null && product.price !== undefined && Number(product.price) > 0 ? (
                          <div className="space-y-0.5">
                            <span className="block font-mono text-sm">{Number(product.price).toFixed(2)} TL</span>
                            <span className="text-[10px] font-bold text-slate-400 block leading-tight">
                              لكل {product.pricing_unit_step && Number(product.pricing_unit_step) > 1 ? `${product.pricing_unit_step} ` : ''}{product.unit_label || (product.unit_type === 'kg' ? 'كغ' : product.unit_type === 'gram' ? 'غرام' : 'قطعة')}
                            </span>
                            {product.step_quantity && Number(product.step_quantity) !== 1 && (
                              <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                خطوة: +{product.step_quantity}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shadow-xs select-none">
                            يحدد عند الطلب
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(product)}
                            className="p-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-555 hover:text-emerald-600 rounded-lg transition-all cursor-pointer"
                            title="تعديل المنتج"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleToggleVisibility(product.id, !!product.is_hidden)}
                            disabled={togglingId === product.id}
                            className={`p-1.5 border rounded-lg transition-all cursor-pointer ${
                              product.is_hidden
                                ? 'bg-amber-50 border-amber-250 text-amber-600 hover:bg-amber-100/50'
                                : 'bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 hover:text-slate-800'
                            }`}
                            title={product.is_hidden ? 'إلغاء الإخفاء (إظهار للزبائن)' : 'إخفاء المنتج عن الزبائن'}
                          >
                            {togglingId === product.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : product.is_hidden ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name, product.image_url)}
                            disabled={deletingId === product.id}
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                            title="حذف المنتج نهائياً"
                          >
                            {deletingId === product.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 space-y-2">
              <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">
                {selectedFilterCategory === 'all' ? 'لا يوجد منتجات معروضة بعد' : 'لا يوجد منتجات في هذا القسم حالياً'}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedFilterCategory === 'all' 
                  ? 'أضف منتجاتك الأولى عبر النموذج الجانبي لكي يتمكن الزبائن من شرائها.' 
                  : 'اختر قسماً آخر أو أضف منتجات جديدة وخصصها لهذا القسم.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
          onClick={() => handleCloseEdit()}
        >
          <div 
            className={`bg-white border border-slate-200 shadow-2xl flex flex-col text-right transition-all duration-200 ${
              isEditFullscreen 
                ? 'fixed inset-0 w-full h-full rounded-none z-50' 
                : 'w-full h-full sm:h-auto sm:max-h-[92vh] max-w-4xl sm:rounded-3xl rounded-none'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-7 py-4 border-b border-slate-150 flex items-center justify-between bg-white shrink-0 z-10">
              {/* Left Action Buttons (Close & Fullscreen) */}
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => handleCloseEdit()}
                  className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center border-none"
                  title="إغلاق (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditFullscreen(!isEditFullscreen)}
                  className="hidden sm:flex bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer items-center justify-center border-none"
                  title={isEditFullscreen ? "استعادة الحجم العادي" : "تكبير الشاشة بالكامل"}
                >
                  {isEditFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Title & Product Identity */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-800">تعديل المنتج</h2>
                    <span className="p-1.5 bg-emerald-50 text-[#128C7E] rounded-xl flex items-center justify-center">
                      <Pencil className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] sm:max-w-md mt-0.5" title={editingProduct.name}>
                    {editingProduct.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 md:p-7 space-y-6 overscroll-contain">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  
                  {/* Right Column: Basic Info & Image */}
                  <div className="space-y-5">
                    {/* Basic Info Card */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-end gap-2 pb-2 border-b border-slate-200/60">
                        <span className="text-xs font-extrabold text-slate-800">البيانات الأساسية</span>
                        <Tag className="w-4 h-4 text-[#128C7E]" />
                      </div>

                      {/* Product Name */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          اسم المنتج <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="اسم السلعة (مثال: لبن بقري 1 كغ)"
                          className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right"
                          disabled={submitting}
                        />
                      </div>

                      {/* Product Price */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          السعر (بالليرة التركية TL) <span className="text-slate-400 font-normal">(اختياري - يترك فارغاً للسعر عند الطلب)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          placeholder="يحدد عند الطلب"
                          className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right"
                          disabled={submitting}
                        />
                      </div>

                      {/* Category selection */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          قسم تصنيف المنتج <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-850 focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all text-right cursor-pointer"
                          disabled={submitting}
                        >
                          <option value="" disabled className="text-slate-400">اختر القسم المناسب...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id} className="text-slate-800 bg-white">
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Image Control Card */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 text-right">
                      <div className="flex items-center justify-end gap-2 pb-2 border-b border-slate-200/60">
                        <span className="text-xs font-extrabold text-slate-800">صورة المنتج</span>
                        <ImageIcon className="w-4 h-4 text-[#128C7E]" />
                      </div>
                      
                      {editImageAction === 'keep' && editingProduct.image_url && (
                        <div className="relative w-full h-40 bg-white border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center group shadow-2xs">
                          <img 
                            src={editingProduct.image_url} 
                            alt="Current" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-black/45 backdrop-blur-2xs flex items-center justify-center gap-2.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setEditImageAction('new');
                                setEditImagePreview(null);
                              }}
                              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              تغيير الصورة
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditImageAction('remove');
                                setEditImagePreview(null);
                              }}
                              className="bg-red-650 hover:bg-red-755 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
                            >
                              حذف الصورة
                            </button>
                          </div>
                        </div>
                      )}

                      {(editImageAction === 'new' || !editingProduct.image_url || editImageAction === 'remove') && (
                        <div className="space-y-2">
                          {editImageAction === 'remove' && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center justify-between">
                              <span>سيتم حذف الصورة الحالية عند حفظ التعديلات.</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditImageAction('keep');
                                  setEditImagePreview(null);
                                }}
                                className="bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border border-slate-200"
                              >
                                تراجع
                              </button>
                            </div>
                          )}

                          {(editImageAction === 'new' || !editingProduct.image_url) && (
                            <div className="w-full bg-white border-2 border-dashed border-slate-200 hover:border-[#128C7E] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-36 relative overflow-hidden">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleEditImageChange}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                                disabled={submitting}
                              />
                              {editImagePreview ? (
                                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-white">
                                  <img 
                                    src={editImagePreview} 
                                    alt="New Preview" 
                                    className="w-full h-full object-cover" 
                                  />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity gap-1.5 text-xs font-bold">
                                    <Upload className="w-4 h-4" />
                                    <span>تغيير الصورة</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#128C7E] flex items-center justify-center">
                                    <Upload className="w-5 h-5" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-700">انقر لتحميل صورة جديدة</span>
                                  <span className="text-[10px] text-slate-400">صيغ JPG, PNG, WebP (حد أقصى 3 ميجا)</span>
                                </>
                              )}
                            </div>
                          )}

                          {editImageAction === 'new' && editingProduct.image_url && !editImagePreview && (
                            <div className="text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditImageAction('keep');
                                  setEditImageFile(null);
                                  setEditImagePreview(null);
                                }}
                                className="text-xs font-bold text-[#128C7E] hover:underline bg-transparent border-none cursor-pointer"
                              >
                                إلغاء التغيير والاحتفاظ بالصورة الحالية
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Left Column: Units, Offers & Notes */}
                  <div className="space-y-5">
                    {/* Unit & Weight Measurement Settings Card (Edit) */}
                    <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 text-right">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-lg">
                          الوحدة: {editUnitLabel || 'قطعة'}
                        </span>
                        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                          <span>نظام البيع والقياس (الأوزان والوحدات)</span>
                          <Scale className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        حدد كيف يباع هذا المنتج (بالكيلو، نصف كيلو، غرام، قطعة):
                      </p>

                      {/* Quick Presets Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => applyEditUnitPreset('piece')}
                          className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            editUnitType === 'piece'
                              ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">📦 بالقطعة / صندوق</div>
                          <div className={`text-[10px] ${editUnitType === 'piece' ? 'text-emerald-100' : 'text-slate-400'}`}>زيادة 1 قطعة</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyEditUnitPreset('kg_half')}
                          className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            editUnitType === 'kg' && editStepQuantity === '0.5'
                              ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">🥦 خضار (نصف كغ)</div>
                          <div className={`text-[10px] ${editUnitType === 'kg' && editStepQuantity === '0.5' ? 'text-emerald-100' : 'text-slate-400'}`}>خطوة +0.5 كغ</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyEditUnitPreset('kg_full')}
                          className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            editUnitType === 'kg' && editStepQuantity === '1'
                              ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">⚖️ خضار (1 كغ)</div>
                          <div className={`text-[10px] ${editUnitType === 'kg' && editStepQuantity === '1' ? 'text-emerald-100' : 'text-slate-400'}`}>خطوة +1 كغ</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyEditUnitPreset('gram_100')}
                          className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            editUnitType === 'gram' && editStepQuantity === '100'
                              ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">🌿 بهارات (100 غرام)</div>
                          <div className={`text-[10px] ${editUnitType === 'gram' && editStepQuantity === '100' ? 'text-emerald-100' : 'text-slate-400'}`}>خطوة 100 غ</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyEditUnitPreset('gram_50')}
                          className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            editUnitType === 'gram' && editStepQuantity === '50'
                              ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">🌶️ بهارات خفيفة (50 غ)</div>
                          <div className={`text-[10px] ${editUnitType === 'gram' && editStepQuantity === '50' ? 'text-emerald-100' : 'text-slate-400'}`}>خطوة 50 غ</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyEditUnitPreset('custom')}
                          className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            editUnitType === 'custom'
                              ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">⚙️ تخصيص يدوي</div>
                          <div className={`text-[10px] ${editUnitType === 'custom' ? 'text-emerald-100' : 'text-slate-400'}`}>تحديد القيم يدوياً</div>
                        </button>
                      </div>

                      {/* Detailed / Custom inputs */}
                      <div className="pt-3 border-t border-emerald-200/70 space-y-2.5 text-xs">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الوحدة المعروضة</label>
                            <input
                              type="text"
                              value={editUnitLabel}
                              onChange={(e) => setEditUnitLabel(e.target.value)}
                              placeholder="مثال: كغ / غرام / علبة"
                              className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 text-right"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">الحد الأدنى للطلب</label>
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              value={editMinQuantity}
                              onChange={(e) => setEditMinQuantity(e.target.value)}
                              placeholder="مثال: 0.5 أو 50"
                              className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 text-right"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">مقدار الزيادة بالزر (+/-)</label>
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              value={editStepQuantity}
                              onChange={(e) => setEditStepQuantity(e.target.value)}
                              placeholder="مثال: 0.5 أو 50"
                              className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 text-right"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">السعر محسوب لكل كمية</label>
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              value={editPricingUnitStep}
                              onChange={(e) => setEditPricingUnitStep(e.target.value)}
                              placeholder="1 للكيلو / 100 للغرام"
                              className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 text-right"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Special Offer Card in Edit Modal */}
                    <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editHasOffer}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditHasOffer(checked);
                              if (checked) {
                                setEditHasNote(false);
                                setEditNote('');
                              }
                            }}
                            className="sr-only peer"
                            disabled={submitting}
                          />
                          <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                        <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs">
                          <span>عرض خاص للمنتج</span>
                          <Gift className="w-4 h-4 text-amber-600" />
                        </div>
                      </div>

                      {editHasOffer && (
                        <div className="space-y-3 pt-2 border-t border-amber-200/70 text-right">
                          {/* Offer Title Input */}
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-700">تفاصيل العرض المخصص</label>
                            <input
                              type="text"
                              required={editHasOffer}
                              value={editOfferTitle}
                              onChange={(e) => setEditOfferTitle(e.target.value)}
                              placeholder="مثال: اشتر 10 صناديق واحصل على 1 مجاناً"
                              className="w-full bg-white border border-amber-300/80 outline-none rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-right"
                              disabled={submitting}
                            />
                          </div>

                          {/* Validity Option Radio Buttons */}
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-700">صلاحية العرض (اختر خياراً):</label>
                            <div className="space-y-1.5 text-xs">
                              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50/60">
                                <input
                                  type="radio"
                                  name="editOfferType"
                                  value="unlimited"
                                  checked={editOfferType === 'unlimited'}
                                  onChange={() => setEditOfferType('unlimited')}
                                  className="accent-amber-600"
                                />
                                <span className="font-semibold text-slate-800">1- بدون تاريخ انتهاء</span>
                                <span className="text-[10px] text-slate-400 mr-auto">(يوقفه الأدمن يدوياً)</span>
                              </label>

                              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50/60">
                                <input
                                  type="radio"
                                  name="editOfferType"
                                  value="date_limited"
                                  checked={editOfferType === 'date_limited'}
                                  onChange={() => setEditOfferType('date_limited')}
                                  className="accent-amber-600"
                                />
                                <span className="font-semibold text-slate-800">2- تاريخ انتهاء محدد</span>
                              </label>

                              {editOfferType === 'date_limited' && (
                                <div className="pr-6 pt-1">
                                  <input
                                    type="datetime-local"
                                    required={editOfferType === 'date_limited'}
                                    value={editOfferEndDate}
                                    onChange={(e) => setEditOfferEndDate(e.target.value)}
                                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500"
                                  />
                                </div>
                              )}

                              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50/60">
                                <input
                                  type="radio"
                                  name="editOfferType"
                                  value="stock_limited"
                                  checked={editOfferType === 'stock_limited'}
                                  onChange={() => setEditOfferType('stock_limited')}
                                  className="accent-amber-600"
                                />
                                <span className="font-semibold text-slate-800">3- عدد صناديق محدد</span>
                              </label>

                              {editOfferType === 'stock_limited' && (
                                <div className="pr-6 pt-1 space-y-2">
                                  <input
                                    type="number"
                                    min="1"
                                    required={editOfferType === 'stock_limited'}
                                    value={editOfferMaxQuantity}
                                    onChange={(e) => setEditOfferMaxQuantity(e.target.value)}
                                    placeholder="عدد الصناديق المتاحة (مثال: 50)"
                                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 text-right"
                                  />
                                  <div className="flex items-center justify-between bg-amber-100/60 p-2 rounded-xl text-[11px] text-amber-900">
                                    <span>المباع من العرض حتى الآن: <strong>{editOfferUsedQuantity}</strong></span>
                                    <button
                                      type="button"
                                      onClick={() => setEditOfferUsedQuantity(0)}
                                      className="text-[10px] text-amber-800 hover:text-amber-950 underline bg-transparent border-none cursor-pointer"
                                    >
                                      إعادة تصفير العداد
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Note Card in Edit Modal */}
                    <div className="bg-sky-50/70 border border-sky-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editHasNote}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditHasNote(checked);
                              if (checked) {
                                setEditHasOffer(false);
                                setEditOfferTitle('');
                              }
                            }}
                            className="sr-only peer"
                            disabled={submitting}
                          />
                          <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-sky-500"></div>
                        </label>
                        <div className="flex items-center gap-2 text-sky-950 font-extrabold text-xs">
                          <span>إضافة ملاحظة للمنتج</span>
                          <FileText className="w-4 h-4 text-sky-600" />
                        </div>
                      </div>

                      {editHasNote && (
                        <div className="space-y-2 pt-2 border-t border-sky-200/70 text-right">
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-700">نص الملاحظة</label>
                            <input
                              type="text"
                              required={editHasNote}
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              placeholder="مثال: علبة زجاجية / يحتوي على مكسرات..."
                              className="w-full bg-white border border-sky-300/80 outline-none rounded-xl px-3 py-2 text-xs text-slate-850 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-right"
                              disabled={submitting}
                            />
                          </div>
                          <p className="text-[10px] text-sky-700 font-medium">
                            ℹ️ تظهر هذه الملاحظة تحت المنتج مباشرة بدون أي كلمات إضافية (مثل "عرض" أو "ملاحظة").
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Error Message */}
                {editErrorMsg && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-800 p-3.5 rounded-2xl text-xs font-semibold leading-relaxed">
                    {editErrorMsg}
                  </div>
                )}
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-5 sm:px-7 py-3.5 border-t border-slate-150 bg-slate-50/95 backdrop-blur-sm flex items-center justify-between shrink-0 z-10">
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  <span>تلميح: اضغط </span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded shadow-2xs">Esc</kbd>
                  <span> للإلغاء والإغلاق</span>
                </div>
                <div className="flex items-center gap-2.5 mr-auto sm:mr-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleCloseEdit()}
                    disabled={submitting}
                    className="flex-1 sm:flex-initial bg-white hover:bg-slate-100 active:scale-95 text-slate-600 font-bold py-2.5 px-5 rounded-xl text-xs transition-all cursor-pointer border border-slate-200"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !editName.trim() || !editCategoryId}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer border-none"
                    style={{ backgroundColor: submitting || !editName.trim() || !editCategoryId ? undefined : '#128C7E' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <span>حفظ التعديلات</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Image Preview Modal */}
      {activePreviewImage && (
        <div 
          onClick={() => setActivePreviewImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out transition-opacity duration-300"
        >
          {/* Close Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActivePreviewImage(null);
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
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/5 select-none"
            />
          </div>
        </div>
      )}

      {/* Sales History Modal */}
      {selectedProductForHistory && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
          onClick={() => {
            setSelectedProductForHistory(null);
            setSalesHistory([]);
          }}
        >
          <div 
            className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-2xl max-h-[92vh] flex flex-col space-y-4 shadow-2xl relative text-right overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => {
                setSelectedProductForHistory(null);
                setSalesHistory([]);
              }}
              className="absolute top-4 left-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 p-2 rounded-full transition-all cursor-pointer flex items-center justify-center border-none"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 justify-end">
              <div>
                <h2 className="text-base font-bold text-slate-800">سجل مبيعات المنتج بالتفصيل</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">تفاصيل الزبائن الذين اشتروا هذا المنتج وأسعار البيع لهم</p>
              </div>
              <ShoppingBag className="w-6 h-6 text-[#128C7E] shrink-0" />
            </div>

            {/* Product Header Card */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-row-reverse items-center gap-4 text-right">
              <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-lg text-[#128C7E]">
                {selectedProductForHistory.image_url ? (
                  <img src={selectedProductForHistory.image_url} alt={selectedProductForHistory.name} className="w-full h-full object-cover" />
                ) : (
                  selectedProductForHistory.name.charAt(0)
                )}
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-bold text-slate-800">{selectedProductForHistory.name}</h3>
                <div className="flex flex-row-reverse flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>القسم: {categories.find(c => c.id === selectedProductForHistory.category_id)?.name || 'بدون قسم'}</span>
                  <span>•</span>
                  <span>السعر الافتراضي: {selectedProductForHistory.price ? `${Number(selectedProductForHistory.price).toFixed(2)} TL` : 'يحدد عند الطلب'}</span>
                </div>
              </div>
            </div>

            {/* History Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">عمليات البيع المسجلة:</h4>
              
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#128C7E]" />
                  <p className="text-xs font-bold">جاري تحميل سجل المبيعات...</p>
                </div>
              ) : salesHistory.length > 0 ? (
                <div className="overflow-x-auto no-scrollbar border border-slate-150 rounded-2xl max-h-[300px]">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[11px] font-bold text-slate-500">
                        <th className="py-2.5 px-3 text-right">الزبون</th>
                        <th className="py-2.5 px-3 text-center">التاريخ</th>
                        <th className="py-2.5 px-3 text-center">الكمية المباعة</th>
                        <th className="py-2.5 px-3 text-left">سعر البيع</th>
                        <th className="py-2.5 px-3 text-center">حالة الفاتورة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-slate-800 text-right">{item.customer_name}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-center" dir="ltr">
                            {new Date(item.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 font-extrabold text-slate-700 text-center">{item.quantity} صندوق/قطعة</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600 text-left">
                            {item.price_at_purchase > 0 ? `${Number(item.price_at_purchase).toFixed(2)} TL` : 'غير مسعر'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              item.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 
                              item.status === 'postponed' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                              'bg-blue-50 text-blue-700 border border-blue-150'
                            }`}>
                              {item.status === 'delivered' ? 'تم تسليمها' : 
                               item.status === 'postponed' ? 'مؤجلة' : 'قيد الانتظار'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-1">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">لا توجد عمليات بيع مسجلة لهذا المنتج بعد.</p>
                  <p className="text-[10px] text-slate-500">سيظهر هنا قائمة الزبائن والأسعار بمجرد بيع هذا المنتج في فواتيرهم.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
