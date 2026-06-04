'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useKiosk } from '../KioskContext';
import { classesApi } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { DAYS_OF_WEEK } from '@/lib/utils';
import { Check, X, Calendar } from 'lucide-react';
import type { ClassSchedule } from '@/types';

export default function KioskSelectPage() {
  const router = useRouter();
  const { identifiedUser, selectedClassIds, toggleClass, clearClasses, resetSession, resetIdleTimer } = useKiosk();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!identifiedUser) {
      router.push('/');
      return;
    }
    resetIdleTimer();
    classesApi.list()
      .then(setClasses)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [identifiedUser, router, resetIdleTimer]);

  const today = new Date();
  const todayDayName = DAYS_OF_WEEK[today.getDay()];

  const todayClasses = classes
    .filter(c => c.day?.toLowerCase() === todayDayName.toLowerCase())
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const handleConfirm = useCallback(() => {
    if (selectedClassIds.length === 0) return;
    router.push('/kiosk/confirm');
  }, [selectedClassIds, router]);

  if (!identifiedUser) return null;

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar
            src={identifiedUser.profile_image_url}
            firstName={identifiedUser.first_name}
            lastName={identifiedUser.last_name}
            offsetX={identifiedUser.image_offset_x}
            offsetY={identifiedUser.image_offset_y}
            size="lg"
          />
          <div>
            <h2 className="text-xl font-black font-headline text-[var(--foreground)]">
              {identifiedUser.first_name} {identifiedUser.last_name}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">{identifiedUser.rank} Belt</p>
          </div>
        </div>
        <button
          onClick={resetSession}
          className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-[var(--primary)]" />
        <p className="text-lg font-bold font-headline text-[var(--foreground)]">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Loading classes...</p>
        </div>
      ) : todayClasses.length === 0 ? (
        <div className="text-center py-12 bg-[var(--card)] rounded-xl border-2 border-dashed border-[var(--border)]">
          <p className="text-lg font-bold text-[var(--foreground)] font-headline mb-2">No Classes Today</p>
          <p className="text-[var(--muted-foreground)] mb-6">
            There are no scheduled classes for today.
          </p>
          <Button onClick={resetSession} variant="outline">
            Back to Home
          </Button>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          <p className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">
            Select your classes
          </p>
          {todayClasses.map(cls => {
            const isSelected = selectedClassIds.includes(cls.id);
            return (
              <button
                key={cls.id}
                onClick={() => { toggleClass(cls.id); resetIdleTimer(); }}
                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'bg-[var(--primary)]/10 border-[var(--primary)]'
                    : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--muted)]'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}>
                  {isSelected ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-lg font-bold">{cls.class_name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-[var(--foreground)] font-headline">
                    {cls.class_name}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {cls.time}
                  </p>
                </div>
                <div className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}>
                  {isSelected ? 'Selected' : 'Check In'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {todayClasses.length > 0 && (
        <div className="flex gap-3">
          {selectedClassIds.length > 0 && (
            <Button variant="outline" onClick={() => { clearClasses(); resetIdleTimer(); }} className="flex-1 h-14 text-base">
              Clear All
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={selectedClassIds.length === 0}
            className="flex-1 h-14 text-base font-bold"
          >
            {selectedClassIds.length === 0
              ? 'Select Classes to Check In'
              : `Check In to ${selectedClassIds.length} Class${selectedClassIds.length !== 1 ? 'es' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
