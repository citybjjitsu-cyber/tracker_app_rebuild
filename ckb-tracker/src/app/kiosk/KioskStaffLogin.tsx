'use client';

import { useState } from 'react';
import { useKiosk } from './KioskContext';
import { Shield, Mail, Lock, AlertCircle, X } from 'lucide-react';

interface KioskStaffLoginProps {
  onCancel: () => void;
}

export function KioskStaffLogin({ onCancel }: KioskStaffLoginProps) {
  const { unlockKiosk, setError: setKioskError } = useKiosk();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await unlockKiosk(email, password);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } }; message?: string };
      const message = errObj?.response?.data?.detail || errObj?.message || 'Invalid credentials';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-6">
      <button
        onClick={onCancel}
        className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
      >
        <X className="w-4 h-4" />
        Cancel
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-[var(--primary)]" />
        </div>
        <h2 className="text-2xl font-black font-headline text-[var(--foreground)]">
          Staff Sign In
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Unlock the kiosk to enable student check-in
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 rounded-lg text-[var(--destructive)] text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-[var(--muted-foreground)]">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]/50" />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--card)] border-2 border-[var(--border)] rounded-xl pl-11 pr-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all outline-none"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-[var(--muted-foreground)]">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]/50" />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--card)] border-2 border-[var(--border)] rounded-xl pl-11 pr-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all outline-none"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 text-base font-bold bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? 'Unlocking...' : 'Unlock Kiosk'}
        </button>
      </form>
    </div>
  );
}
