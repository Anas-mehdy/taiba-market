import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkAdminAuth } from '@/lib/auth/adminAuth';
import { encryptPin, decryptPin, normalizeDigits } from '@/lib/pinSecurity';

export async function GET(request: NextRequest) {
  try {
    const auth = checkAdminAuth(request);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Retrieve PIN settings from database
    const { data: settingsData, error } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['store_pin_enabled', 'store_pin_code', 'store_pin_version']);

    if (error) {
      console.error('Error fetching PIN settings:', error);
      return NextResponse.json({ error: 'Failed to fetch PIN settings' }, { status: 500 });
    }

    const settingsMap = (settingsData || []).reduce<Record<string, string>>((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const enabled = settingsMap['store_pin_enabled'] === 'true';
    const rawPin = settingsMap['store_pin_code'] || '1234';
    const pin = decryptPin(rawPin);
    const version = settingsMap['store_pin_version'] || '1';

    return NextResponse.json({
      success: true,
      enabled,
      pin,
      version,
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/settings/pin:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = checkAdminAuth(request);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { enabled, pin } = body;

    const normalizedPin = normalizeDigits(pin || '');

    // Validate that PIN consists of digits only (at least 3 digits, max 10 digits)
    if (enabled && (!normalizedPin || !/^\d{3,10}$/.test(normalizedPin))) {
      return NextResponse.json(
        { error: 'الرمز السري يجب أن يتكون من أرقام فقط (بين 3 إلى 10 خانات)' },
        { status: 400 }
      );
    }

    // Get current version to increment it
    const { data: currentVersionData } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'store_pin_version')
      .single();

    const currentVersionNum = parseInt(currentVersionData?.value || '1', 10);
    const newVersion = (isNaN(currentVersionNum) ? 1 : currentVersionNum + 1).toString();

    const encrypted = encryptPin(normalizedPin || '1234');

    const updates = [
      { key: 'store_pin_enabled', value: enabled ? 'true' : 'false' },
      { key: 'store_pin_code', value: encrypted },
      { key: 'store_pin_version', value: newVersion },
    ];

    const { error: upsertError } = await supabaseAdmin
      .from('settings')
      .upsert(updates);

    if (upsertError) {
      console.error('Error saving PIN settings:', upsertError);
      return NextResponse.json({ error: 'فشل في حفظ إعدادات الرمز السري' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تم حفظ إعدادات حماية المتجر بنجاح وتحديث جلسات الأمان',
      enabled: !!enabled,
      pin: normalizedPin,
      version: newVersion,
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/settings/pin:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
