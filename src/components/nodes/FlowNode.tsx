import { memo, useMemo, useState } from 'react'
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react'

/** below this zoom, nodes render compact by default */
const ZOOM_COMPACT_BELOW = 0.65
import { ChevronDown, ChevronUp, Pencil, Eye, EyeOff, Play, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { NODE_TYPE_MAP, CATEGORIES, type CategoryId, type FieldDef } from '@/lib/nodeCatalog'
import { useFlowStore, EMPTY_CONN, type FlowNode as FlowNodeType } from '@/store/flowStore'
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

function FlowNodeImpl({ id, type, data, selected }: NodeProps<FlowNodeType>) {
  const def = NODE_TYPE_MAP[type!]
  const toggleCollapse = useFlowStore((s) => s.toggleCollapse)
  const openEditor = useFlowStore((s) => s.openEditor)
  const runNode = useFlowStore((s) => s.runNode)
  // O(1) per-node connection subscription (pre-computed in the store). Re-renders
  // only when THIS node's connections change — never on drag/pan or other edges.
  const conn = useFlowStore((s) => s.connByNode[id]) ?? EMPTY_CONN
  const [revealKey, setRevealKey] = useState(false)
  // boolean selector → only re-renders when crossing the zoom threshold, not on every tick
  const farZoom = useStore((s) => s.transform[2] < ZOOM_COMPACT_BELOW)

  // map the stored connections into renderable tags (source type → label/color)
  const { inByPort, outConnected } = useMemo(() => {
    const inByPort: Record<string, IncomingTag[]> = {}
    for (const port of Object.keys(conn.inByPort)) {
      inByPort[port] = conn.inByPort[port].map((c) => {
        const sdef = NODE_TYPE_MAP[c.sourceType]
        return {
          edgeId: c.edgeId,
          label: sdef?.label ?? 'Source',
          category: (sdef?.category ?? 'ai') as CategoryId,
        }
      })
    }
    return { inByPort, outConnected: new Set(conn.outConnected) }
  }, [conn])

  if (!def) return null
  const { status, result } = data
  // far zoom → compact; near zoom → expanded, unless the user collapsed it explicitly
  const collapsed = data.collapsed || farZoom
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
      style={{
        // lighter shadow when compact → far cheaper to composite at scale
        boxShadow: selected
          ? undefined
          : collapsed
            ? 'var(--shadow-node-sm)'
            : 'var(--shadow-node)',
      }}
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
      <div
        className={cn(
          'group/header flex items-center gap-2.5 px-3.5 py-2.5',
          !collapsed && 'border-b border-border-soft',
        )}
      >
        {/* icon with a status indicator on its corner */}
        <div className="relative shrink-0">
          <NodeIcon def={def} />
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card',
              status === 'running' && 'fp-running',
            )}
            style={{ background: statusColor }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold leading-tight text-ink">
            {data.title ?? def.label}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background: `linear-gradient(145deg, ${CATEGORIES[def.category].from}, ${CATEGORIES[def.category].to})`,
              }}
            />
            <span className="truncate">{def.subtitle}</span>
          </div>
        </div>

        {/* actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          {!collapsed && (
            <>
              <button
                onClick={() => runNode(id)}
                disabled={status === 'running'}
                title="Run this node"
                className="flex h-7 w-7 items-center justify-center rounded-md text-accent transition-colors hover:bg-accent-soft disabled:opacity-40"
              >
                {status === 'running' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
              </button>
              <button
                onClick={() => openEditor(id)}
                title="Edit node"
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-card-muted hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <span className="mx-0.5 h-4 w-px bg-border-soft" />
            </>
          )}
          <button
            onClick={() => toggleCollapse(id)}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-card-muted hover:text-ink"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {collapsed ? (
        <div className="px-3.5 pb-3 pt-2.5">
          <NodeStatusBar status={status} result={result} />
        </div>
      ) : (
        <div className="space-y-3.5 px-3.5 pb-4 pt-3.5">
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

export const FlowNode = memo(FlowNodeImpl)
