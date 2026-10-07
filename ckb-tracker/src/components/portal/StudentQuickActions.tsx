'use client';

import Link from 'next/link';
import { ArrowRight, CalendarCheck, MessageSquare } from 'lucide-react';

interface StudentQuickActionsProps {
  pendingFeedbackCount: number;
  onFeedbackClick?: () => void;
}

export function StudentQuickActions({ pendingFeedbackCount, onFeedbackClick }: StudentQuickActionsProps) {
  return (
    <section
      aria-labelledby="quick-actions-title"
      className="mb-6 rounded-xl border border-primary-container/20 bg-gradient-to-br from-primary-container/15 via-surface-container-low to-surface-container-low p-4 sm:p-6"
    >
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-container">Your next step</p>
        <h2 id="quick-actions-title" className="mt-1 font-headline text-lg font-black tracking-tight text-on-surface sm:text-xl">
          Ready for class?
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">Check in before you arrive, then keep your progress in one place.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/check-in"
          className="group flex min-h-14 items-center justify-between rounded-lg bg-primary-container px-4 py-3 text-on-primary-container shadow-lg shadow-primary-container/20 transition-transform hover:-translate-y-0.5"
        >
          <span className="flex items-center gap-3">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
            <span>
              <span className="block font-headline text-sm font-bold uppercase tracking-wide">Check in now</span>
              <span className="block text-xs opacity-80">Choose today&apos;s class</span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>

        <Link
          href="/portal#feedback"
          onClick={onFeedbackClick}
          className="group flex min-h-14 items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container-high px-4 py-3 text-on-surface transition-colors hover:bg-surface-container-highest"
        >
          <span className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary-container" aria-hidden="true" />
            <span>
              <span className="block font-headline text-sm font-bold uppercase tracking-wide">Give feedback</span>
              <span className="block text-xs text-on-surface-variant">
                {pendingFeedbackCount > 0 ? `${pendingFeedbackCount} class${pendingFeedbackCount === 1 ? '' : 'es'} waiting` : 'Share your experience'}
              </span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-on-surface-variant transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
