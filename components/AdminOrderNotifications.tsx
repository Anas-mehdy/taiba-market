'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellOff, CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type NotificationPermissionState = NotificationPermission | 'unsupported';

interface OrderNotificationRecord {
  id: string;
  customer_name?: string | null;
  total_price?: number | string | null;
  created_at?: string | null;
}

interface OrderToast {
  order: OrderNotificationRecord;
  createdAt: number;
}

const POLL_INTERVAL_MS = 12000;
const BASELINE_LIMIT = 25;

export default function AdminOrderNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [toast, setToast] = useState<OrderToast | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const isConfigured =
    typeof process !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  const prepareAudio = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.warn('Could not prepare order notification sound:', error);
    }
  }, []);

  const playSound = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || context.state !== 'running') return;

    try {
      const now = context.currentTime;

      [0, 0.18].forEach((offset, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(index === 0 ? 880 : 1175, now + offset);

        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.18);
      });
    } catch (error) {
      console.warn('Could not play order notification sound:', error);
    }
  }, []);

  const openOrder = useCallback((orderId: string) => {
    setUnreadCount(0);
    setToast(null);
    if (typeof window !== 'undefined') {
      window.location.assign(`/admin?focusOrder=${encodeURIComponent(orderId)}`);
    }
  }, []);

  const notifyForOrder = useCallback((order: OrderNotificationRecord) => {
    if (!order?.id || seenOrderIdsRef.current.has(order.id)) return;

    seenOrderIdsRef.current.add(order.id);
    setLastOrderId(order.id);
    setUnreadCount((count) => count + 1);
    setToast({ order, createdAt: Date.now() });
    playSound();

    window.dispatchEvent(
      new CustomEvent('tayba:new-order', {
        detail: { orderId: order.id },
      }),
    );

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setToast(null);
    }, 12000);

    if ('Notification' in window && Notification.permission === 'granted') {
      const customer = order.customer_name?.trim() || 'زبون جديد';
      const total = Number(order.total_price || 0);
      const body = total > 0
        ? `${customer} • الإجمالي ${total.toFixed(2)} TL`
        : `${customer} • اضغط لعرض تفاصيل الطلب`;

      try {
        const browserNotification = new Notification('🛒 طلب جديد - ماركت طيبة', {
          body,
          icon: '/logo.png',
          tag: `tayba-order-${order.id}`,
        });

        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
          openOrder(order.id);
        };
      } catch (error) {
        console.warn('Browser notification could not be displayed:', error);
      }
    }
  }, [openOrder, playSound]);

  useEffect(() => {
    mountedRef.current = true;

    if (typeof window === 'undefined') return;

    if ('Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }

    const unlockAudio = () => {
      void prepareAudio();
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      mountedRef.current = false;
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [prepareAudio]);

  useEffect(() => {
    if (!isConfigured) return;

    let cancelled = false;
    let pollTimer: number | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchRecentOrders = async (useAsBaseline = false) => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, total_price, created_at')
        .order('created_at', { ascending: false })
        .limit(BASELINE_LIMIT);

      if (error) {
        console.warn('Order notification polling failed:', error);
        return;
      }

      if (cancelled) return;

      const rows = (data || []) as OrderNotificationRecord[];

      if (useAsBaseline) {
        rows.forEach((order) => {
          if (order.id) seenOrderIdsRef.current.add(order.id);
        });
        return;
      }

      rows
        .filter((order) => order.id && !seenOrderIdsRef.current.has(order.id))
        .sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return aTime - bTime;
        })
        .forEach(notifyForOrder);
    };

    const start = async () => {
      // Establish a baseline so opening the admin panel never alerts for old orders.
      await fetchRecentOrders(true);
      if (cancelled) return;

      channel = supabase
        .channel('tayba-admin-new-orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
          },
          (payload) => {
            notifyForOrder(payload.new as OrderNotificationRecord);
          },
        )
        .subscribe((status) => {
          if (!cancelled) {
            setRealtimeConnected(status === 'SUBSCRIBED');
          }
        });

      // Fallback: still detect new orders if Realtime replication is not enabled.
      pollTimer = window.setInterval(() => {
        void fetchRecentOrders(false);
      }, POLL_INTERVAL_MS);
    };

    void start();

    return () => {
      cancelled = true;
      setRealtimeConnected(false);

      if (pollTimer) {
        window.clearInterval(pollTimer);
      }

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [isConfigured, notifyForOrder]);

  const handleBellClick = async () => {
    await prepareAudio();

    if (permission === 'unsupported') {
      setToast({
        order: {
          id: 'notification-help',
          customer_name: 'المتصفح لا يدعم إشعارات النظام هنا، لكن تنبيه الموقع والصوت سيستمران بالعمل.',
          total_price: 0,
        },
        createdAt: Date.now(),
      });
      return;
    }

    if (permission === 'default') {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
      } catch (error) {
        console.warn('Could not request notification permission:', error);
      }
      return;
    }

    if (permission === 'denied') {
      setToast({
        order: {
          id: 'notification-help',
          customer_name: 'إشعارات المتصفح محظورة. اسمح بها من إعدادات الموقع في المتصفح.',
          total_price: 0,
        },
        createdAt: Date.now(),
      });
      return;
    }

    if (lastOrderId && unreadCount > 0) {
      openOrder(lastOrderId);
    }
  };

  const customerName = toast?.order.customer_name?.trim() || 'زبون جديد';
  const toastTotal = Number(toast?.order.total_price || 0);
  const isHelpToast = toast?.order.id === 'notification-help';

  return (
    <>
      <button
        type="button"
        onClick={handleBellClick}
        className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
        title={
          permission === 'granted'
            ? realtimeConnected
              ? 'إشعارات الطلبات مفعلة ومتصلة لحظياً'
              : 'إشعارات الطلبات مفعلة'
            : permission === 'denied'
              ? 'إشعارات المتصفح محظورة'
              : 'تفعيل إشعارات الطلبات'
        }
        aria-label="إشعارات الطلبات"
      >
        {permission === 'denied' ? (
          <BellOff className="w-4 h-4 text-rose-500" />
        ) : (
          <Bell className={`w-4 h-4 ${permission === 'granted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`} />
        )}

        {permission === 'granted' && (
          <span
            className={`absolute top-1 right-1 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
              realtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-2 -left-2 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm print:hidden" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              {isHelpToast ? <CheckCircle2 className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                {isHelpToast ? 'إعداد الإشعارات' : 'وصل طلب جديد'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {customerName}
                {!isHelpToast && toastTotal > 0 ? ` • ${toastTotal.toFixed(2)} TL` : ''}
              </p>

              {!isHelpToast && (
                <button
                  type="button"
                  onClick={() => openOrder(toast.order.id)}
                  className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  عرض الطلب الآن
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
