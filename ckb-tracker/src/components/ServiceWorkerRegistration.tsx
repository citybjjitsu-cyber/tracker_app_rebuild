'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    let hadController = Boolean(navigator.serviceWorker.controller);
    let reloadedForUpdate = false;

    const handleControllerChange = () => {
      if (hadController && !reloadedForUpdate) {
        reloadedForUpdate = true;
        window.location.reload();
      }
      hadController = true;
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA enhancements must never prevent the web app from loading.
    });

    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  return null;
}
