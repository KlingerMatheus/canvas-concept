import { memo, useMemo, useState } from 'react'
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react'

/** below this zoom, nodes render compact by default */
const ZOOM_COMPACT_BELOW = 0.65
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Play,
  Loader2,
  MessageSquareText,
  Layers,
  UserRound,
  ListChecks,
  Braces,
  Search,
  Upload,
  Terminal,
  Activity,
  Database,
  Globe,
  FileStack,
  Settings2,
  Circle,
  X,
  ArrowRight,
  Maximize2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { NODE_TYPE_MAP, CATEGORIES, type CategoryId, type FieldDef } from '@/lib/nodeCatalog'
import { useFlowStore, EMPTY_CONN, type FlowNode as FlowNodeType } from '@/store/flowStore'
import { nodeStepMap } from '@/lib/flowOrder'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { NodeIcon } from './NodeIcon'
import { NodeStatusBar } from './NodeStatusBar'

/** per-port glyph so each input/output row reads at a glance, like the reference */
const PORT_ICON: Record<string, LucideIcon> = {
  prompt: MessageSquareText,
  context: Layers,
  persona: UserRound,
  instructions: ListChecks,
  variables: Braces,
  query: Search,
  body: Braces,
  input: MessageSquareText,
  output: Upload,
  logs: Terminal,
  trace: Activity,
  results: Database,
  response: Globe,
  documents: FileStack,
}
const portIcon = (id: string): LucideIcon => PORT_ICON[id] ?? Circle

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, '.')
const wordCount = (v: unknown) =>
  String(v ?? '').trim().split(/\s+/).filter(Boolean).length

function displayValue(field: FieldDef, value: string | number): string {
  if (field.type === 'select') {
    const opt = field.options?.find((o) => o.value === String(value))
    return opt?.label ?? String(value)
  }
  return String(value)
}

interface IncomingTag {
  edgeId: string
  sourceId: string
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
  // step number off the flow chain — memoised on edges identity, so drag is O(1)
  const step = useFlowStore((s) => nodeStepMap(s.edges).get(id))
  // which input port has its connection-preview open (null = none)
  const [openPort, setOpenPort] = useState<string | null>(null)
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
          sourceId: c.sourceId,
          label: sdef?.label ?? 'Source',
          category: (sdef?.category ?? 'ai') as CategoryId,
        }
      })
    }
    return { inByPort, outConnected: new Set(conn.outConnected) }
  }, [conn])

  if (!def) return null
  const { status, result } = data
  const cat = CATEGORIES[def.category]
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
  const tokens = result?.tokens ?? def.mock.tokens

  // the category color drives the whole card — header band, glow, accents
  const catStyle = {
    '--cat': cat.to,
    '--cat-from': cat.from,
    '--cat-to': cat.to,
  } as React.CSSProperties

  // selected → category ring; otherwise a soft category-tinted glow + shadow
  const glow = selected
    ? `0 0 0 2px ${cat.to}, 0 10px 30px -10px ${cat.to}88`
    : collapsed
      ? `var(--shadow-node-sm), 0 0 0 1px color-mix(in srgb, ${cat.to} 18%, transparent)`
      : `var(--shadow-node), 0 0 26px -14px ${cat.to}, 0 0 0 1px color-mix(in srgb, ${cat.to} 14%, transparent)`

  return (
    <div
      className={cn(
        'fp-node w-[348px] rounded-node border bg-card transition-shadow',
        'border-transparent',
        status === 'running' && 'fp-node-running',
      )}
      style={{ ...catStyle, boxShadow: glow }}
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
        style={{ top: '54px' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="flow-out"
        className="fp-handle-flow"
        style={{ top: '54px' }}
      />

      {/* ── Token band — the category-colored strip across the top ── */}
      <div
        className="flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-semibold text-white"
        style={{
          backgroundImage: `linear-gradient(95deg, ${cat.from}, ${cat.to})`,
          borderTopLeftRadius: 'var(--radius-node)',
          borderTopRightRadius: 'var(--radius-node)',
        }}
      >
        <span className="opacity-85">Tokens used</span>
        <span className="tabular-nums">: {fmt(tokens)}</span>
      </div>

      {/* ── Header ── */}
      <div
        className={cn(
          'group/header flex items-center gap-2.5 px-3.5 py-2.5',
          !collapsed && 'border-b border-border-soft',
        )}
      >
        {/* step badge — the node's place in the execution order */}
        {step != null && (
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ring-2 ring-card"
            style={{ backgroundImage: `linear-gradient(145deg, ${cat.from}, ${cat.to})` }}
          >
            {step}
          </div>
        )}

        {/* icon with a status indicator on its corner */}
        <div className="relative shrink-0">
          <NodeIcon def={def} size="sm" />
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
          <div className="mt-0.5 truncate text-[11px] font-medium" style={{ color: cat.to }}>
            {def.subtitle}
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
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundImage: `linear-gradient(145deg, ${cat.from}, ${cat.to})` }}
              >
                {status === 'running' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 fill-current" />
                )}
                Run
              </button>
              <button
                onClick={() => openEditor(id)}
                title="Edit node"
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-card-muted hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
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
        <div className="pb-3 pt-2.5">
          {/* Ports — inputs (left column) paired with outputs (right column) */}
          {(def.inputs.length > 0 || def.outputs.length > 0) && (
            <div>
              <div className="mb-1 flex items-center justify-between px-3.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                <span>{def.inputs.length > 0 ? 'Inputs' : ''}</span>
                <span>{def.outputs.length > 0 ? 'Outputs' : ''}</span>
              </div>
              <div>
                {Array.from({
                  length: Math.max(def.inputs.length, def.outputs.length),
                }).map((_, i) => {
                  const inp = def.inputs[i]
                  const out = def.outputs[i]
                  const conns = inp ? inByPort[inp.id] ?? [] : []
                  const inConnected = conns.length > 0
                  const outConn = out ? outConnected.has(out.id) : false

                  // input badge: linked count, else word count of a same-named field, else empty
                  const inField = inp ? def.fields.find((f) => f.key === inp.id) : undefined
                  const inWords = inField ? wordCount(data.values[inField.key]) : 0
                  const inBadge = inConnected
                    ? `${conns.length} linked`
                    : inWords > 0
                      ? `${fmt(inWords)} words`
                      : 'empty'

                  // output badge: result word/line count when run, else linked / empty
                  let outBadge = outConn ? 'linked' : 'empty'
                  if (out && result && status === 'success') {
                    outBadge =
                      out.id === 'logs' || out.id === 'trace'
                        ? `${(result.output.match(/\n/g)?.length ?? 0) + 1} lines`
                        : `${fmt(wordCount(result.output))} words`
                  }

                  const InIcon = inp ? portIcon(inp.id) : Circle
                  const OutIcon = out ? portIcon(out.id) : Circle

                  return (
                    <div key={i} className="relative grid grid-cols-2 gap-2.5 px-3.5 py-1">
                      {/* input cell */}
                      {inp ? (
                        <button
                          type="button"
                          disabled={!inConnected}
                          onClick={() =>
                            setOpenPort((p) => (p === inp.id ? null : inp.id))
                          }
                          className={cn(
                            'nodrag flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                            inConnected
                              ? 'cursor-pointer bg-card-muted hover:brightness-[0.97]'
                              : 'cursor-default border-border-soft bg-transparent',
                          )}
                          style={
                            inConnected
                              ? {
                                  borderColor:
                                    openPort === inp.id
                                      ? cat.to
                                      : `color-mix(in srgb, ${cat.to} 45%, transparent)`,
                                  boxShadow:
                                    openPort === inp.id
                                      ? `0 0 0 1px ${cat.to}`
                                      : undefined,
                                }
                              : undefined
                          }
                        >
                          <Handle
                            type="target"
                            position={Position.Left}
                            id={inp.id}
                            className={cn(!inConnected && 'fp-handle-empty')}
                            style={{ top: '50%' }}
                          />
                          <InIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                          <span className="truncate text-[12px] font-medium text-ink">
                            {inp.label}
                          </span>
                          <span
                            className={cn(
                              'ml-auto shrink-0 text-[11px] font-medium tabular-nums',
                              inBadge === 'empty' ? 'text-ink-faint' : 'text-ink-muted',
                            )}
                            style={inConnected ? { color: cat.to } : undefined}
                          >
                            {inBadge}
                          </span>
                        </button>
                      ) : (
                        <div />
                      )}

                      {/* connection preview — opens under the clicked input port */}
                      {inp && openPort === inp.id && conns.length > 0 && (
                        <PortPreview
                          portLabel={inp.label}
                          sources={conns}
                          color={cat.to}
                          onClose={() => setOpenPort(null)}
                        />
                      )}

                      {/* output cell */}
                      {out ? (
                        <div
                          className={cn(
                            'flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5',
                            outConn || (result && status === 'success')
                              ? 'bg-card-muted'
                              : 'border-border-soft bg-transparent',
                          )}
                          style={
                            outConn
                              ? { borderColor: `color-mix(in srgb, ${cat.to} 45%, transparent)` }
                              : undefined
                          }
                        >
                          <OutIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                          <span className="truncate text-[12px] font-medium text-ink">
                            {out.label}
                          </span>
                          <span
                            className={cn(
                              'ml-auto shrink-0 text-[11px] font-medium tabular-nums',
                              outBadge === 'empty' ? 'text-ink-faint' : 'text-ink-muted',
                            )}
                          >
                            {outBadge}
                          </span>
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
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Config chips — model / key settings, like the model selector in the reference */}
          {def.summaryKeys.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 px-3.5">
              {def.summaryKeys.map((key) => {
                const field = fieldByKey(key)
                const value = data.values[key]
                const isPassword = field.type === 'password'
                const text = isPassword
                  ? '••••••••'
                  : field.type === 'textarea'
                    ? `${wordCount(value)} words`
                    : displayValue(field, value)
                return (
                  <span
                    key={key}
                    className="flex max-w-full items-center gap-1.5 rounded-md border border-border-soft bg-card-muted px-2 py-1 text-[11px] text-ink-muted"
                  >
                    <Settings2 className="h-3 w-3 shrink-0 text-ink-faint" />
                    <span className="truncate">{text}</span>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const FlowNode = memo(FlowNodeImpl)

interface PortPreviewProps {
  portLabel: string
  color: string
  sources: IncomingTag[]
  onClose: () => void
}

/** Floating panel listing the upstream nodes feeding an input port, with a
 *  snippet of the value each one passes downstream. */
function PortPreview({ portLabel, color, sources, onClose }: PortPreviewProps) {
  // resolve source nodes for their title + the value flowing out.
  // select the stable nodes array (never a fresh object) and index it in a memo,
  // otherwise the selector returns a new object each call → infinite loop.
  const nodes = useFlowStore((s) => s.nodes)
  const byId = useMemo(() => {
    const map: Record<string, FlowNodeType> = {}
    for (const n of nodes) map[n.id] = n
    return map
  }, [nodes])

  // the source whose full value is expanded into a modal (null = none)
  const [expanded, setExpanded] = useState<IncomingTag | null>(null)
  const expNode = expanded ? byId[expanded.sourceId] : undefined
  const expDef = expNode ? NODE_TYPE_MAP[expNode.type!] : undefined
  const expValue = expNode?.data.result?.output ?? expDef?.mock.output ?? ''

  return (
    <>
      <div
        className="nodrag nowheel absolute left-3.5 right-3.5 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border-soft bg-card shadow-[var(--shadow-node)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-semibold text-white"
          style={{ background: color }}
        >
          <span className="flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" />
            {portLabel} · {sources.length} {sources.length > 1 ? 'connections' : 'connection'}
          </span>
          <button
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-md hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="max-h-56 divide-y divide-border-soft overflow-auto">
          {sources.map((src) => {
            const node = byId[src.sourceId]
            const sdef = node ? NODE_TYPE_MAP[node.type!] : undefined
            const name = node?.data.title ?? src.label
            const cat = CATEGORIES[src.category]
            const value = node?.data.result?.output ?? sdef?.mock.output ?? ''
            const snippet = value.replace(/\s+/g, ' ').trim()
            return (
              <div key={src.edgeId} className="group/item relative px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: `linear-gradient(145deg, ${cat.from}, ${cat.to})` }}
                  />
                  <span className="truncate text-[12px] font-semibold text-ink">{name}</span>
                  {sdef && (
                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-ink-faint">
                      {sdef.subtitle}
                    </span>
                  )}
                </div>
                {snippet ? (
                  <p className="mt-1 line-clamp-4 text-[11px] leading-snug text-ink-muted">
                    {snippet}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] italic text-ink-faint">
                    No value yet — run to preview
                  </p>
                )}
                {/* hover affordance → open the full value in a modal */}
                {snippet && (
                  <button
                    onClick={() => setExpanded(src)}
                    title="Open full preview"
                    className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md border border-border-soft bg-card px-1.5 py-0.5 text-[10px] font-medium text-ink-muted opacity-0 shadow-sm transition-opacity hover:text-ink group-hover/item:opacity-100"
                  >
                    <Maximize2 className="h-3 w-3" />
                    Preview
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={expanded != null} onOpenChange={(o) => !o && setExpanded(null)}>
        <DialogContent className="fp-dialog-fade nodrag nowheel flex h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col rounded-2xl">
          <div
            className="flex shrink-0 items-center gap-2 px-5 py-3.5 text-white"
            style={{ background: color }}
          >
            <ArrowRight className="h-4 w-4" />
            <DialogTitle className="text-white">
              {portLabel} ← {expNode?.data.title ?? expanded?.label}
            </DialogTitle>
            {expDef && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">
                {expDef.subtitle}
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
            <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-ink">
              {expValue || 'No value yet — run the source node to preview.'}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
