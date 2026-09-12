import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data: settingsData, error } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['whatsapp_number', 'store_name', 'store_pin_enabled']);

    if (error) {
      console.error('Error fetching pin info:', error);
      return NextResponse.json({
        enabled: true,
        whatsappNumber: '905000000000',
        storeName: 'ماركت طيبة',
      });
    }

    const map = (settingsData || []).reduce<Record<string, string>>((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({
      enabled: map['store_pin_enabled'] === 'true',
      whatsappNumber: map['whatsapp_number'] || '905000000000',
      storeName: map['store_name'] || 'ماركت طيبة',
    });
  } catch (err: any) {
    console.error('Error in /api/store/auth/pin-info:', err);
    return NextResponse.json({
      enabled: true,
      whatsappNumber: '905000000000',
      storeName: 'ماركت طيبة',
    });
  }
}
