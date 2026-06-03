'use client';

import { KioskProvider } from './KioskContext';

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <KioskProvider>
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <header className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">CKB</span>
          </div>
          <span className="text-sm font-bold text-[var(--muted-foreground)] tracking-wider uppercase">
            Kiosk
          </span>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>
      </div>
    </KioskProvider>
  );
}
