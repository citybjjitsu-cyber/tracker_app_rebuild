'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function NetworkStatusBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (isOnline) return null;

  return (
    <div role="status" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-error-container px-4 py-2 text-center text-sm text-on-error-container">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>You&apos;re offline. Server-backed changes are unavailable until the connection returns.</span>
    </div>
  );
}
