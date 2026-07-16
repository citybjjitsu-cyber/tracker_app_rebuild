'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useKiosk } from '../KioskContext';
import { classesApi, attendanceApi } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { RankBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, ChevronLeft, Loader2, X } from 'lucide-react';
import type { ClassSchedule } from '@/types';

export default function KioskConfirmPage() {
  const router = useRouter();
  const { identifiedUser, selectedClassIds, resetSession, resetIdleTimer, setLoading, isLoading, error, setError } = useKiosk();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [success, setSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!identifiedUser || selectedClassIds.length === 0) {
      router.push('/');
      return;
    }
    resetIdleTimer();
    classesApi.list()
      .then(setClasses)
      .catch(console.error);
  }, [identifiedUser, selectedClassIds, router, resetIdleTimer]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const selectedClasses = classes.filter(c => selectedClassIds.includes(c.id));

  const handleConfirm = useCallback(async () => {
    if (!identifiedUser || selectedClassIds.length === 0) return;
    setLoading(true);
    setError('');
    try {
      await attendanceApi.bulkCheckIn(identifiedUser.user_uuid, selectedClassIds);
      setSuccess(true);
      successTimerRef.current = setTimeout(() => {
        resetSession();
      }, 5000);
    } catch {
      setError('Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [identifiedUser, selectedClassIds, setLoading, setError, resetSession]);

  const handleGoBack = useCallback(() => {
    router.push('/kiosk/select');
  }, [router]);

  if (!identifiedUser || selectedClassIds.length === 0) return null;

  if (success) {
    return (
      <div className="flex flex-col items-center gap-8 p-12 animate-in">
        <div className="w-28 h-28 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>
        <div className="text-center">
          <h2 className="text-4xl font-black font-headline text-[var(--foreground)] mb-2">
            Checked In!
          </h2>
          <p className="text-lg text-[var(--muted-foreground)]">
            You&apos;re signed in to {selectedClassIds.length} class{selectedClassIds.length !== 1 ? 'es' : ''}
          </p>
        </div>
        {identifiedUser && (
          <div className="flex items-center gap-3 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
            <Avatar
              src={identifiedUser.profile_image_url}
              firstName={identifiedUser.first_name}
              lastName={identifiedUser.last_name}
              offsetX={identifiedUser.image_offset_x}
              offsetY={identifiedUser.image_offset_y}
              size="md"
            />
            <div>
              <p className="font-bold text-[var(--foreground)] font-headline">
                {identifiedUser.first_name} {identifiedUser.last_name}
              </p>
              <RankBadge rank={identifiedUser.rank} degree={identifiedUser.rank_tier?.degree} />
            </div>
          </div>
        )}
        <p className="text-sm text-[var(--muted-foreground)] animate-pulse">
          Returning to welcome screen...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <button
        onClick={handleGoBack}
        disabled={isLoading}
        className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors disabled:opacity-50"
      >
        <ChevronLeft className="w-4 h-4" />
        Change Classes
      </button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-black font-headline text-[var(--foreground)] mb-2">
          Confirm Check-In
        </h2>
        <p className="text-[var(--muted-foreground)]">
          Review your selection before confirming
        </p>
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--border)]">
          <div className="relative">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-[var(--primary)] to-transparent">
              <Avatar
                src={identifiedUser.profile_image_url}
                firstName={identifiedUser.first_name}
                lastName={identifiedUser.last_name}
                offsetX={identifiedUser.image_offset_x}
                offsetY={identifiedUser.image_offset_y}
                size="xl"
              />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black font-headline text-[var(--foreground)]">
              {identifiedUser.first_name} {identifiedUser.last_name}
            </h3>
            <RankBadge rank={identifiedUser.rank} degree={identifiedUser.rank_tier?.degree} />
          </div>
        </div>

        <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
          Selected Classes ({selectedClassIds.length})
        </p>
        <div className="space-y-2">
          {selectedClasses.map(cls => (
            <div
              key={cls.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)]"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-bold text-[var(--foreground)] text-sm font-headline">{cls.class_name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{cls.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-center text-sm text-[var(--destructive)] mb-4 bg-[var(--destructive)]/10 p-3 rounded-lg">
          {error}
        </p>
      )}

      <Button
        onClick={handleConfirm}
        disabled={isLoading}
        isLoading={isLoading}
        className="w-full h-14 text-base font-bold"
      >
        {isLoading ? 'Checking in...' : `Confirm Check-In`}
      </Button>

      <div className="text-center mt-4">
        <button
          onClick={resetSession}
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel check-in
        </button>
      </div>
    </div>
  );
}
