import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { orderId, status, deliveryNote } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'معرّف الطلب مطلوب' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      status_updated_at: new Date().toISOString()
    };

    if (status !== undefined) {
      updatePayload.status = status;
    }

    if (deliveryNote !== undefined) {
      updatePayload.delivery_note = deliveryNote === '' ? null : deliveryNote;
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order delivery status:', error);
      return NextResponse.json({ error: 'فشل تحديث حالة الطلب في قاعدة البيانات' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order: data
    });
  } catch (err: any) {
    console.error('Delivery update error:', err);
    return NextResponse.json({ error: err.message || 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
