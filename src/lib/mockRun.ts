import { NODE_TYPE_MAP } from './nodeCatalog'

export type RunStatus = 'idle' | 'queued' | 'running' | 'success' | 'error'

export interface RunResult {
  status: 'success' | 'error'
  latencyMs: number
  tokens: number
  output: string
  error?: string
}

const ERRORS = [
  'Timeout exceeded',
  'Rate limit reached',
  'Invalid API key',
  'Connection refused',
]

/** Deterministic mocked execution result for a node. */
export function mockRun(
  type: string,
  data: Record<string, string | number>,
  forceError = false,
): RunResult {
  const def = NODE_TYPE_MAP[type]
  const base = def?.mock ?? { output: 'Done', tokens: 0, latencyMs: 100 }

  if (forceError) {
    return {
      status: 'error',
      latencyMs: 1120,
      tokens: 0,
      output: '',
      error: ERRORS[0],
    }
  }

  // Echo configured values into the output where it makes the demo feel live.
  let output = base.output
  if (type === 'chat-input') output = String(data.text ?? base.output)
  if (type === 'text-input') output = String(data.value ?? base.output)

  return {
    status: 'success',
    latencyMs: base.latencyMs,
    tokens: base.tokens,
    output,
  }
}

export function formatLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`
}
