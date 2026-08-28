import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { data: banners, error } = await supabaseAdmin
      .from('daily_offers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      banners: banners || []
    });
  } catch (err: any) {
    console.error('Error in store banners API:', err);
    return NextResponse.json({ error: 'حدث خطأ في جلب العروض اليومية', banners: [] }, { status: 500 });
  }
}
