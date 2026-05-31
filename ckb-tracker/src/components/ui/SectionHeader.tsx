import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  accent?: string
  description?: string
  className?: string
  children?: React.ReactNode
}

export function SectionHeader({ title, accent, description, className, children }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4', className)}>
      <div>
        <h2 className="font-headline text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">
          {title}{accent && <span className="text-primary-container"> {accent}</span>}
        </h2>
        {description && (
          <p className="text-on-surface-variant font-medium max-w-md mt-2">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}
