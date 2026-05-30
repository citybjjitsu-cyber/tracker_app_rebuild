'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi, classesApi, newsApi } from '@/lib/api';
import type { News, ClassSchedule } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { 
  Shield, 
  Lock, 
  Mail, 
  AlertCircle,
  Calendar,
  Newspaper,
  LogIn
} from 'lucide-react';

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

  useEffect(() => {
    classesApi.list().then(setClasses).catch(console.error);
    newsApi.list(true).then(setNews).catch(console.error);
  }, []);

  const isTeacher = roles.some(r => r.name === 'Teacher');
  const isAdmin = roles.some(r => r.name === 'Admin');
  const isTablet = roles.some(r => r.name === 'Tablet');

  useEffect(() => {
    if (!authLoading && loginAttempted && user && roles.length > 0) {
      const isTeacher = roles.some(r => r.name === 'Teacher');
      const isAdmin = roles.some(r => r.name === 'Admin');
      const isTablet = roles.some(r => r.name === 'Tablet');

      if (isTablet) {
        router.push('/check-in');
      } else if (isTeacher) {
        router.push('/teacher');
      } else if (isAdmin) {
        router.push('/admin');
      } else {
        router.push('/portal');
      }
      setLoginAttempted(false);
    }
  }, [authLoading, user, roles, loginAttempted, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && roles.length > 0) {
      const isTeacher = roles.some(r => r.name === 'Teacher');
      const isAdmin = roles.some(r => r.name === 'Admin');
      const isTablet = roles.some(r => r.name === 'Tablet');

      if (isTablet) {
        router.push('/check-in');
      } else if (isTeacher) {
        router.push('/teacher');
      } else if (isAdmin) {
        router.push('/admin');
      } else {
        router.push('/portal');
      }
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

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[var(--primary)] to-[var(--primary)] rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-10 h-10 text-[var(--primary-foreground)]" />
          </div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">CKB Tracker</h1>
          <p className="text-[var(--muted-foreground)]">Welcome to our martial arts school</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--primary)]" />
              Class Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">This Week&apos;s Schedule</h3>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const dayClasses = getClassesForDay(day);
                const isTodayDay = day === todayDayName;
                
                return (
                  <div 
                    key={day} 
                    className={`
                      min-h-[180px] rounded-lg p-2 border
                      ${isTodayDay 
                        ? 'bg-[var(--primary)]/10 border-[var(--primary)]/50' 
                        : 'bg-[var(--muted)] border-[var(--border)]'}
                    `}
                  >
                    <div className={`
                      text-center font-semibold text-sm mb-2 pb-2 border-b 
                      ${isTodayDay ? 'text-[var(--primary)] border-[var(--primary)]/30' : 'text-[var(--muted-foreground)] border-[var(--border)]'}
                    `}>
                      {day}
                    </div>
                    <div className="space-y-2">
                      {dayClasses.length > 0 ? (
                        dayClasses.map((cls) => (
                          <div
                            key={cls.id}
                            className="p-2 bg-[var(--muted)] rounded-lg border border-[var(--border)] opacity-75"
                          >
                            <p className="font-medium text-xs text-[var(--foreground)] truncate">{cls.class_name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{cls.time}</p>
                            <p className="text-xs font-medium text-[var(--primary)]">{cls.points} pts</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)] text-center py-2">No classes</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="w-5 h-5 text-[var(--primary)]" />
                Sign In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-lg text-[var(--destructive)] text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--foreground)]">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--foreground)]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isFormLoading}
                >
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>

          {news.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-[var(--primary)]" />
                  News & Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {news.slice(0, 3).map(item => (
                  <div key={item.id} className="pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                    <h4 className="font-medium text-[var(--foreground)] mb-1">{item.title}</h4>
                    <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{item.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="text-center">
          <p className="text-[var(--muted-foreground)] text-sm">
            Need help? Contact us at info@ckbtracker.com
          </p>
        </div>
      </div>
    </div>
  );
}
