import { CATEGORIES, type NodeTypeDef } from '@/lib/nodeCatalog'
import { cn } from '@/lib/cn'

interface Props {
  def: NodeTypeDef
  size?: 'sm' | 'md'
  className?: string
}

export function NodeIcon({ def, size = 'md', className }: Props) {
  const cat = CATEGORIES[def.category]
  const Icon = def.icon
  const dim = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-xl'
  const iconDim = size === 'sm' ? 'h-4 w-4' : 'h-[22px] w-[22px]'
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center text-white shadow-sm',
        dim,
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(145deg, ${cat.from}, ${cat.to})`,
        boxShadow: `0 4px 12px -3px ${cat.to}66`,
      }}
    >
      <Icon className={iconDim} strokeWidth={2.2} />
    </div>
  )
}
