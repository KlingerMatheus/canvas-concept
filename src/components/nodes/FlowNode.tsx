import { useMemo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronUp, Pencil, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { NODE_TYPE_MAP, CATEGORIES, type CategoryId, type FieldDef } from '@/lib/nodeCatalog'
import { useFlowStore, type FlowNode as FlowNodeType } from '@/store/flowStore'
import { NodeIcon } from './NodeIcon'
import { NodeStatusBar } from './NodeStatusBar'

function displayValue(field: FieldDef, value: string | number): string {
  if (field.type === 'select') {
    const opt = field.options?.find((o) => o.value === String(value))
    return opt?.label ?? String(value)
  }
  return String(value)
}

interface IncomingTag {
  edgeId: string
  label: string
  category: CategoryId
}

export function FlowNode({ id, type, data, selected }: NodeProps<FlowNodeType>) {
  const def = NODE_TYPE_MAP[type!]
  const toggleCollapse = useFlowStore((s) => s.toggleCollapse)
  const openEditor = useFlowStore((s) => s.openEditor)
  const edges = useFlowStore((s) => s.edges)
  const nodes = useFlowStore((s) => s.nodes)
  const [revealKey, setRevealKey] = useState(false)

  // per-port connection state
  const { inByPort, outConnected } = useMemo(() => {
    const inByPort: Record<string, IncomingTag[]> = {}
    const outConnected = new Set<string>()
    for (const e of edges) {
      if (e.target === id) {
        const src = nodes.find((n) => n.id === e.source)
        const sdef = src ? NODE_TYPE_MAP[src.type!] : undefined
        const key = e.targetHandle ?? def?.inputs[0]?.id ?? 'in'
        ;(inByPort[key] ||= []).push({
          edgeId: e.id,
          label: sdef?.label ?? 'Source',
          category: sdef?.category ?? 'ai',
        })
      }
      if (e.source === id) outConnected.add(e.sourceHandle ?? def?.outputs[0]?.id ?? 'out')
    }
    return { inByPort, outConnected }
  }, [edges, nodes, id, def])

  if (!def) return null
  const { collapsed, status, result } = data
  const isError = status === 'error'
  const statusColor =
    status === 'error'
      ? 'var(--err)'
      : status === 'success'
        ? 'var(--ok)'
        : status === 'running' || status === 'queued'
          ? 'var(--accent)'
          : 'var(--ink-faint)'

  const fieldByKey = (k: string) => def.fields.find((f) => f.key === k)!

  return (
    <div
      className={cn(
        'fp-node w-[348px] rounded-node border bg-card transition-shadow',
        isError ? 'border-err/40' : 'border-border-soft',
        status === 'running' && 'fp-node-running',
      )}
      style={{ boxShadow: selected ? undefined : 'var(--shadow-node)' }}
    >
      {/* Collapsed: single centered handle per side so existing edges stay attached */}
      {collapsed && def.inputs[0] && (
        <Handle type="target" position={Position.Left} id={def.inputs[0].id} />
      )}
      {collapsed && def.outputs[0] && (
        <Handle
          type="source"
          position={Position.Right}
          id={def.outputs[0].id}
          style={isError ? { background: 'var(--err)' } : undefined}
        />
      )}

      {/* Flow sequence handles — the "main" edge (execution order), distinct from data ports */}
      <Handle
        type="target"
        position={Position.Left}
        id="flow-in"
        className="fp-handle-flow"
        style={{ top: '34px' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="flow-out"
        className="fp-handle-flow"
        style={{ top: '34px' }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-3.5 pb-3 pt-3.5">
        <NodeIcon def={def} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold leading-tight text-ink">
              {data.title ?? def.label}
            </span>
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', status === 'running' && 'fp-running')}
              style={{ background: statusColor }}
            />
          </div>
          <div className="truncate text-[12px] text-ink-muted">{def.subtitle}</div>
        </div>

        {!collapsed && (
          <button
            onClick={() => openEditor(id)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border-strong bg-card px-2.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
        <button
          onClick={() => toggleCollapse(id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-card-muted hover:text-ink"
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {collapsed ? (
        <div className="px-3.5 pb-3.5">
          <NodeStatusBar status={status} result={result} />
        </div>
      ) : (
        <div className="space-y-3.5 px-3.5 pb-4">
          {/* Configuration */}
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Configuration
            </div>
            <div className="overflow-hidden rounded-xl border border-border-soft">
              {def.summaryKeys.map((key, i) => {
                const field = fieldByKey(key)
                const value = data.values[key]
                const isPassword = field.type === 'password'
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2',
                      i > 0 && 'border-t border-border-soft',
                    )}
                  >
                    <span className="w-28 shrink-0 text-[12px] text-ink-muted">{field.label}</span>
                    <span className="flex flex-1 items-center justify-between gap-2 text-[12px] text-ink">
                      <span className={cn('truncate', isPassword && 'font-mono tracking-tight')}>
                        {isPassword && !revealKey ? (
                          '•'.repeat(28)
                        ) : field.type === 'textarea' ? (
                          <span className="line-clamp-1">{displayValue(field, value)}</span>
                        ) : (
                          displayValue(field, value)
                        )}
                      </span>
                      {isPassword && (
                        <button
                          onClick={() => setRevealKey((v) => !v)}
                          className="shrink-0 text-ink-faint transition-colors hover:text-ink"
                        >
                          {revealKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ports — inputs (left) and outputs (right) paired on the same rows */}
          {(def.inputs.length > 0 || def.outputs.length > 0) && (
            <div>
              <div className="mb-1 flex items-center justify-between px-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                <span>{def.inputs.length > 0 ? 'Inputs' : ''}</span>
                <span>{def.outputs.length > 0 ? 'Outputs' : ''}</span>
              </div>
              <div className="-mx-3.5">
                {Array.from({
                  length: Math.max(def.inputs.length, def.outputs.length),
                }).map((_, i) => {
                  const inp = def.inputs[i]
                  const out = def.outputs[i]
                  const conns = inp ? inByPort[inp.id] ?? [] : []
                  const inConnected = conns.length > 0
                  const outConn = out ? outConnected.has(out.id) : false
                  const outDot =
                    out && (out.id === 'trace' || out.id === 'logs')
                      ? 'var(--ink-faint)'
                      : statusColor
                  return (
                    <div
                      key={i}
                      className="relative flex items-stretch gap-3 px-3.5 py-1.5"
                    >
                      {/* input cell */}
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        {inp && (
                          <>
                            <Handle
                              type="target"
                              position={Position.Left}
                              id={inp.id}
                              className={cn(!inConnected && 'fp-handle-empty')}
                              style={{ top: '50%' }}
                            />
                            <span className="shrink-0 text-[12px] font-medium text-ink">
                              {inp.label}
                            </span>
                            {inConnected ? (
                              <span className="flex min-w-0 items-center gap-1 truncate rounded-md border border-border-soft bg-card-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{
                                    background: `linear-gradient(145deg, ${CATEGORIES[conns[0].category].from}, ${CATEGORIES[conns[0].category].to})`,
                                  }}
                                />
                                <span className="truncate">
                                  {conns.length > 1 ? `${conns.length} sources` : conns[0].label}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-ink-faint">—</span>
                            )}
                          </>
                        )}
                      </div>

                      {/* output cell */}
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                        {out && (
                          <>
                            <span className="truncate text-[12px] font-medium text-ink">
                              {out.label}
                            </span>
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: outConn ? outDot : 'var(--border-strong)' }}
                            />
                            <Handle
                              type="source"
                              position={Position.Right}
                              id={out.id}
                              className={cn(!outConn && 'fp-handle-empty')}
                              style={{
                                top: '50%',
                                ...(isError && out.id === 'output'
                                  ? { background: 'var(--err)' }
                                  : {}),
                              }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
