import { cn } from '@/lib/utils'

interface PulseBadgeProps {
  className?: string
  color?: 'primary' | 'success'
}

export function PulseBadge({ className, color = 'primary' }: PulseBadgeProps) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full animate-pulse',
        color === 'primary' ? 'bg-primary' : 'bg-green-500',
        className
      )}
    />
  )
}
