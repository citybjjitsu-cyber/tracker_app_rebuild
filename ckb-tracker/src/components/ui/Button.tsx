import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
          className={cn(
            'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
            {
              'bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110 focus-visible:ring-[var(--primary)]':
                variant === 'primary',
              'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:brightness-110 focus-visible:ring-[var(--secondary)]':
                variant === 'secondary',
              'border-2 border-[var(--border)] bg-transparent hover:bg-[var(--muted)]':
                variant === 'outline',
              'bg-transparent hover:bg-[var(--muted)]':
                variant === 'ghost',
              'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:brightness-110 focus-visible:ring-[var(--destructive)]':
                variant === 'destructive',
              'bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110 focus-visible:ring-[var(--primary)] shadow-sm':
                variant === 'success',
            },
          {
            'h-8 px-3 text-xs': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
