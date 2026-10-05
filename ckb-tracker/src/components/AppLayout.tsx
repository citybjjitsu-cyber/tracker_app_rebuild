'use client';

import { usePathname } from 'next/navigation';
import { MobileNavigation, Sidebar } from '@/components/layout/Sidebar';

const publicRoutes = ['/', '/login', '/check-in', '/news', '/kiosk', '/kiosk/select', '/kiosk/confirm'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.includes(pathname);

  if (pathname === '/check-in') {
    return (
      <>
        <MobileNavigation />
        <main className="min-h-screen">
          <div className="check-in-page-shell mx-auto max-w-6xl px-4 pb-6 sm:px-6">
            {children}
          </div>
        </main>
      </>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="lg:ml-[var(--sidebar-width)] min-h-screen transition-all duration-300">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </>
  );
}
