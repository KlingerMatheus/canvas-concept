import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { defaultData, NODE_TYPE_MAP } from '@/lib/nodeCatalog'
import { mockRun, type RunResult, type RunStatus } from '@/lib/mockRun'

export interface FlowNodeData extends Record<string, unknown> {
  values: Record<string, string | number>
  collapsed: boolean
  status: RunStatus
  result?: RunResult
  /** wall-clock time the last run of this node finished (for the lingering status) */
  finishedAt?: number
  /** optional display title overriding the catalog label (for realistic scenarios) */
  title?: string
  /** demo flag: this node fails on run, to showcase the error state */
  simulateError?: boolean
}

export type FlowNode = Node<FlowNodeData>

/** Pre-computed per-node connection info so a node never subscribes to the whole
 * edges array. Built once per flow and patched incrementally on connect/disconnect
 * — so dragging (edges unchanged) re-renders nothing, and connecting re-renders
 * only the two endpoints. */
export interface NodeConn {
  /** input portId -> connected sources (with source node id/type for the tag + preview) */
  inByPort: Record<string, { edgeId: string; sourceId: string; sourceType: string }[]>
  /** output portIds that have at least one connection */
  outConnected: string[]
}

export const EMPTY_CONN: NodeConn = { inByPort: {}, outConnected: [] }

/** Recompute connection entries for just the given node ids (incremental patch). */
function patchConnFor(
  ids: string[],
  nodes: FlowNode[],
  edges: Edge[],
  prev: Record<string, NodeConn>,
): Record<string, NodeConn> {
  const typeById = new Map(nodes.map((n) => [n.id, n.type!]))
  const next = { ...prev }
  for (const id of ids) {
    const inByPort: NodeConn['inByPort'] = {}
    const out = new Set<string>()
    for (const e of edges) {
      if (e.target === id) {
        const port = e.targetHandle ?? 'in'
        ;(inByPort[port] ||= []).push({
          edgeId: e.id,
          sourceId: e.source,
          sourceType: typeById.get(e.source) ?? '',
        })
      }
      if (e.source === id) out.add(e.sourceHandle ?? 'out')
    }
    next[id] = { inByPort, outConnected: [...out] }
  }
  return next
}

function buildAllConn(nodes: FlowNode[], edges: Edge[]): Record<string, NodeConn> {
  // resolve source types in one pass for the input tags
  const typeById = new Map(nodes.map((n) => [n.id, n.type!]))
  const map: Record<string, NodeConn> = {}
  for (const n of nodes) map[n.id] = { inByPort: {}, outConnected: [] }
  const outSets = new Map<string, Set<string>>()
  for (const e of edges) {
    const t = map[e.target]
    if (t) {
      const port = e.targetHandle ?? 'in'
      ;(t.inByPort[port] ||= []).push({
        edgeId: e.id,
        sourceId: e.source,
        sourceType: typeById.get(e.source) ?? '',
      })
    }
    if (map[e.source]) {
      let s = outSets.get(e.source)
      if (!s) outSets.set(e.source, (s = new Set()))
      s.add(e.sourceHandle ?? 'out')
    }
  }
  for (const [id, s] of outSets) map[id].outConnected = [...s]
  return map
}

let idCounter = 100
const nextId = () => `n${idCounter++}`

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface FlowState {
  nodes: FlowNode[]
  edges: Edge[]
  connByNode: Record<string, NodeConn>
  theme: 'light' | 'dark'
  editingId: string | null
  editingTab: string
  running: boolean
  flows: { id: string; name: string; count: number }[]
  activeFlow: string
  switchFlow: (id: string) => void
  focusNodeId: string | null
  focusNonce: number
  focusNode: (id: string) => void
  // canvas settings (toggles instead of code edits)
  animations: boolean
  minimap: boolean
  virtualize: boolean
  setSetting: (key: 'animations' | 'minimap' | 'virtualize', value: boolean) => void
  collapseAll: () => void
  expandAll: () => void

  onNodesChange: (c: NodeChange<FlowNode>[]) => void
  onEdgesChange: (c: EdgeChange[]) => void
  onConnect: (c: Connection) => void
  removeEdge: (edgeId: string) => void
  addNode: (type: string, position: XYPosition) => void
  updateValues: (id: string, values: Record<string, string | number>) => void
  toggleCollapse: (id: string) => void
  openEditor: (id: string, tab?: string) => void
  closeEditor: () => void
  runFlow: () => Promise<void>
  runNode: (id: string) => Promise<void>
  resetRun: () => void
  clearCanvas: () => void
  toggleTheme: () => void
}

function makeNode(
  type: string,
  position: XYPosition,
  overrides: Partial<FlowNodeData> = {},
): FlowNode {
  return {
    id: nextId(),
    type,
    position,
    data: {
      values: defaultData(type),
      collapsed: false,
      status: 'idle',
      ...overrides,
    },
  }
}

const isFlowEdge = (c: Connection) =>
  !!c.sourceHandle?.startsWith('flow') || !!c.targetHandle?.startsWith('flow')

// the "main" sequence edge — custom gradient line with a numbered badge
const FLOW_EDGE: Partial<Edge> = {
  type: 'flow',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#6d5cf0', width: 16, height: 16 },
  data: { flow: true },
}

// ── Seed graph: a realistic ~20-node support-agent scenario ───────
interface Spec {
  key: string
  type: string
  title?: string
  x: number
  y: number
  expanded?: boolean
  error?: boolean
}

const SPECS: Spec[] = [
  { key: 'trig', type: 'flow-trigger', x: -680, y: 360 },
  // inputs
  { key: 'query', type: 'chat-input', title: 'User Query', x: -120, y: 60 },
  { key: 'kb', type: 'text-input', title: 'Knowledge Base', x: -120, y: 360 },
  { key: 'voice', type: 'text-input', title: 'Brand Voice', x: -120, y: 660 },
  // loaders / templates
  { key: 'docs', type: 'doc-loader', title: 'Policy Docs', x: 480, y: 20 },
  { key: 'faq', type: 'doc-loader', title: 'FAQ Docs', x: 480, y: 320 },
  { key: 'persona', type: 'prompt', title: 'System Persona', x: 480, y: 620 },
  // retrieval / classify
  { key: 'retriever', type: 'vector-store', title: 'Retriever', x: 1080, y: 0 },
  { key: 'faqsearch', type: 'vector-store', title: 'FAQ Search', x: 1080, y: 340 },
  { key: 'intent', type: 'ai-chat', title: 'Intent Classifier', x: 1080, y: 680 },
  // compose / tools
  { key: 'ragprompt', type: 'prompt', title: 'RAG Prompt', x: 1680, y: -40 },
  { key: 'rerank', type: 'ai-chat', title: 'Reranker', x: 1680, y: 260 },
  { key: 'crm', type: 'api-request', title: 'CRM Lookup', x: 1680, y: 560 },
  { key: 'order', type: 'api-request', title: 'Order Status', x: 1680, y: 820 },
  // generate / guard
  { key: 'answer', type: 'ai-chat', title: 'Answer Generator', x: 2280, y: 60, expanded: true },
  { key: 'guard', type: 'ai-chat', title: 'Guardrails', x: 2280, y: 660, error: true },
  { key: 'tone', type: 'ai-chat', title: 'Tone Adjuster', x: 2280, y: 960 },
  // finalize
  { key: 'summary', type: 'ai-chat', title: 'Summarizer', x: 2880, y: 220 },
  { key: 'draft', type: 'chat-output', title: 'Draft Response', x: 2880, y: 560 },
  { key: 'final', type: 'chat-output', title: 'Final Reply', x: 2880, y: 820 },
]

// execution order for the flow-sequence (numbered) edges
const FLOW_CHAIN = [
  'trig', 'query', 'kb', 'voice', 'docs', 'faq', 'persona', 'retriever',
  'faqsearch', 'intent', 'ragprompt', 'rerank', 'crm', 'order', 'answer',
  'guard', 'tone', 'summary', 'draft', 'final',
]

// data (parameter) edges: [sourceKey, sourcePort, targetKey, targetPort]
const DATA_LINKS: [string, string, string, string][] = [
  ['query', 'output', 'intent', 'prompt'],
  ['query', 'output', 'ragprompt', 'variables'],
  ['query', 'output', 'crm', 'body'],
  ['query', 'output', 'order', 'body'],
  ['kb', 'output', 'retriever', 'query'],
  ['docs', 'documents', 'retriever', 'query'],
  ['faq', 'documents', 'faqsearch', 'query'],
  ['retriever', 'results', 'ragprompt', 'variables'],
  ['faqsearch', 'results', 'rerank', 'prompt'],
  ['intent', 'output', 'ragprompt', 'variables'],
  ['ragprompt', 'prompt', 'answer', 'prompt'],
  ['persona', 'prompt', 'answer', 'persona'],
  ['rerank', 'output', 'answer', 'context'],
  ['crm', 'response', 'answer', 'context'],
  ['order', 'response', 'summary', 'prompt'],
  ['answer', 'output', 'guard', 'prompt'],
  ['answer', 'output', 'summary', 'context'],
  ['guard', 'output', 'tone', 'prompt'],
  ['voice', 'output', 'tone', 'persona'],
  ['tone', 'output', 'draft', 'input'],
  ['summary', 'output', 'final', 'input'],
]

interface FlowDef {
  nodes: FlowNode[]
  edges: Edge[]
}

function buildSupportAgent(): FlowDef {
  const byKey: Record<string, FlowNode> = {}
  const nodes = SPECS.map((s) => {
    const n = makeNode(
      s.type,
      { x: s.x, y: s.y },
      { collapsed: s.type === 'flow-trigger' ? false : !s.expanded, title: s.title, simulateError: s.error },
    )
    byKey[s.key] = n
    return n
  })
  const edges: Edge[] = [
    ...FLOW_CHAIN.slice(0, -1).map((k, i) => ({
      id: `agf${i}`,
      source: byKey[k].id,
      sourceHandle: 'flow-out',
      target: byKey[FLOW_CHAIN[i + 1]].id,
      targetHandle: 'flow-in',
      ...FLOW_EDGE,
    })),
    ...DATA_LINKS.map(([sk, sp, tk, tp], i) => ({
      id: `agd${i}`,
      source: byKey[sk].id,
      sourceHandle: sp,
      target: byKey[tk].id,
      targetHandle: tp,
      type: 'data',
      animated: true,
    })),
  ]
  return { nodes, edges }
}

// ── Generated flows of arbitrary size (simulated, interconnected) ──
const GEN_SEQUENCE = [
  'chat-input', 'prompt', 'ai-chat', 'vector-store', 'ai-chat',
  'api-request', 'ai-chat', 'chat-output',
]
const firstIn = (type: string) => NODE_TYPE_MAP[type].inputs[0]?.id
const firstOut = (type: string) => NODE_TYPE_MAP[type].outputs[0]?.id

function generateFlow(count: number, tag: string): FlowDef {
  const PER_COL = 6
  const nodes: FlowNode[] = []
  for (let i = 0; i < count; i++) {
    const type = i === 0 ? 'flow-trigger' : GEN_SEQUENCE[i % GEN_SEQUENCE.length]
    const def = NODE_TYPE_MAP[type]
    nodes.push(
      makeNode(
        type,
        { x: Math.floor(i / PER_COL) * 560, y: (i % PER_COL) * 210 },
        {
          collapsed: type !== 'flow-trigger',
          title: `${def.label} ${i}`,
          simulateError: i > 0 && i % 17 === 0,
        },
      ),
    )
  }
  const edges: Edge[] = []
  let e = 0
  for (let i = 1; i < count; i++) {
    // flow-sequence edge
    edges.push({
      id: `${tag}f${e++}`,
      source: nodes[i - 1].id,
      sourceHandle: 'flow-out',
      target: nodes[i].id,
      targetHandle: 'flow-in',
      ...FLOW_EDGE,
    })
    // a data edge from an earlier node (deterministic)
    const j = i >= 2 ? (i * 5 + 1) % i : 0
    const so = firstOut(nodes[j].type!)
    const ti = firstIn(nodes[i].type!)
    if (so && ti) {
      edges.push({
        id: `${tag}d${e++}`,
        source: nodes[j].id,
        sourceHandle: so,
        target: nodes[i].id,
        targetHandle: ti,
        type: 'data',
        animated: true,
      })
    }
  }
  return { nodes, edges }
}

// flow registry — each built once; live edits persist per flow within a session
const flowData: Record<string, FlowDef> = {
  agent: buildSupportAgent(),
  fifty: generateFlow(50, 'a'),
  hundred: generateFlow(100, 'b'),
}
const FLOWS = [
  { id: 'agent', name: 'Support Agent', count: flowData.agent.nodes.length },
  { id: 'fifty', name: '50 Nodes', count: 50 },
  { id: 'hundred', name: '100 Nodes', count: 100 },
]

const prefersDark =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: flowData.agent.nodes,
  edges: flowData.agent.edges,
  connByNode: buildAllConn(flowData.agent.nodes, flowData.agent.edges),
  theme: prefersDark ? 'dark' : 'light',
  editingId: null,
  editingTab: 'config',
  running: false,
  flows: FLOWS,
  activeFlow: 'agent',
  focusNodeId: null,
  focusNonce: 0,
  animations: true,
  minimap: true,
  virtualize: true,

  focusNode: (id) => set({ focusNodeId: id, focusNonce: get().focusNonce + 1 }),

  setSetting: (key, value) => set({ [key]: value } as Partial<FlowState>),

  collapseAll: () =>
    set({
      nodes: get().nodes.map((n) =>
        n.data.collapsed ? n : { ...n, data: { ...n.data, collapsed: true } },
      ),
    }),
  expandAll: () =>
    set({
      nodes: get().nodes.map((n) =>
        n.data.collapsed === false ? n : { ...n, data: { ...n.data, collapsed: false } },
      ),
    }),

  switchFlow: (id) => {
    const cur = get().activeFlow
    if (cur === id || get().running) return
    // persist live edits of the current flow before swapping
    flowData[cur] = { nodes: get().nodes, edges: get().edges }
    const next = flowData[id]
    set({
      nodes: next.nodes,
      edges: next.edges,
      connByNode: buildAllConn(next.nodes, next.edges),
      activeFlow: id,
      editingId: null,
    })
  },

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) => {
    const prev = get().edges
    const edges = applyEdgeChanges(changes, prev)
    const removed = changes.filter((c) => c.type === 'remove')
    if (!removed.length) return set({ edges })
    const ids = new Set(removed.map((c) => c.id))
    const affected = prev.filter((e) => ids.has(e.id)).flatMap((e) => [e.source, e.target])
    set({ edges, connByNode: patchConnFor(affected, get().nodes, edges, get().connByNode) })
  },

  onConnect: (connection) => {
    const edge = isFlowEdge(connection)
      ? { ...connection, ...FLOW_EDGE }
      : { ...connection, type: 'data', animated: true }
    const edges = addEdge(edge, get().edges)
    const affected = [connection.source, connection.target].filter(Boolean) as string[]
    set({ edges, connByNode: patchConnFor(affected, get().nodes, edges, get().connByNode) })
  },

  removeEdge: (edgeId) => {
    const e = get().edges.find((x) => x.id === edgeId)
    const edges = get().edges.filter((x) => x.id !== edgeId)
    const affected = e ? [e.source, e.target] : []
    set({ edges, connByNode: patchConnFor(affected, get().nodes, edges, get().connByNode) })
  },

  addNode: (type, position) => {
    const node = makeNode(type, position)
    set({
      nodes: [...get().nodes, node],
      connByNode: { ...get().connByNode, [node.id]: { inByPort: {}, outConnected: [] } },
    })
  },

  updateValues: (id, values) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, values: { ...n.data.values, ...values } } }
          : n,
      ),
    }),

  toggleCollapse: (id) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n,
      ),
    }),

  openEditor: (id, tab = 'config') => set({ editingId: id, editingTab: tab }),
  closeEditor: () => set({ editingId: null }),

  runNode: async (id) => {
    const node = get().nodes.find((n) => n.id === id)
    if (!node) return
    const patch = (data: Partial<FlowNodeData>) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
        ),
      })
    patch({ status: 'running', result: undefined, finishedAt: undefined })
    const result = mockRun(node.type!, node.data.values, node.data.simulateError)
    await sleep(900 + Math.min(result.latencyMs, 2000))
    patch({ status: result.status, result, finishedAt: Date.now() })
  },

  resetRun: () =>
    set({
      nodes: get().nodes.map((n) => ({
        ...n,
        data: { ...n.data, status: 'idle', result: undefined, finishedAt: undefined },
      })),
    }),

  runFlow: async () => {
    if (get().running) return
    set({ running: true })
    const patch = (id: string, data: Partial<FlowNodeData>) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
        ),
      })

    const order = get().nodes
    // queue everything, then run a pool of at most 3 at a time, in order
    order.forEach((n) => patch(n.id, { status: 'queued', result: undefined, finishedAt: undefined }))

    const MAX_CONCURRENCY = 3
    let cursor = 0
    const worker = async () => {
      while (cursor < order.length) {
        const n = order[cursor++]
        patch(n.id, { status: 'running' })
        const result = mockRun(n.type!, n.data.values, n.data.simulateError)
        // simulated work — slower so the run reads as a real agent executing
        await sleep(900 + Math.min(result.latencyMs, 2000))
        patch(n.id, { status: result.status, result, finishedAt: Date.now() })
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENCY, order.length) }, worker),
    )
    set({ running: false })
  },

  clearCanvas: () => set({ nodes: [], edges: [], connByNode: {}, editingId: null }),

  toggleTheme: () =>
    set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
}))
