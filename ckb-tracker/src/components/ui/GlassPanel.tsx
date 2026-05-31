import { cn } from '@/lib/utils'

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  as?: 'div' | 'button' | 'article'
  onClick?: () => void
}

export function GlassPanel({ children, className, hover = false, as: Component = 'div', onClick }: GlassPanelProps) {
  return (
    <Component
      onClick={onClick}
      className={cn(
        'glass-panel rounded-xl border border-outline-variant/10',
        hover && 'transition-all duration-200 hover:border-primary-container/30 hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </Component>
  )
}
