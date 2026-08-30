import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { cart, customerName, customerPhone, customerAddress } = await request.json();

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: 'السلة فارغة' }, { status: 400 });
    }

    const nameToSave = (customerName || '').trim() || 'زبون طيبة';
    const phoneToSave = (customerPhone || '').trim() || null;
    const addressToSave = (customerAddress || '').trim() || null;

    // 1. Get WhatsApp number and store name from settings
    let whatsappNumber = '905000000000';
    let storeName = 'ماركت طيبة';
    try {
      const { data: settingsData } = await supabaseAdmin
        .from('settings')
        .select('key, value')
        .in('key', ['whatsapp_number', 'store_name']);
      
      if (settingsData) {
        settingsData.forEach((s) => {
          if (s.key === 'whatsapp_number' && s.value) whatsappNumber = s.value;
          if (s.key === 'store_name' && s.value) storeName = s.value;
        });
      }
    } catch (err) {
      console.warn('Could not fetch settings:', err);
    }

    // 2. Extract valid UUID product IDs from cart and bulk fetch from DB
    const validProductIds = cart
      .map((item: any) => item.id)
      .filter((id: any) => typeof id === 'string' && UUID_REGEX.test(id));

    const productMap = new Map<string, any>();
    if (validProductIds.length > 0) {
      const { data: prodList, error: prodErr } = await supabaseAdmin
        .from('products')
        .select('id, price, offer_type, offer_used_quantity')
        .in('id', validProductIds);

      if (prodErr) {
        console.error('Error fetching products during checkout:', prodErr);
        throw prodErr;
      }

      if (prodList) {
        prodList.forEach((prod) => productMap.set(prod.id, prod));
      }
    }

    // 3. Process cart items and map product_id accurately
    let calculatedTotalPrice = 0;
    const itemRecords: any[] = [];

    for (const item of cart) {
      const isCustomItem = item.isCustom || !item.id;
      const isValidUuid = typeof item.id === 'string' && UUID_REGEX.test(item.id);

      let actualProductId: string | null = null;
      let actualPrice = item.price || 0;

      if (isValidUuid) {
        const prodData = productMap.get(item.id);
        if (prodData) {
          actualProductId = prodData.id;
          actualPrice = prodData.price !== null && prodData.price !== undefined ? prodData.price : (item.price || 0);

          // Update offer used quantity if applicable
          if (prodData.offer_type === 'stock_limited') {
            const currentUsed = prodData.offer_used_quantity || 0;
            await supabaseAdmin
              .from('products')
              .update({ offer_used_quantity: currentUsed + item.quantity })
              .eq('id', item.id);
          }
        } else {
          // If in demo or fallback mode, treat as named item
          actualProductId = null;
          actualPrice = item.price || 0;
        }
      } else if (isCustomItem) {
        actualProductId = null;
      } else {
        // Fallback for demo IDs like 'p1', 'p2'
        actualProductId = null;
        actualPrice = item.price || 0;
      }

      calculatedTotalPrice += actualPrice * item.quantity;

      itemRecords.push({
        product_id: actualProductId,
        quantity: item.quantity,
        price_at_purchase: actualPrice,
        product_name: item.name,
        product_image: item.image_url || null,
        applied_offer: item.applied_offer || null
      });
    }

    // 4. Save customer to directory if new or update phone
    try {
      if (nameToSave) {
        await supabaseAdmin
          .from('customers')
          .upsert({ name: nameToSave, phone: phoneToSave }, { onConflict: 'name' });
      }
    } catch (custErr) {
      console.warn('Customer upsert non-blocking error:', custErr);
    }

    // 5. Save order to database with default status 'received'
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: nameToSave,
        customer_phone: phoneToSave,
        customer_address: addressToSave,
        total_price: calculatedTotalPrice,
        status: 'received',
        status_updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Error creating order record:', orderError);
      throw orderError;
    }
    const orderId = orderData.id;

    // 6. Save order items with strict error handling
    const orderItemsToInsert = itemRecords.map((item) => ({
      ...item,
      order_id: orderId
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      console.error('Error inserting order_items, cleaning up orphan order:', itemsError);
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      throw itemsError;
    }

    // Determine base URL for live tracking link
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const origin = host ? `${proto}://${host}` : request.nextUrl.origin;
    const trackUrl = `${origin}/track/${orderId}`;

    // 7. Construct WhatsApp formatted message
    const messageLines: string[] = [
      `🛒 *طلب جديد من: ${storeName}*`,
      `📄 *رقم الطلبية:* #${orderId.substring(0, 8)}`,
      `👤 *الزبون:* ${nameToSave}`,
    ];

    if (phoneToSave) {
      messageLines.push(`📞 *الهاتف:* ${phoneToSave}`);
    }
    if (addressToSave) {
      messageLines.push(`📍 *العنوان:* ${addressToSave}`);
    }

    messageLines.push('-----------------------------');
    messageLines.push('*المنتجات المطلوبة:*');

    cart.forEach((item: any, index: number) => {
      let line = `${index + 1}. *${item.name}* × ${item.quantity}`;
      if (item.applied_offer) {
        line += ` [🎁 عرض: ${item.applied_offer}]`;
      }
      if (item.price !== null && item.price !== undefined && Number(item.price) > 0) {
        line += ` = ${(item.price * item.quantity).toFixed(2)} TL`;
      }
      messageLines.push(line);
    });

    messageLines.push('-----------------------------');
    messageLines.push(`💰 *الإجمالي الكلي:* *${calculatedTotalPrice.toFixed(2)} TL*`);
    messageLines.push('');
    messageLines.push(`🛵 *رابط تتبع الطلب والتوصيل المباشر:*`);
    messageLines.push(`${trackUrl}`);
    messageLines.push('');
    messageLines.push('✨ شكراً لتسوقكم من ماركت طيبة!');

    const encodedText = encodeURIComponent(messageLines.join('\n'));
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedText}`;

    return NextResponse.json({
      success: true,
      orderId,
      trackUrl,
      whatsappUrl
    });
  } catch (err: any) {
    console.error('Error in store checkout API:', err);
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة الطلب' }, { status: 500 });
  }
}
