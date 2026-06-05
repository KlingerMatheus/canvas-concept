import type { Edge } from '@xyflow/react'

/**
 * Walk the flow-sequence edges to assign an execution step number to each.
 * Linear chains are numbered from their root (a source never used as a target).
 */
export function flowOrder(edges: Edge[]): Map<string, number> {
  const flow = edges.filter((e) => e.data?.flow)
  const bySource = new Map<string, Edge>()
  for (const e of flow) if (!bySource.has(e.source)) bySource.set(e.source, e)
  const targets = new Set(flow.map((e) => e.target))

  const order = new Map<string, number>()
  let n = 1
  const starts = flow.filter((e) => !targets.has(e.source))
  for (const start of starts) {
    let cur: Edge | undefined = start
    while (cur && !order.has(cur.id)) {
      order.set(cur.id, n++)
      cur = bySource.get(cur.target)
    }
  }
  // leftovers (branches / cycles) numbered after the main chains
  for (const e of flow) if (!order.has(e.id)) order.set(e.id, n++)
  return order
}

/**
 * Node id -> execution step number, derived from the flow-sequence edges.
 * Memoised on the `edges` array identity so per-node selectors that call this
 * during a drag (edges ref unchanged) hit the cache and stay O(1).
 */
let _stepCache: { edges: Edge[]; map: Map<string, number> } | null = null
export function nodeStepMap(edges: Edge[]): Map<string, number> {
  if (_stepCache?.edges === edges) return _stepCache.map
  const order = flowOrder(edges) // edgeId -> step
  // the step of a node is the number of the flow edge leaving it; roots inherit
  // their outgoing edge's number, terminal nodes inherit their incoming edge's.
  const map = new Map<string, number>()
  const flow = edges.filter((e) => e.data?.flow)
  for (const e of flow) {
    const step = order.get(e.id)!
    if (!map.has(e.source)) map.set(e.source, step)
    // the target of the last edge in a chain has no outgoing edge → +1
    if (!map.has(e.target)) map.set(e.target, step + 1)
  }
  _stepCache = { edges, map }
  return map
}
