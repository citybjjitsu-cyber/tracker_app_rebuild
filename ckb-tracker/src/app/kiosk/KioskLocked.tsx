'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { KioskStaffLogin } from './KioskStaffLogin';
import { newsApi } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { Shield, Search, Newspaper, LogIn, Sun, Moon } from 'lucide-react';
import type { News } from '@/types';

export function KioskLocked() {
  const { theme, toggleTheme } = useTheme();
  const [showLogin, setShowLogin] = useState(false);
  const [news, setNews] = useState<News[]>([]);

  useEffect(() => {
    newsApi.list(true).then(setNews).catch(() => {});
  }, []);

  if (showLogin) {
    return <KioskStaffLogin onCancel={() => setShowLogin(false)} />;
  }

  return (
    <div className="relative flex flex-col items-center gap-12 w-full max-w-lg mx-auto">
      <button
        onClick={toggleTheme}
        className="absolute top-0 right-0 p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-all"
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 bg-[var(--primary)] rounded-2xl flex items-center justify-center shadow-2xl shadow-[var(--primary)]/20">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-black font-headline text-[var(--foreground)] tracking-tight">
            CKB <span className="text-[var(--primary)]">Tracker</span>
          </h1>
          <p className="text-sm font-bold text-[var(--muted-foreground)] tracking-[0.2em] uppercase mt-2">
            Elite Performance
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 p-12 rounded-3xl border-2 border-dashed border-[var(--border)] w-full">
        <div className="w-20 h-20 rounded-full bg-[var(--muted)] flex items-center justify-center">
          <Search className="w-10 h-10 text-[var(--muted-foreground)]" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black font-headline text-[var(--foreground)] mb-2">
            Find Your Name
          </h2>
          <p className="text-[var(--muted-foreground)]">
            Search for your name to check in to class
          </p>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] bg-[var(--card)] px-4 py-2 rounded-full border border-[var(--border)]">
          A staff member must sign in first
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/login"
          className="flex items-center gap-3 px-8 py-4 bg-[var(--primary)] text-white rounded-xl font-bold text-lg hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-[var(--primary)]/20"
        >
          <LogIn className="w-5 h-5" />
          User Login
        </Link>
        <p className="text-xs text-[var(--muted-foreground)]">
          All user types
        </p>
        <button
          onClick={() => setShowLogin(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border-2 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--card)] transition-all"
        >
          <Shield className="w-4 h-4" />
          Kiosk Sign In
        </button>
        <p className="text-xs text-[var(--muted-foreground)]">
          For mat-side kiosk activation
        </p>
      </div>

      {news.length > 0 && (
        <div className="w-full mt-12 pt-12 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="text-lg font-black font-headline text-[var(--foreground)] uppercase tracking-wider">
                News & Updates
              </h3>
            </div>
            <Link
              href="/news"
              className="text-xs font-bold text-[var(--primary)] hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {news.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href="/news"
                className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 transition-all group"
              >
                <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                <h4 className="font-bold font-headline text-[var(--foreground)] mt-2 mb-1 group-hover:text-[var(--primary)] transition-colors">
                  {item.title}
                </h4>
                <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">
                  {item.content}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
