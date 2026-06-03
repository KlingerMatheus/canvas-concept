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
import { defaultData } from '@/lib/nodeCatalog'
import { mockRun, type RunResult, type RunStatus } from '@/lib/mockRun'

export interface FlowNodeData extends Record<string, unknown> {
  values: Record<string, string | number>
  collapsed: boolean
  status: RunStatus
  result?: RunResult
  /** optional display title overriding the catalog label (for realistic scenarios) */
  title?: string
  /** demo flag: this node fails on run, to showcase the error state */
  simulateError?: boolean
}

export type FlowNode = Node<FlowNodeData>

let idCounter = 100
const nextId = () => `n${idCounter++}`

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface FlowState {
  nodes: FlowNode[]
  edges: Edge[]
  theme: 'light' | 'dark'
  editingId: string | null
  editingTab: string
  running: boolean

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

const byKey: Record<string, FlowNode> = {}
const seedNodes: FlowNode[] = SPECS.map((s) => {
  const n = makeNode(
    s.type,
    { x: s.x, y: s.y },
    { collapsed: s.type === 'flow-trigger' ? false : !s.expanded, title: s.title, simulateError: s.error },
  )
  byKey[s.key] = n
  return n
})

const seedEdges: Edge[] = [
  ...FLOW_CHAIN.slice(0, -1).map((k, i) => ({
    id: `f${i}`,
    source: byKey[k].id,
    sourceHandle: 'flow-out',
    target: byKey[FLOW_CHAIN[i + 1]].id,
    targetHandle: 'flow-in',
    ...FLOW_EDGE,
  })),
  ...DATA_LINKS.map(([sk, sp, tk, tp], i) => ({
    id: `dd${i}`,
    source: byKey[sk].id,
    sourceHandle: sp,
    target: byKey[tk].id,
    targetHandle: tp,
    type: 'data',
    animated: true,
  })),
]

const prefersDark =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: seedNodes,
  edges: seedEdges,
  theme: prefersDark ? 'dark' : 'light',
  editingId: null,
  editingTab: 'config',
  running: false,

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) =>
    set({
      edges: addEdge(
        isFlowEdge(connection)
          ? { ...connection, ...FLOW_EDGE }
          : { ...connection, type: 'data', animated: true },
        get().edges,
      ),
    }),

  removeEdge: (edgeId) =>
    set({ edges: get().edges.filter((e) => e.id !== edgeId) }),

  addNode: (type, position) =>
    set({ nodes: [...get().nodes, makeNode(type, position)] }),

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

  resetRun: () =>
    set({
      nodes: get().nodes.map((n) => ({
        ...n,
        data: { ...n.data, status: 'idle', result: undefined },
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
    order.forEach((n) => patch(n.id, { status: 'queued', result: undefined }))

    const MAX_CONCURRENCY = 3
    let cursor = 0
    const worker = async () => {
      while (cursor < order.length) {
        const n = order[cursor++]
        patch(n.id, { status: 'running' })
        const result = mockRun(n.type!, n.data.values, n.data.simulateError)
        // simulated work — slower so the run reads as a real agent executing
        await sleep(900 + Math.min(result.latencyMs, 2000))
        patch(n.id, { status: result.status, result })
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENCY, order.length) }, worker),
    )
    set({ running: false })
  },

  clearCanvas: () => set({ nodes: [], edges: [], editingId: null }),

  toggleTheme: () =>
    set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
}))
