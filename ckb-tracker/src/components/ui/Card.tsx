import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-[var(--card)] shadow-sm border-[var(--border)]',
        'transition-all duration-200',
        hover && 'hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-[var(--border)]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
  description?: string;
}

export function CardTitle({ children, className, description }: CardTitleProps) {
  return (
    <div>
      <h3 className={cn('text-lg font-semibold text-[var(--foreground)]', className)}>
        {children}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
      )}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-[var(--border)] bg-[var(--muted)]/30',
        'rounded-b-xl',
        className
      )}
    >
      {children}
    </div>
  );
}
