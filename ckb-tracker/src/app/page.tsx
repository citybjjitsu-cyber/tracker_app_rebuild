'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { classesApi, newsApi } from '@/lib/api';
import type { News, ClassSchedule } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Lock, Mail, AlertCircle, CalendarDays } from 'lucide-react';
import { DAYS_OF_WEEK } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, roles, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    classesApi.list().then(setClasses).catch(console.error);
    newsApi.list(true).then(setNews).catch(console.error);
  }, []);

  useEffect(() => {
    if (!authLoading && loginAttempted && user && roles.length > 0) {
      const isTeacher = roles.some(r => r.name === 'Teacher');
      const isAdmin = roles.some(r => r.name === 'Admin');
      const isTablet = roles.some(r => r.name === 'Tablet');
      if (isTablet) router.push('/check-in');
      else if (isTeacher) router.push('/teacher');
      else if (isAdmin) router.push('/admin');
      else router.push('/portal');
      setLoginAttempted(false);
    }
  }, [authLoading, user, roles, loginAttempted, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && roles.length > 0) {
      const isTeacher = roles.some(r => r.name === 'Teacher');
      const isAdmin = roles.some(r => r.name === 'Admin');
      const isTablet = roles.some(r => r.name === 'Tablet');
      if (isTablet) router.push('/check-in');
      else if (isTeacher) router.push('/teacher');
      else if (isAdmin) router.push('/admin');
      else router.push('/portal');
    }
  }, [authLoading, isAuthenticated, user, roles, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsFormLoading(true);
    setLoginAttempted(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      setError(message);
      setLoginAttempted(false);
    } finally {
      setIsFormLoading(false);
    }
  };

  const getClassesForDay = (dayName: string) => {
    return classes.filter(c => c.day?.toLowerCase() === dayName.toLowerCase()).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  const today = new Date();
  const todayDayName = DAYS_OF_WEEK[today.getDay()];
  const todayDate = today.getDate();

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDateForDay = (dayName: string) => {
    const today = new Date();
    const dayIndex = DAYS_OF_WEEK.indexOf(dayName);
    const diff = dayIndex - today.getDay();
    const date = new Date(today);
    date.setDate(today.getDate() + diff);
    return date.getDate();
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Hero / Login Section */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-grid">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary-container/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-primary-container/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="z-10 w-full max-w-md">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-primary-container flex items-center justify-center rounded-xl shadow-2xl shadow-primary-container/20 mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-headline text-4xl font-black uppercase tracking-tighter text-on-surface">
              CKB <span className="text-primary-container">Tracker</span>
            </h1>
            <p className="font-label text-on-surface-variant tracking-[0.2em] uppercase text-[10px] mt-2 font-bold">
              Elite Performance
            </p>
          </div>

          <GlassPanel className="p-8 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-container/20 border border-error/30 rounded-lg text-on-error-container text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
                  Email Identity
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  <input
                    type="email"
                    placeholder="fighter@ckbtracker.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg pl-11 pr-4 py-3 text-on-surface placeholder:text-neutral-700 focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
                  Secure Protocol
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg pl-11 pr-4 py-3 text-on-surface placeholder:text-neutral-700 focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isFormLoading}
                className="w-full bg-primary-container hover:bg-inverse-primary text-on-primary-container font-headline font-bold uppercase tracking-widest py-4 rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-primary-container/20 disabled:opacity-50"
              >
                {isFormLoading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </GlassPanel>
        </div>

        <div className="mt-20 flex flex-col items-center gap-2 text-neutral-600 animate-bounce">
          <span className="text-[10px] font-black tracking-widest uppercase">Field Intel</span>
          <CalendarDays className="w-5 h-5" />
        </div>
      </div>

      {/* Class Schedule Section */}
      <main className="max-w-7xl mx-auto px-6 py-24 space-y-32">
        <section>
          <SectionHeader
            title="Class"
            accent="Schedule"
            description="Weekly combat rotations and performance drills for the CKB Tracker elite tier."
          >
            <div className="flex items-center gap-4">
              <span className="font-headline font-bold tracking-widest uppercase text-sm text-on-surface-variant">
                {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — {new Date(today.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </span>
            </div>
          </SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map((day) => {
              const dayClasses = getClassesForDay(day);
              const isTodayDay = day === todayDayName;
              const dateNum = getDateForDay(day);

              return isTodayDay ? (
                <div key={day} className="relative p-6 rounded-xl border border-primary-container/50 bg-primary-container/10 flex flex-col min-h-[220px] shadow-2xl shadow-primary-container/20">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-container text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                    Today
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-container mb-2">{day.slice(0, 3)}</span>
                  <span className="text-2xl font-black font-headline mb-6 text-on-surface">{dateNum}</span>
                  <div className="space-y-3 mt-auto">
                    {dayClasses.length > 0 ? dayClasses.map((cls) => (
                      <div key={cls.id} className="p-3 bg-primary-container rounded-lg shadow-lg">
                        <p className="text-[10px] font-black text-white/70 uppercase">{formatTime(cls.time || '')}</p>
                        <p className="text-xs font-black text-white">{cls.class_name}</p>
                      </div>
                    )) : (
                      <div className="p-3 bg-surface-container-lowest/50 rounded-lg border-l-2 border-primary-container/30">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase">Rest Day</p>
                        <p className="text-xs font-bold text-on-surface">No sessions</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <GlassPanel key={day} className={`p-6 flex flex-col min-h-[220px] ${dayClasses.length === 0 ? 'opacity-50' : ''}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">{day.slice(0, 3)}</span>
                  <span className="text-2xl font-black font-headline mb-6">{dateNum}</span>
                  <div className="space-y-3 mt-auto">
                    {dayClasses.length > 0 ? dayClasses.map((cls) => (
                      <div key={cls.id} className="p-3 bg-surface-container-lowest rounded-lg border-l-2 border-primary-container/30">
                        <p className="text-[10px] font-bold text-primary-container uppercase">{formatTime(cls.time || '')}</p>
                        <p className="text-xs font-bold text-on-surface">{cls.class_name}</p>
                      </div>
                    )) : (
                      <p className="text-[10px] font-black text-neutral-600 uppercase italic">No classes</p>
                    )}
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        </section>

        {/* News Section */}
        {news.length > 0 && (
          <section>
            <SectionHeader
              title="News"
              accent="Updates"
            >
              <div className="h-1 flex-grow bg-surface-container-high rounded-full hidden md:block max-w-xs">
                <div className="h-full w-24 bg-primary-container rounded-full" />
              </div>
            </SectionHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {news.slice(0, 3).map((item) => (
                <article key={item.id} className="group relative bg-surface-container-low rounded-xl overflow-hidden transition-all hover:-translate-y-2">
                  <div className="aspect-[16/10] overflow-hidden bg-surface-container-high flex items-center justify-center">
                    <div className="w-full h-full bg-gradient-to-br from-surface-container-high to-surface-container-lowest flex items-center justify-center">
                      <Shield className="w-12 h-12 text-primary-container/30" />
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black text-primary-container uppercase tracking-widest border border-primary-container/30 px-2 py-0.5 rounded">
                        Update
                      </span>
                      <span className="text-[10px] font-medium text-neutral-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-headline text-xl font-bold mb-3 leading-tight text-on-surface group-hover:text-primary-container transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant/10 py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary-container" />
            <span className="font-headline font-black text-lg uppercase tracking-tight">
              CKB <span className="text-primary-container">Tracker</span>
            </span>
          </div>
          <div className="flex gap-8">
            <a className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors" href="#">
              Privacy Protocol
            </a>
            <a className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors" href="#">
              Service Terms
            </a>
            <a className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors" href="#">
              Contact Command
            </a>
          </div>
          <p className="text-[10px] font-medium text-neutral-700">
            &copy; {new Date().getFullYear()} CKB Tracker / Kinetic Precision System
          </p>
        </div>
      </footer>
    </div>
  );
}
