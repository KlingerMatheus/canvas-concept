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
