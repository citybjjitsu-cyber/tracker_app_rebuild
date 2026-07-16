'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { newsApi } from '@/lib/api';
import { Newspaper, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { News } from '@/types';

export default function NewsPage() {
  const { theme, toggleTheme } = useTheme();
  const [articles, setArticles] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    newsApi
      .list(true)
      .then(setArticles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CKB Tracker
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-all"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black font-headline text-[var(--foreground)]">
              News & Updates
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Latest from CKB Tracker
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[var(--muted-foreground)] mt-4">Loading news...</p>
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-16">
            <Newspaper className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-40" />
            <p className="text-[var(--muted-foreground)]">No news articles yet.</p>
          </div>
        )}

        <div className="space-y-4">
          {articles.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full text-left p-5"
              >
                <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <h2 className="text-lg font-bold font-headline text-[var(--foreground)] mt-2">
                  {item.title}
                </h2>
                <p className={`text-sm text-[var(--muted-foreground)] mt-2 ${expandedId === item.id ? '' : 'line-clamp-3'}`}>
                  {item.content}
                </p>
              </button>
              {expandedId !== item.id && item.content.length > 150 && (
                <div className="px-5 pb-4">
                  <button
                    onClick={() => setExpandedId(item.id)}
                    className="text-xs font-bold text-[var(--primary)] hover:underline"
                  >
                    Read more
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
