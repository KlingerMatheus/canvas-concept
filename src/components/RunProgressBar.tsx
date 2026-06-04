import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { useFlowStore } from '@/store/flowStore'
import { NODE_TYPE_MAP, CATEGORIES } from '@/lib/nodeCatalog'
import { cn } from '@/lib/cn'

const LINGER_MS = 3000

export function RunProgressBar() {
  const nodes = useFlowStore((s) => s.nodes)
  const running = useFlowStore((s) => s.running)
  const focusNode = useFlowStore((s) => s.focusNode)
  const [, force] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  const now = Date.now()
  const runningNodes = nodes.filter((n) => n.data.status === 'running')
  // finished nodes linger ~3s with their filled status (colour + icon)
  const recentNodes = nodes.filter(
    (n) =>
      (n.data.status === 'success' || n.data.status === 'error') &&
      n.data.finishedAt !== undefined &&
      now - n.data.finishedAt < LINGER_MS,
  )
  const show = running || runningNodes.length > 0 || recentNodes.length > 0

  // tick while visible so the 3s window expires and the bar hides
  useEffect(() => {
    if (!show) return
    const t = setInterval(() => force((x) => x + 1), 300)
    return () => clearInterval(t)
  }, [show])

  if (!show) return null

  const total = nodes.length
  const done = nodes.filter(
    (n) => n.data.status === 'success' || n.data.status === 'error',
  ).length
  const remaining = total - done - runningNodes.length
  const pct = total ? Math.round((done / total) * 100) : 0

  // running chips first, then at most 5 most-recently-finished (each drops at 3s)
  const finishedChips = recentNodes
    .slice()
    .sort((a, b) => (b.data.finishedAt ?? 0) - (a.data.finishedAt ?? 0))
    .slice(0, 5)
  const chips = [...runningNodes, ...finishedChips]

  return (
    <div className="w-full shrink-0 border-b border-border-soft bg-card">
      <div className="flex items-center gap-3 px-4 py-2">
        <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-ink">
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-ok" />
          )}
          {running ? 'Running flow' : 'Run complete'}
        </span>

        {collapsed ? (
          <div className="min-w-0 flex-1" />
        ) : (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {chips.map((n) => {
              const def = NODE_TYPE_MAP[n.type!]
              const cat = CATEGORIES[def.category]
              const st = n.data.status
              const isOk = st === 'success'
              const isErr = st === 'error'
              return (
                <button
                  key={n.id}
                  onClick={() => focusNode(n.id)}
                  title="Center on node"
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium text-ink transition-colors hover:brightness-95',
                    isOk
                      ? 'border-ok bg-ok-soft'
                      : isErr
                        ? 'border-err bg-err-soft'
                        : 'border-accent/30 bg-accent-soft',
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: `linear-gradient(145deg, ${cat.from}, ${cat.to})` }}
                  />
                  {n.data.title ?? def.label}
                  {isOk ? (
                    <CheckCircle2 className="h-3 w-3 text-ok" />
                  ) : isErr ? (
                    <XCircle className="h-3 w-3 text-err" />
                  ) : (
                    <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        <span className="shrink-0 text-[12px] text-ink-muted">
          <span className="font-semibold text-ink">{done}</span>/{total} done
          {remaining > 0 && (
            <>
              <span className="mx-1.5 text-ink-faint">·</span>
              <span className="font-semibold text-accent">{remaining}</span> left
            </>
          )}
        </span>

        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-card-muted hover:text-ink"
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      <div className="h-1 w-full bg-border-strong">
        <div
          className={cn(
            'h-full transition-[width] duration-500 ease-out',
            running ? 'bg-accent' : 'bg-ok',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
