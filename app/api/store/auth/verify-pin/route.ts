import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { decryptPin, normalizeDigits, createSessionToken } from '@/lib/pinSecurity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    const normalizedInputPin = normalizeDigits(pin || '');

    if (!normalizedInputPin) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال الرمز السري' },
        { status: 400 }
      );
    }

    // 1. Fetch current PIN settings from Supabase
    const { data: settingsData, error } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['store_pin_enabled', 'store_pin_code', 'store_pin_version']);

    if (error) {
      console.error('Error fetching settings for PIN verification:', error);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ في الاتصال بالنظام، يرجى المحاولة لاحقاً' },
        { status: 500 }
      );
    }

    const settingsMap = (settingsData || []).reduce<Record<string, string>>((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const isEnabled = settingsMap['store_pin_enabled'] === 'true';
    const rawStoredPin = settingsMap['store_pin_code'] || '1234';
    const currentVersion = settingsMap['store_pin_version'] || '1';
    const correctPin = decryptPin(rawStoredPin);

    // If PIN protection is not enabled, grant access immediately
    if (!isEnabled) {
      const response = NextResponse.json({ success: true, message: 'القفل غير مفعل حالياً' });
      const token = createSessionToken(currentVersion);
      response.cookies.set({
        name: 'store_access_token',
        value: token,
        maxAge: 365 * 24 * 60 * 60, // 1 year (365 days)
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return response;
    }

    // 2. Validate input PIN
    if (normalizedInputPin !== correctPin) {
      return NextResponse.json(
        { success: false, error: 'الرمز السري غير صحيح. يرجى التأكد من الرمز وإعادة المحاولة.' },
        { status: 401 }
      );
    }

    // 3. Valid PIN: create signed token and set long-lasting cookie (1 year)
    const token = createSessionToken(currentVersion);
    const response = NextResponse.json({
      success: true,
      message: 'تم التحقق من الرمز بنجاح. أهلاً بك في ماركت طيبة!',
    });

    response.cookies.set({
      name: 'store_access_token',
      value: token,
      maxAge: 365 * 24 * 60 * 60, // 365 days (1 year)
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (err: any) {
    console.error('Error in /api/store/auth/verify-pin:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
