'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from '@/components/ui/Avatar';
import { 
  UserCog, 
  GraduationCap, 
  LogOut,
  Menu,
  X,
  Shield,
  Sun,
  Moon,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  requiresTeacher?: boolean;
  requiresAdmin?: boolean;
  requiresTablet?: boolean;
}

const navItems: NavItem[] = [
  { href: '/check-in', label: 'Check In', icon: CheckCircle, requiresAuth: true },
  { href: '/portal', label: 'Student Portal', icon: UserCog, requiresAuth: true },
  { href: '/teacher', label: 'Teacher', icon: GraduationCap, requiresTeacher: true },
  { href: '/admin', label: 'Admin', icon: Shield, requiresAdmin: true },
];

function SidebarContent({ 
  isCollapsed, 
  isAuthenticated, 
  user, 
  logout, 
  theme, 
  toggleTheme,
  setIsCollapsed,
  setIsMobileOpen,
  roles
}: { 
  isCollapsed: boolean;
  isAuthenticated: boolean;
  user: any;
  logout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setIsCollapsed: (v: boolean) => void;
  setIsMobileOpen: (v: boolean) => void;
  roles?: string[];
}) {
  const pathname = usePathname();
  const isTablet = roles?.some((r: string) => r === 'Tablet');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shouldShowItem = (item: NavItem) => {
    if (item.requiresTablet && !isTablet) return false;
    if (item.requiresTeacher && !roles?.some((r: string) => r === 'Teacher')) return false;
    if (item.requiresAdmin && !roles?.some((r: string) => r === 'Admin')) return false;
    if (item.requiresAuth && !isAuthenticated) return false;
    return true;
  };
  
  return (
    <div className={cn(
      "flex flex-col h-full",
      isCollapsed ? "px-3" : "px-4"
    )}>
      <div className={cn(
        "flex items-center h-16",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
              <Shield className="w-4 h-4 text-on-primary-container" />
            </div>
            <span className="font-headline font-bold text-on-surface text-lg tracking-tight">CKB <span className="text-primary-container">Tracker</span></span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/" className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
            <Shield className="w-4 h-4 text-on-primary-container" />
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2">
        {mounted && (
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
              "text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-high",
              isCollapsed && "justify-center px-2"
            )}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
            {!isCollapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {navItems.filter(shouldShowItem).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg font-label text-sm tracking-wider uppercase transition-all duration-200",
                isActive
                  ? "bg-red-900/20 text-red-500 border-l-4 border-red-600 rounded-l-none"
                  : "text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-high",
                isCollapsed && "justify-center px-2 border-l-0 rounded-lg"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 flex-shrink-0",
                isActive ? "text-red-500" : ""
              )} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!isCollapsed && (
        <div className="px-3 mb-4">
          <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary-container/10 border border-primary-container/20 text-primary-container font-label text-sm tracking-wider uppercase hover:bg-primary-container/20 transition-all">
            <Zap className="w-4 h-4" />
            Quick Strike
          </button>
        </div>
      )}

      <div className="py-4">
        {isAuthenticated && user ? (
          <div className={cn(
            "flex items-center gap-3 px-3",
            isCollapsed && "justify-center"
          )}>
            <Avatar
              src={user.profile_image_url}
              firstName={user.first_name}
              lastName={user.last_name}
              offsetX={user.image_offset_x}
              offsetY={user.image_offset_y}
              size="sm"
              className="ring-2 ring-surface-container-high"
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-label text-on-surface truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-on-surface-variant/70 truncate">{user.email}</p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-high transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : !isCollapsed ? (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 mx-3 py-2 rounded-lg bg-primary-container text-on-primary-container font-label text-sm tracking-wider uppercase hover:bg-inverse-primary transition-colors"
          >
            Sign In
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isAuthenticated, user, logout, roles } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg glass-panel text-on-surface shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40 animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-surface border-r border-outline-variant/20 transition-all duration-300 z-40",
        isCollapsed ? "w-[72px]" : "w-[var(--sidebar-width)]"
      )}>
        <SidebarContent 
          isCollapsed={isCollapsed}
          isAuthenticated={isAuthenticated}
          user={user}
          logout={logout}
          theme={theme}
          toggleTheme={toggleTheme}
          setIsCollapsed={setIsCollapsed}
          setIsMobileOpen={setIsMobileOpen}
          roles={roles?.map(r => r.name)}
        />
      </aside>

      <aside className={cn(
        "lg:hidden flex flex-col fixed left-0 top-0 h-screen w-[var(--sidebar-width)] bg-surface border-r border-outline-variant/20 transition-transform duration-300 z-50",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-end p-4">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-high"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent 
          isCollapsed={isCollapsed}
          isAuthenticated={isAuthenticated}
          user={user}
          logout={logout}
          theme={theme}
          toggleTheme={toggleTheme}
          setIsCollapsed={setIsCollapsed}
          setIsMobileOpen={setIsMobileOpen}
          roles={roles?.map(r => r.name)}
        />
      </aside>
    </>
  );
}
