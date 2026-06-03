import { Unplug } from 'lucide-react'
import { useFlowStore } from '@/store/flowStore'

/** Floating "Disconnect" control rendered at an edge's midpoint when selected. */
export function EdgeDeleteButton({ edgeId, x, y }: { edgeId: string; x: number; y: number }) {
  const removeEdge = useFlowStore((s) => s.removeEdge)
  return (
    <button
      className="nodrag nopan flex items-center gap-1 rounded-full border border-border-soft bg-card px-2 py-1 text-[11px] font-semibold text-err shadow-md transition-colors hover:bg-err-soft"
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        pointerEvents: 'all',
      }}
      onClick={(e) => {
        e.stopPropagation()
        removeEdge(edgeId)
      }}
    >
      <Unplug className="h-3 w-3" />
      Disconnect
    </button>
  )
}
