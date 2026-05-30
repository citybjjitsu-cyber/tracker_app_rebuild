import { cn, getRankColor } from '@/lib/utils';
import { Award } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        {
          'bg-[var(--muted)] text-[var(--foreground)]': variant === 'default',
          'border border-[var(--border)] text-[var(--foreground)]': variant === 'outline',
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400': variant === 'success',
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400': variant === 'warning',
          'bg-[var(--destructive)]/10 text-[var(--destructive)]': variant === 'error',
        },
        {
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-0.5 text-xs': size === 'md',
        },
        className
      )}
    >
      {children}
    </span>
  );
}

export function RankBadge({ rank, showIcon = true }: { rank?: string; showIcon?: boolean }) {
  if (!rank) return null;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        getRankColor(rank)
      )}
    >
      {showIcon && <Award className="w-3 h-3" />}
      {rank}
    </span>
  );
}
