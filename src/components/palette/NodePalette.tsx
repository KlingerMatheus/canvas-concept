import { useState } from 'react'
import { ChevronRight, GripVertical, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { cn } from '@/lib/cn'
import { CATEGORIES, NODE_TYPES, type CategoryId } from '@/lib/nodeCatalog'
import { NodeIcon } from '@/components/nodes/NodeIcon'

const ORDER: CategoryId[] = ['trigger', 'ai', 'io', 'prompt', 'data']

export function NodePalette() {
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({
    trigger: true,
    ai: true,
    io: true,
    prompt: true,
    data: true,
  })

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-border-soft bg-surface py-3">
        <button
          onClick={() => setCollapsed(false)}
          title="Expand components"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <div className="h-px w-6 bg-border-soft" />
        {ORDER.map((catId) => {
          const cat = CATEGORIES[catId]
          return (
            <button
              key={catId}
              onClick={() => setCollapsed(false)}
              title={cat.label}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform hover:scale-110"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: `linear-gradient(145deg, ${cat.from}, ${cat.to})` }}
              />
            </button>
          )
        })}
      </aside>
    )
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border-soft bg-surface">
      <div className="flex items-start justify-between px-4 pb-3 pt-4">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Components</h2>
          <p className="text-[11px] text-ink-muted">Drag onto the canvas</p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          title="Minimize"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-card-muted hover:text-ink"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {ORDER.map((catId) => {
          const cat = CATEGORIES[catId]
          const items = NODE_TYPES.filter((n) => n.category === catId)
          return (
            <Collapsible.Root
              key={catId}
              open={open[catId]}
              onOpenChange={(o) => setOpen((s) => ({ ...s, [catId]: o }))}
            >
              <Collapsible.Trigger className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted transition-colors hover:text-ink">
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    open[catId] && 'rotate-90',
                  )}
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: `linear-gradient(145deg, ${cat.from}, ${cat.to})` }}
                />
                {cat.label}
              </Collapsible.Trigger>
              <Collapsible.Content className="mt-0.5 space-y-1 pb-1.5">
                {items.map((def) => (
                  <div
                    key={def.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/fluxnode', def.type)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    className="group flex cursor-grab items-center gap-2.5 rounded-xl border border-transparent bg-card px-2.5 py-2 shadow-sm transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-md active:cursor-grabbing"
                  >
                    <NodeIcon def={def} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">
                        {def.label}
                      </div>
                      <div className="truncate text-[11px] text-ink-muted">
                        {def.subtitle}
                      </div>
                    </div>
                    <GripVertical className="h-4 w-4 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                ))}
              </Collapsible.Content>
            </Collapsible.Root>
          )
        })}
      </div>
    </aside>
  )
}
