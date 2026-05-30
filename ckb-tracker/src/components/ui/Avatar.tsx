import { cn, getInitials } from '@/lib/utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  offsetX?: number;
  offsetY?: number;
  className?: string;
}

export function Avatar({ src, firstName = '', lastName = '', size = 'md', offsetX = 0, offsetY = 0, className }: AvatarProps) {
  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const initials = getInitials(firstName, lastName);
  const fullName = `${firstName} ${lastName}`.trim();

  const objectPosition = `${50 + offsetX * 50}% ${50 + offsetY * 50}%`;

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
  };

  const imageSrc = getImageUrl(src);

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={fullName || 'Avatar'}
        className={cn(
          'rounded-full object-cover ring-2 ring-[var(--card)]',
          'shadow-sm',
          sizeClasses[size],
          className
        )}
        style={{ objectPosition }}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold',
        'bg-gradient-to-br from-[var(--primary)] to-[var(--primary)] text-[var(--primary-foreground)]',
        'shadow-sm ring-2 ring-[var(--card)]',
        sizeClasses[size],
        className
      )}
      title={fullName}
    >
      {initials}
    </div>
  );
}
