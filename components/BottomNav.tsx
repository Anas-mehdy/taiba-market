'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, ShoppingBag, ShoppingCart, Store, Phone } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { totalQuantity } = useCart();

  // Hide bottom nav on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    {
      href: '/',
      label: 'عروض اليوم',
      icon: Sparkles,
      isActive: pathname === '/'
    },
    {
      href: '/products',
      label: 'المنتجات',
      icon: ShoppingBag,
      isActive: pathname === '/products'
    },
    {
      href: '/checkout',
      label: 'سلة المشتريات',
      icon: ShoppingCart,
      badge: totalQuantity > 0 ? totalQuantity : null,
      isActive: pathname === '/checkout'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg py-2 px-4 print:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative ${
                item.isActive
                  ? 'text-[#075E54] font-black'
                  : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
            >
              <div className="relative">
                <div className={`p-1.5 rounded-xl transition-all ${item.isActive ? 'bg-[#128C7E]/10' : ''}`}>
                  <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 bg-[#25D366] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs border border-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
