import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

export async function GET() {
  try {
    const { data: settingsData, error } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['whatsapp_number', 'store_name', 'store_pin_enabled']);

    if (error) {
      console.error('Error fetching pin info:', error);
      return NextResponse.json(
        { error: 'Failed to load current store contact settings' },
        { status: 503, headers: noStoreHeaders }
      );
    }

    const map = (settingsData || []).reduce<Record<string, string>>((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const whatsappNumber = (map['whatsapp_number'] || '').replace(/\D/g, '');

    if (!whatsappNumber) {
      console.error('PIN info requested but whatsapp_number is missing from settings');
      return NextResponse.json(
        { error: 'Store WhatsApp number is not configured' },
        { status: 503, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        enabled: map['store_pin_enabled'] === 'true',
        whatsappNumber,
        storeName: map['store_name'] || 'ماركت طيبة',
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in /api/store/auth/pin-info:', err);
    return NextResponse.json(
      { error: 'Failed to load current store contact settings' },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
