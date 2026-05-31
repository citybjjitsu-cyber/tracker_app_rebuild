import { cn } from '@/lib/utils'

interface DataStripProps {
  children: React.ReactNode
  className?: string
  active?: boolean
  onClick?: () => void
}

export function DataStrip({ children, className, active = false, onClick }: DataStripProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border-l-[3px] transition-all duration-200',
        active
          ? 'bg-surface-container-low border-primary-container'
          : 'bg-surface-container-low border-outline-variant/30 hover:bg-surface-container-high',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
