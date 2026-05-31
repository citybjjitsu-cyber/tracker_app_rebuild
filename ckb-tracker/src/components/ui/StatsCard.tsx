import { cn } from '@/lib/utils'
import { GlassPanel } from './GlassPanel'

interface StatsCardProps {
  label: string
  value: string | number
  sublabel?: string
  className?: string
  accent?: boolean
}

export function StatsCard({ label, value, sublabel, className, accent = false }: StatsCardProps) {
  return (
    <GlassPanel className={cn('p-4', accent && 'border-primary-container/30', className)}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
        {label}
      </p>
      <p className={cn(
        'text-2xl font-black font-headline text-on-surface',
        accent && 'text-primary-container'
      )}>
        {value}
      </p>
      {sublabel && (
        <p className="text-[10px] text-neutral-500 mt-0.5">{sublabel}</p>
      )}
    </GlassPanel>
  )
}
