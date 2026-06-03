import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Globe, StickyNote, Settings2, ScrollText, Play, Loader2 } from 'lucide-react'
import { useFlowStore, type FlowNode as FlowNodeType } from '@/store/flowStore'

export function TriggerNode({ data }: NodeProps<FlowNodeType>) {
  const nodes = useFlowStore((s) => s.nodes)
  const running = useFlowStore((s) => s.running)
  const runFlow = useFlowStore((s) => s.runFlow)

  const name = String(data.values.name ?? 'Flow Global Node')
  const steps = Number(data.values.steps ?? 2)
  const nodeCount = nodes.length
  const logsCount = nodes.filter((n) => n.data.result).length

  return (
    <div className="relative w-[280px]">
      <Handle type="source" position={Position.Right} id="flow-out" className="fp-handle-flow" />

      <div className="fp-rainbow shadow-[var(--shadow-node)]">
        <div className="fp-rainbow-inner p-4">
          {/* top row */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border-soft bg-card-muted text-ink-muted">
              <Globe className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2 text-ink-faint">
              <StickyNote className="h-4 w-4" />
              <Settings2 className="h-4 w-4" />
            </div>
          </div>

          {/* title + meta */}
          <div className="text-[16px] font-semibold text-ink">{name}</div>
          <div className="mt-0.5 mb-3 flex items-center gap-1.5 text-[12px] text-ink-muted">
            <span className="font-semibold text-ink">{steps}</span> Agent Steps
            <span className="text-ink-faint">·</span>
            <span className="font-semibold text-ink">{nodeCount}</span> Nodes
          </div>

          {/* run button */}
          <button
            onClick={runFlow}
            disabled={running}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-[14px] font-semibold text-white shadow-sm transition-all hover:brightness-110 active:brightness-95 disabled:opacity-60"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Running Agent
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" /> Run Agent
              </>
            )}
          </button>

          {/* logs footer */}
          <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3 text-[12px]">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <ScrollText className="h-3.5 w-3.5" />
              Agent Logs
            </span>
            <span className={logsCount > 0 ? 'font-medium text-ok' : 'text-ink-faint'}>
              {logsCount > 0 ? `${logsCount} entries` : 'No logs yet'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
