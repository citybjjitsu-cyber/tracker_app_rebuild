'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { kioskApi, setKioskStaffToken } from '@/lib/api';
import type { User } from '@/types';

const IDLE_TIMEOUT_MS = 1800000;
const STORAGE_UNLOCKED_KEY = 'kiosk_is_unlocked';
const STORAGE_UNLOCKED_BY_KEY = 'kiosk_unlocked_by';

interface KioskContextType {
  isUnlocked: boolean;
  unlockedBy: string | null;
  identifiedUser: User | null;
  selectedClassIds: number[];
  isLoading: boolean;
  error: string;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  unlockKiosk: (email: string, password: string) => Promise<void>;
  lockKiosk: () => Promise<void>;
  identifyUser: (user: User) => void;
  resetSession: () => void;
  toggleClass: (classId: number) => void;
  clearClasses: () => void;
  resetIdleTimer: () => void;
}

const KioskContext = createContext<KioskContextType | undefined>(undefined);

export function KioskProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockedBy, setUnlockedBy] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_UNLOCKED_KEY);
    if (stored === 'true') {
      setIsUnlocked(true);
      const storedBy = sessionStorage.getItem(STORAGE_UNLOCKED_BY_KEY);
      setUnlockedBy(storedBy);
    }
  }, []);
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

  const lockKiosk = useCallback(async () => {
    try {
      await kioskApi.lock();
    } catch {
      // even if API call fails, clear local state
    }
    setKioskStaffToken(null);
    setIdentifiedUser(null);
    setSelectedClassIds([]);
    setIsUnlocked(false);
    setUnlockedBy(null);
    setError('');
    clearIdleTimer();
    sessionStorage.removeItem('kiosk_user');
    sessionStorage.removeItem(STORAGE_UNLOCKED_KEY);
    sessionStorage.removeItem(STORAGE_UNLOCKED_BY_KEY);
    router.push('/');
  }, [router, clearIdleTimer]);

  const resetSession = useCallback(() => {
    setIdentifiedUser(null);
    setSelectedClassIds([]);
    setError('');
    clearIdleTimer();
    sessionStorage.removeItem('kiosk_user');
  }, [clearIdleTimer]);

  const unlockKiosk = useCallback(async (email: string, password: string) => {
    const data = await kioskApi.unlock(email, password);
    setIsUnlocked(true);
    setUnlockedBy(`${data.user.first_name} ${data.user.last_name}`);
    setError('');
    setIdentifiedUser(null);
    setSelectedClassIds([]);
    sessionStorage.setItem(STORAGE_UNLOCKED_KEY, 'true');
    sessionStorage.setItem(STORAGE_UNLOCKED_BY_KEY, `${data.user.first_name} ${data.user.last_name}`);
  }, []);

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
    if (isUnlocked) {
      idleTimerRef.current = setTimeout(() => {
        lockKiosk();
      }, IDLE_TIMEOUT_MS);
    }
  }, [isUnlocked, lockKiosk, clearIdleTimer]);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    const handleActivity = () => resetIdleTimer();
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, handleActivity));

    resetIdleTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearIdleTimer();
    };
  }, [isUnlocked, resetIdleTimer, clearIdleTimer]);

  return (
    <KioskContext.Provider
      value={{
        isUnlocked,
        unlockedBy,
        identifiedUser,
        selectedClassIds,
        isLoading,
        error,
        setError,
        setLoading,
        unlockKiosk,
        lockKiosk,
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
