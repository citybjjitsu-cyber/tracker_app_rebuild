'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { KioskProvider, useKiosk } from '@/app/kiosk/KioskContext';
import { KioskLocked } from '@/app/kiosk/KioskLocked';
import { usersApi, kioskApi } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/hooks/useTheme';
import { Search, X, ChevronLeft, User as UserIcon, Shield, Lock as LockIcon, LogIn, Sun, Moon } from 'lucide-react';
import type { User } from '@/types';

function KioskContent() {
  const router = useRouter();
  const { isUnlocked, unlockedBy, lockKiosk, identifyUser } = useKiosk();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState<'welcome' | 'search' | 'pin'>('welcome');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const verifyingRef = useRef(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setSearchError('');
    try {
      const results = await usersApi.search(query);
      setSearchResults(results);
    } catch {
      setSearchError('Search failed. Try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectUser = useCallback((user: User) => {
    setSelectedUser(user);
    setPinValue('');
    setPinError('');
    setStep('pin');
  }, []);

  const handlePinDigit = useCallback(async (digit: number) => {
    if (pinValue.length >= 4 || verifyingRef.current || !selectedUser) return;
    const newPin = pinValue + digit;
    setPinValue(newPin);

    if (newPin.length === 4) {
      verifyingRef.current = true;
      setIsVerifying(true);
      setPinError('');
      try {
        const result = await kioskApi.verifyPinForUser(selectedUser.user_uuid, newPin);
        if (result.valid) {
          identifyUser(selectedUser);
          router.push('/kiosk/select');
        } else {
          setPinError('Invalid PIN. Please try again.');
          setPinValue('');
        }
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        if (err?.response?.status === 429) {
          setPinError('Too many attempts. Please wait.');
        } else {
          setPinError('Verification failed. Try again.');
        }
        setPinValue('');
      } finally {
        setIsVerifying(false);
        verifyingRef.current = false;
      }
    }
  }, [pinValue, selectedUser, identifyUser, router]);

  const handlePinBackspace = useCallback(() => {
    setPinValue(prev => prev.slice(0, -1));
    setPinError('');
  }, []);

  const goBack = useCallback(() => {
    if (step === 'pin') {
      setStep('search');
      setPinValue('');
      setPinError('');
      verifyingRef.current = false;
      setIsVerifying(false);
    } else {
      setStep('welcome');
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [step]);

  if (!isUnlocked) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <KioskLocked />
      </div>
    );
  }

  return (
    <>
      <div className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-[var(--muted-foreground)] tracking-wider uppercase">
            Kiosk
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--muted-foreground)]">
            {unlockedBy}
          </span>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-all"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          <a
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            Login
          </a>
          <button
            onClick={lockKiosk}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--destructive)]/30 transition-all"
          >
            <LockIcon className="w-3.5 h-3.5" />
            Lock
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {step === 'welcome' && (
          <div className="flex flex-col items-center gap-12">
            <button
              onClick={() => setStep('search')}
              className="flex flex-col items-center gap-6 p-16 rounded-3xl hover:bg-[var(--muted)]/50 transition-all duration-500 group cursor-pointer"
            >
              <div className="w-28 h-28 rounded-full bg-[var(--primary)]/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-[var(--primary)]/20 transition-all duration-500">
                <UserIcon className="w-14 h-14 text-[var(--primary)]" />
              </div>
              <div className="text-center">
                <h1 className="text-5xl font-black font-headline text-[var(--foreground)] mb-3 tracking-tight">
                  Find Your Name
                </h1>
                <p className="text-lg text-[var(--muted-foreground)]">
                  Search for your name to check in
                </p>
              </div>
            </button>
          </div>
        )}

        {step === 'search' && (
          <div className="w-full max-w-md mx-auto p-6">
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <h2 className="text-2xl font-black font-headline text-[var(--foreground)] mb-6 text-center">
              Find Your Name
            </h2>

            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                <Search className="w-5 h-5" />
              </div>
              <input
                placeholder="Type your name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
                className="w-full pl-12 h-14 text-lg bg-[var(--card)] border-2 border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {isSearching && (
              <p className="text-center text-[var(--muted-foreground)]">Searching...</p>
            )}

            {searchError && (
              <p className="text-center text-sm text-[var(--destructive)]">{searchError}</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((u) => (
                  <button
                    key={u.user_uuid}
                    onClick={() => handleSelectUser(u)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--muted)] transition-all text-left"
                  >
                    <Avatar
                      src={u.profile_image_url}
                      firstName={u.first_name}
                      lastName={u.last_name}
                      offsetX={u.image_offset_x}
                      offsetY={u.image_offset_y}
                      size="lg"
                    />
                    <div>
                      <p className="font-bold text-[var(--foreground)] font-headline">
                        {u.first_name} {u.last_name}
                      </p>
                      {u.nicknames && (
                        <p className="text-sm text-[var(--muted-foreground)]">{u.nicknames}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-center text-[var(--muted-foreground)] py-8">
                No students found. Try a different name.
              </p>
            )}
          </div>
        )}

        {step === 'pin' && (
          <div className="w-full max-w-sm mx-auto p-6">
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Change Name
            </button>

            {selectedUser && (
              <div className="flex flex-col items-center mb-8">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-[var(--primary)] to-transparent mb-4">
                  <Avatar
                    src={selectedUser.profile_image_url}
                    firstName={selectedUser.first_name}
                    lastName={selectedUser.last_name}
                    offsetX={selectedUser.image_offset_x}
                    offsetY={selectedUser.image_offset_y}
                    size="xl"
                  />
                </div>
                <h2 className="text-2xl font-black font-headline text-[var(--foreground)]">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">{selectedUser.rank} Belt</p>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold font-headline text-[var(--foreground)] mb-1">
                Enter Your PIN
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Confirm your identity to continue
              </p>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-14 h-16 rounded-xl bg-[var(--card)] border-2 flex items-center justify-center text-2xl font-bold text-[var(--foreground)] transition-all"
                  style={{
                    borderColor: pinValue[i] ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  {isVerifying && pinValue[i] ? (
                    <span className="animate-pulse">•</span>
                  ) : pinValue[i] ? (
                    '•'
                  ) : (
                    ''
                  )}
                </div>
              ))}
            </div>

            {pinError && (
              <p className="text-center text-sm text-[var(--destructive)] mb-4 bg-[var(--destructive)]/10 p-3 rounded-lg">
                {pinError}
              </p>
            )}

            {isVerifying && !pinError && (
              <p className="text-center text-sm text-[var(--muted-foreground)] mb-4">
                Verifying...
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button
                  key={n}
                  onClick={() => handlePinDigit(n)}
                  disabled={isVerifying}
                  className="h-16 rounded-xl bg-[var(--card)] hover:bg-[var(--muted)] active:scale-95 transition-all text-xl font-bold text-[var(--foreground)] disabled:opacity-50"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => handlePinDigit(0)}
                disabled={isVerifying}
                className="h-16 rounded-xl bg-[var(--card)] hover:bg-[var(--muted)] active:scale-95 transition-all text-xl font-bold text-[var(--foreground)] disabled:opacity-50"
              >
                0
              </button>
              <button
                onClick={handlePinBackspace}
                disabled={isVerifying || pinValue.length === 0}
                className="h-16 rounded-xl bg-[var(--card)] hover:bg-[var(--muted)] active:scale-95 transition-all text-lg text-[var(--muted-foreground)] disabled:opacity-30"
              >
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <KioskProvider>
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <KioskContent />
      </div>
    </KioskProvider>
  );
}
