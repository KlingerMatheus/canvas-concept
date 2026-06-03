import { Loader2 } from 'lucide-react'
import { useFlowStore } from '@/store/flowStore'
import { NODE_TYPE_MAP, CATEGORIES } from '@/lib/nodeCatalog'

export function RunProgressBar() {
  const nodes = useFlowStore((s) => s.nodes)
  const running = useFlowStore((s) => s.running)
  if (!running) return null

  const total = nodes.length
  const done = nodes.filter(
    (n) => n.data.status === 'success' || n.data.status === 'error',
  ).length
  const runningNodes = nodes.filter((n) => n.data.status === 'running')
  const remaining = total - done - runningNodes.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="w-full shrink-0 border-b border-border-soft bg-card">
      <div className="flex items-center gap-3 px-4 py-2">
        <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-ink">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Running flow
        </span>

        {/* currently running nodes (max 3) */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {runningNodes.map((n) => {
            const def = NODE_TYPE_MAP[n.type!]
            const cat = CATEGORIES[def.category]
            return (
              <span
                key={n.id}
                className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-soft px-2 py-1 text-[11px] font-medium text-ink"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: `linear-gradient(145deg, ${cat.from}, ${cat.to})` }}
                />
                {n.data.title ?? def.label}
                <Loader2 className="h-3 w-3 animate-spin text-accent" />
              </span>
            )
          })}
        </div>

        <span className="shrink-0 text-[12px] text-ink-muted">
          <span className="font-semibold text-ink">{done}</span>/{total} done
          <span className="mx-1.5 text-ink-faint">·</span>
          <span className="font-semibold text-accent">{remaining}</span> left
        </span>
      </div>

      {/* loading bar glued to the bottom edge */}
      <div className="h-1 w-full bg-border-strong">
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
