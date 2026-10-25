'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { kioskApi, membershipsApi, setActiveGymId, setKioskStaffToken, setOnKioskLock } from '@/lib/api';
import type { KioskGymMembership } from '@/lib/api';
import type { User } from '@/types';

const DEFAULT_IDLE_TIMEOUT_MS = 240 * 60 * 1000;

interface KioskContextType {
  isUnlocked: boolean;
  unlockedBy: string | null;
  identifiedUser: User | null;
  selectedClassIds: number[];
  gymMemberships: KioskGymMembership[];
  activeGymId: number | null;
  setActiveGymIdForKiosk: (gymId: number) => void;
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

  const [identifiedUser, setIdentifiedUser] = useState<User | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [gymMemberships, setGymMemberships] = useState<KioskGymMembership[]>([]);
  const [activeGymId, setActiveGymIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutMs = useRef(DEFAULT_IDLE_TIMEOUT_MS);

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
    setGymMemberships([]);
    setActiveGymIdState(null);
    setActiveGymId(null);
    setIsUnlocked(false);
    setUnlockedBy(null);
    setError('');
    clearIdleTimer();
    router.push('/');
  }, [router, clearIdleTimer]);

  const resetSession = useCallback(() => {
    setIdentifiedUser(null);
    setSelectedClassIds([]);
    setError('');
    clearIdleTimer();
  }, [clearIdleTimer]);

  const unlockKiosk = useCallback(async (email: string, password: string) => {
    const data = await kioskApi.unlock(email, password);
    const memberships = await membershipsApi.me();
    const selectedGym = memberships.find(item => item.is_primary) || memberships[0];
    setIsUnlocked(true);
    setUnlockedBy(`${data.user.first_name} ${data.user.last_name}`);
    setError('');
    setIdentifiedUser(null);
    setSelectedClassIds([]);
    setGymMemberships(memberships);
    setActiveGymIdState(selectedGym?.gym_id ?? null);
    setActiveGymId(selectedGym?.gym_id ?? null);
    if (data.idle_timeout_minutes) {
      idleTimeoutMs.current = data.idle_timeout_minutes * 60 * 1000;
    }
  }, []);

  const identifyUser = useCallback((user: User) => {
    setIdentifiedUser(user);
    setSelectedClassIds([]);
    setError('');
  }, []);

  const setActiveGymIdForKiosk = useCallback((gymId: number) => {
    if (!gymMemberships.some(membership => membership.gym_id === gymId)) return;
    setActiveGymIdState(gymId);
    setActiveGymId(gymId);
    setIdentifiedUser(null);
    setSelectedClassIds([]);
  }, [gymMemberships]);

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
      }, idleTimeoutMs.current);
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

  useEffect(() => {
    setOnKioskLock(lockKiosk);
    return () => setOnKioskLock(null);
  }, [lockKiosk]);

  return (
    <KioskContext.Provider
      value={{
        isUnlocked,
        unlockedBy,
        identifiedUser,
        selectedClassIds,
        gymMemberships,
        activeGymId,
        setActiveGymIdForKiosk,
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
