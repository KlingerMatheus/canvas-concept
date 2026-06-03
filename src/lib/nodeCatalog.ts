import {
  Sparkles,
  MessageSquare,
  MessageSquareReply,
  Type,
  FileText,
  Database,
  Globe,
  FileStack,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'slider'
  | 'password'
  | 'textarea'

export type EditTab = 'config' | 'context' | 'instructions' | 'advanced'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: { label: string; value: string }[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
  default: string | number
  /** which tab in the edit modal this field lives under (default: config) */
  tab?: EditTab
}

export type CategoryId = 'trigger' | 'ai' | 'io' | 'prompt' | 'data'

export interface CategoryMeta {
  id: CategoryId
  label: string
  /** icon gradient stops */
  from: string
  to: string
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  trigger: { id: 'trigger', label: 'Triggers', from: '#ff5f6d', to: '#8b7cf6' },
  ai: { id: 'ai', label: 'AI / Models', from: '#8b7cf6', to: '#6d5cf0' },
  io: { id: 'io', label: 'Inputs / Outputs', from: '#5b9dff', to: '#2f6bff' },
  prompt: { id: 'prompt', label: 'Prompts', from: '#f8b24a', to: '#ef8a2b' },
  data: { id: 'data', label: 'Data / Tools', from: '#34d399', to: '#0f9d76' },
}

export interface NodeMock {
  output: string
  tokens: number
  latencyMs: number
}

/** A named connection port. `id` is used as the React Flow handle id. */
export interface Port {
  id: string
  label: string
}

export interface NodeTypeDef {
  type: string
  category: CategoryId
  label: string
  subtitle: string
  icon: LucideIcon
  /** named input ports (left handles) */
  inputs: Port[]
  /** named output ports (right handles) — labels only on the card, payload lives in the modal */
  outputs: Port[]
  /** has a meaningful payload (gates the Output tab in the edit modal) */
  producesOutput: boolean
  /** field keys surfaced as rows on the expanded node card */
  summaryKeys: string[]
  fields: FieldDef[]
  mock: NodeMock
}

const AI_OUTPUT = `Sorry, I don't have information about the Brasileirão 2026 table.

My knowledge has a cutoff date (early 2025), so I don't have access to data about competitions or events that took place after that. To get the current standings I'd recommend checking an official sports source.`

export const NODE_TYPES: NodeTypeDef[] = [
  {
    type: 'flow-trigger',
    category: 'trigger',
    label: 'Flow Global Node',
    subtitle: 'Agent trigger',
    icon: Workflow,
    inputs: [],
    outputs: [],
    producesOutput: false,
    summaryKeys: [],
    fields: [
      { key: 'name', label: 'Agent Name', type: 'text', default: 'Flow Global Node' },
      { key: 'steps', label: 'Agent Steps', type: 'number', default: 2, min: 1 },
    ],
    mock: { output: 'Agent run complete · 2 steps · 25 nodes', tokens: 0, latencyMs: 600 },
  },
  {
    type: 'ai-chat',
    category: 'ai',
    label: 'AI - Chat Completion',
    subtitle: 'GPT-4o Mini',
    icon: Sparkles,
    inputs: [
      { id: 'prompt', label: 'Prompt' },
      { id: 'context', label: 'Context' },
      { id: 'persona', label: 'Persona' },
      { id: 'instructions', label: 'Instructions' },
    ],
    outputs: [
      { id: 'output', label: 'Output' },
      { id: 'logs', label: 'Logs' },
      { id: 'trace', label: 'Trace' },
    ],
    producesOutput: true,
    summaryKeys: ['model', 'systemPrompt'],
    fields: [
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        default: 'gpt-4o-mini',
        options: [
          { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
          { label: 'gpt-4o', value: 'gpt-4o' },
          { label: 'claude-opus-4', value: 'claude-opus-4' },
          { label: 'claude-sonnet-4', value: 'claude-sonnet-4' },
          { label: 'llama-3.3-70b', value: 'llama-3.3-70b' },
        ],
      },
      { key: 'temperature', label: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, default: 0.3 },
      { key: 'apiKey', label: 'API Key', type: 'password', default: 'sk-proj-xxxxxxxxxxxxxxxxxxxx', placeholder: 'sk-…' },
      { key: 'systemPrompt', label: 'System Prompt', type: 'textarea', default: 'You are a helpful and concise assistant.', tab: 'instructions' },
      { key: 'maxTokens', label: 'Max. Tokens', type: 'number', default: 1024, min: 1 },
      { key: 'topP', label: 'Top P', type: 'slider', min: 0, max: 1, step: 0.05, default: 1, tab: 'advanced' },
      { key: 'context', label: 'Context Window', type: 'textarea', default: '', placeholder: 'Optional retrieved context…', tab: 'context' },
    ],
    mock: { output: AI_OUTPUT, tokens: 388, latencyMs: 2340 },
  },
  {
    type: 'chat-input',
    category: 'io',
    label: 'Chat Input',
    subtitle: 'User message',
    icon: MessageSquare,
    inputs: [],
    outputs: [{ id: 'output', label: 'Output' }],
    producesOutput: false,
    summaryKeys: ['sender', 'text'],
    fields: [
      { key: 'sender', label: 'Sender', type: 'select', default: 'user', options: [
        { label: 'User', value: 'user' },
        { label: 'Machine', value: 'machine' },
      ] },
      { key: 'text', label: 'Message', type: 'textarea', default: 'Who is leading the Brasileirão 2026?' },
    ],
    mock: { output: 'Who is leading the Brasileirão 2026?', tokens: 9, latencyMs: 40 },
  },
  {
    type: 'chat-output',
    category: 'io',
    label: 'Chat Output',
    subtitle: 'Response',
    icon: MessageSquareReply,
    inputs: [{ id: 'input', label: 'Input' }],
    outputs: [{ id: 'logs', label: 'Logs' }],
    producesOutput: true,
    summaryKeys: ['format'],
    fields: [
      { key: 'format', label: 'Format', type: 'select', default: 'markdown', options: [
        { label: 'Markdown', value: 'markdown' },
        { label: 'Plain text', value: 'text' },
      ] },
    ],
    mock: { output: AI_OUTPUT, tokens: 388, latencyMs: 60 },
  },
  {
    type: 'text-input',
    category: 'io',
    label: 'Text Input',
    subtitle: 'Static value',
    icon: Type,
    inputs: [],
    outputs: [{ id: 'output', label: 'Output' }],
    producesOutput: false,
    summaryKeys: ['value'],
    fields: [
      { key: 'value', label: 'Value', type: 'textarea', default: 'Brazilian football league standings' },
    ],
    mock: { output: 'Brazilian football league standings', tokens: 6, latencyMs: 20 },
  },
  {
    type: 'prompt',
    category: 'prompt',
    label: 'Prompt',
    subtitle: 'Template',
    icon: FileText,
    inputs: [{ id: 'variables', label: 'Variables' }],
    outputs: [{ id: 'prompt', label: 'Prompt' }],
    producesOutput: true,
    summaryKeys: ['template'],
    fields: [
      { key: 'template', label: 'Template', type: 'textarea', default: 'Answer the question using only the {context}.\n\nQuestion: {question}' },
    ],
    mock: { output: 'Answer the question using only the retrieved context.\n\nQuestion: Who is leading the Brasileirão 2026?', tokens: 42, latencyMs: 120 },
  },
  {
    type: 'vector-store',
    category: 'data',
    label: 'Vector Store',
    subtitle: 'Similarity search',
    icon: Database,
    inputs: [{ id: 'query', label: 'Query' }],
    outputs: [
      { id: 'results', label: 'Results' },
      { id: 'logs', label: 'Logs' },
    ],
    producesOutput: true,
    summaryKeys: ['provider', 'collection', 'topK'],
    fields: [
      { key: 'provider', label: 'Provider', type: 'select', default: 'pgvector', options: [
        { label: 'pgvector', value: 'pgvector' },
        { label: 'Pinecone', value: 'pinecone' },
        { label: 'Chroma', value: 'chroma' },
        { label: 'Qdrant', value: 'qdrant' },
      ] },
      { key: 'collection', label: 'Collection', type: 'text', default: 'knowledge_base' },
      { key: 'topK', label: 'Top K', type: 'number', default: 4, min: 1, max: 50 },
    ],
    mock: { output: '4 documents retrieved · avg score 0.82', tokens: 0, latencyMs: 310 },
  },
  {
    type: 'api-request',
    category: 'data',
    label: 'API Request',
    subtitle: 'HTTP',
    icon: Globe,
    inputs: [{ id: 'body', label: 'Body' }],
    outputs: [
      { id: 'response', label: 'Response' },
      { id: 'logs', label: 'Logs' },
    ],
    producesOutput: true,
    summaryKeys: ['method', 'url'],
    fields: [
      { key: 'method', label: 'Method', type: 'select', default: 'GET', options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ] },
      { key: 'url', label: 'URL', type: 'text', default: 'https://api.example.com/v1/standings' },
      { key: 'headers', label: 'Headers', type: 'textarea', default: '{ "Authorization": "Bearer •••" }', tab: 'advanced' },
    ],
    mock: { output: '200 OK · 1.2 KB · application/json', tokens: 0, latencyMs: 540 },
  },
  {
    type: 'doc-loader',
    category: 'data',
    label: 'Document Loader',
    subtitle: 'Ingest',
    icon: FileStack,
    inputs: [],
    outputs: [{ id: 'documents', label: 'Documents' }],
    producesOutput: true,
    summaryKeys: ['source', 'chunkSize'],
    fields: [
      { key: 'source', label: 'Source', type: 'select', default: 'pdf', options: [
        { label: 'PDF', value: 'pdf' },
        { label: 'Web URL', value: 'url' },
        { label: 'CSV', value: 'csv' },
      ] },
      { key: 'path', label: 'Path', type: 'text', default: '/docs/handbook.pdf' },
      { key: 'chunkSize', label: 'Chunk Size', type: 'number', default: 1000, min: 100 },
    ],
    mock: { output: '38 chunks loaded · 1000 tokens each', tokens: 0, latencyMs: 220 },
  },
]

export const NODE_TYPE_MAP: Record<string, NodeTypeDef> = Object.fromEntries(
  NODE_TYPES.map((n) => [n.type, n]),
)

export function defaultData(type: string): Record<string, string | number> {
  const def = NODE_TYPE_MAP[type]
  const data: Record<string, string | number> = {}
  for (const f of def.fields) data[f.key] = f.default
  return data
}
