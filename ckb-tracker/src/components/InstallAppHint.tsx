'use client';

import { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppHint() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    // Browser capabilities are only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsInstalled(standalone || (ios && 'standalone' in window.navigator && Boolean(window.navigator.standalone)));
    setIsIos(ios);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  if (isInstalled || (!installEvent && !isIos)) return null;

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <aside className="mt-6 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-on-surface-variant">
      <div className="flex items-start gap-3">
        {isIos ? <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
        <div className="space-y-2">
          <p className="font-label font-semibold text-on-surface">Use CKB Tracker like an app</p>
          {isIos ? (
            <p>In Safari, tap Share, then choose <span className="font-semibold text-on-surface">Add to Home Screen</span>.</p>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={install}>
              Install CKB Tracker
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
