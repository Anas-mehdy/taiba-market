'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={`w-9 h-9 rounded-xl flex items-center justify-center opacity-0 ${className}`}
        aria-label="تبديل المظهر"
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-750 text-amber-400 border border-slate-700/60 shadow-xs'
          : 'bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 shadow-xs hover:text-amber-500'
      } ${className}`}
      title={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
    >
      <div className="relative w-4.5 h-4.5 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4.5 h-4.5 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4.5 h-4.5 transition-transform duration-300 -rotate-12 hover:rotate-0" />
        )}
      </div>
      {showLabel && (
        <span className="text-[11px] font-bold">
          {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
        </span>
      )}
    </button>
  );
}
