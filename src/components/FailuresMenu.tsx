import { useState } from 'react'
import { AlertTriangle, ChevronDown, XCircle } from 'lucide-react'
import { useFlowStore } from '@/store/flowStore'
import { NODE_TYPE_MAP } from '@/lib/nodeCatalog'
import { cn } from '@/lib/cn'

/** Corner dropdown listing nodes that failed in the last run. Click → focus. */
export function FailuresMenu() {
  const nodes = useFlowStore((s) => s.nodes)
  const focusNode = useFlowStore((s) => s.focusNode)
  const [open, setOpen] = useState(false)

  const failed = nodes.filter((n) => n.data.status === 'error')
  if (failed.length === 0) return null

  return (
    <div className="absolute left-3 top-3 z-10 w-60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-err/40 bg-card px-3 py-2 text-[12px] font-semibold text-err shadow-md transition-colors hover:bg-err-soft"
      >
        <AlertTriangle className="h-4 w-4" />
        {failed.length} failed
        <ChevronDown
          className={cn('ml-auto h-4 w-4 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="mt-1 max-h-72 overflow-auto rounded-lg border border-border-soft bg-card p-1 shadow-xl">
          {failed.map((n) => {
            const def = NODE_TYPE_MAP[n.type!]
            return (
              <button
                key={n.id}
                onClick={() => {
                  focusNode(n.id)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-ink transition-colors hover:bg-card-muted"
              >
                <XCircle className="h-3.5 w-3.5 shrink-0 text-err" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {n.data.title ?? def.label}
                </span>
                <span className="shrink-0 text-[11px] text-ink-faint">
                  {n.data.result?.error ?? 'Error'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
