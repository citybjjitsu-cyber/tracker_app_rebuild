'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Check, UserPlus, Users, Settings } from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();
  const navItems = [
    { href: '/', label: 'Check In', icon: Check },
    { href: '/portal', label: 'Student Portal', icon: UserPlus },
    { href: '/teacher', label: 'Teacher', icon: Users },
    { href: '/admin', label: 'Admin', icon: Settings },
  ];

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mr-8">CKB Tracker</h1>
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href 
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
