import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch categories
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (catError) throw catError;

    // 2. Fetch products
    const { data: products, error: prodError } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (prodError) throw prodError;

    return NextResponse.json({
      categories: categories || [],
      products: products || [],
      showPrices: true
    });
  } catch (err: any) {
    console.error('Error in store products API:', err);
    return NextResponse.json({ error: 'حدث خطأ في جلب بيانات المتجر' }, { status: 500 });
  }
}
