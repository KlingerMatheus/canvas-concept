import { Play, Loader2, Trash2, RotateCcw, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { useFlowStore } from '@/store/flowStore'

export function Toolbar() {
  const running = useFlowStore((s) => s.running)
  const runFlow = useFlowStore((s) => s.runFlow)
  const resetRun = useFlowStore((s) => s.resetRun)
  const clearCanvas = useFlowStore((s) => s.clearCanvas)
  const count = useFlowStore((s) => s.nodes.length)
  const flows = useFlowStore((s) => s.flows)
  const activeFlow = useFlowStore((s) => s.activeFlow)
  const switchFlow = useFlowStore((s) => s.switchFlow)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-soft bg-surface px-4">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ backgroundImage: 'linear-gradient(145deg, #8b7cf6, #6d5cf0)' }}
        >
          <Workflow className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </div>
        <div className="leading-none">
          <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
            FluxPrompt
          </span>
          <span className="ml-2 rounded-full bg-card-muted px-2 py-0.5 text-[10px] font-medium text-ink-muted">
            concept
          </span>
        </div>
      </div>

      {/* flow switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-border-soft bg-card p-1">
        {flows.map((f) => (
          <button
            key={f.id}
            onClick={() => switchFlow(f.id)}
            disabled={running}
            title={`${f.count} nodes`}
            className={cn(
              'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-50',
              activeFlow === f.id
                ? 'bg-accent text-white'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="mr-1 hidden text-[12px] text-ink-faint sm:inline">
          {count} node{count !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="icon" onClick={resetRun} title="Reset runs">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={clearCanvas} title="Clear canvas">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button onClick={runFlow} disabled={running} size="sm" className="ml-1">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Running
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" /> Run
            </>
          )}
        </Button>
      </div>
    </header>
  )
}
