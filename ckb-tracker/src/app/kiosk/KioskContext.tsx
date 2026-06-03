'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

const IDLE_TIMEOUT_MS = 60000;

interface KioskContextType {
  identifiedUser: User | null;
  selectedClassIds: number[];
  isLoading: boolean;
  error: string;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  identifyUser: (user: User) => void;
  resetSession: () => void;
  toggleClass: (classId: number) => void;
  clearClasses: () => void;
  resetIdleTimer: () => void;
}

const KioskContext = createContext<KioskContextType | undefined>(undefined);

export function KioskProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [identifiedUser, setIdentifiedUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('kiosk_user');
      if (stored) {
        try { return JSON.parse(stored) as User; } catch { /* ignore */ }
      }
    }
    return null;
  });
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const resetSession = useCallback(() => {
    setIdentifiedUser(null);
    setSelectedClassIds([]);
    setError('');
    clearIdleTimer();
    sessionStorage.removeItem('kiosk_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('csrf_token');
    router.push('/kiosk');
  }, [router, clearIdleTimer]);

  const identifyUser = useCallback((user: User) => {
    setIdentifiedUser(user);
    sessionStorage.setItem('kiosk_user', JSON.stringify(user));
    setSelectedClassIds([]);
    setError('');
  }, []);

  const toggleClass = useCallback((classId: number) => {
    setSelectedClassIds(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  }, []);

  const clearClasses = useCallback(() => {
    setSelectedClassIds([]);
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearIdleTimer();
    if (identifiedUser) {
      idleTimerRef.current = setTimeout(() => {
        resetSession();
      }, IDLE_TIMEOUT_MS);
    }
  }, [identifiedUser, resetSession, clearIdleTimer]);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  useEffect(() => {
    if (!identifiedUser) return;

    const handleActivity = () => resetIdleTimer();
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, handleActivity));

    resetIdleTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearIdleTimer();
    };
  }, [identifiedUser, resetIdleTimer, clearIdleTimer]);

  return (
    <KioskContext.Provider
      value={{
        identifiedUser,
        selectedClassIds,
        isLoading,
        error,
        setError,
        setLoading,
        identifyUser,
        resetSession,
        toggleClass,
        clearClasses,
        resetIdleTimer,
      }}
    >
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk() {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error('useKiosk must be used within a KioskProvider');
  }
  return context;
}
