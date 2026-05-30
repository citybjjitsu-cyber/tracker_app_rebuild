import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type = 'text', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            id={inputId}
            ref={ref}
            className={cn(
              'flex h-11 w-full rounded-lg border bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)]',
              'placeholder:text-[var(--muted-foreground)]',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-[var(--destructive)] focus:ring-[var(--destructive)]'
                : 'border-[var(--input)] focus:border-[var(--ring)] focus:ring-[var(--ring)]',
              className
            )}
            {...props}
          />
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--destructive)]">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[var(--destructive)] flex items-center gap-1">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
