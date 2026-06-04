'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, roles, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && roles.length > 0) {
      const roleNames = roles.map((r: { name: string }) => r.name);
      if (roleNames.includes('Admin')) {
        router.push('/admin');
      } else if (roleNames.includes('Teacher')) {
        router.push('/teacher');
      } else {
        router.push('/portal');
      }
    }
  }, [authLoading, isAuthenticated, user, roles, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md glass-panel rounded-xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-container flex items-center justify-center">
            <Shield className="w-8 h-8 text-on-primary-container" />
          </div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Sign <span className="text-primary-container">In</span></h1>
          <p className="text-on-surface-variant text-sm mt-1">CKB Tracker</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container/20 border border-error-container/30 rounded-lg text-error text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-label text-on-surface-variant">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/50" />
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
            <label className="text-sm font-label text-on-surface-variant">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/50" />
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
            isLoading={isLoading}
          >
            Sign In
          </Button>

          <div className="text-center pt-2">
            <a href="/" className="text-sm text-on-surface-variant/70 hover:text-on-surface transition-colors">
              ← Back to home
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
