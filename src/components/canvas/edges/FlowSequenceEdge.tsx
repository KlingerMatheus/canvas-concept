import { memo, useMemo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { useFlowStore } from '@/store/flowStore'
import { flowOrder } from '@/lib/flowOrder'
import { EdgeDeleteButton } from './EdgeDeleteButton'

function FlowSequenceEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
}: EdgeProps) {
  const edges = useFlowStore((s) => s.edges)
  const step = useMemo(() => flowOrder(edges).get(id), [edges, id])

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 24,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: 'url(#fp-flow-grad)',
          strokeWidth: 3,
          strokeLinecap: 'round',
          filter: selected ? 'drop-shadow(0 0 3px var(--accent))' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        {/* sequence number at the target (entry) side — easier to read */}
        <div
          className="nodrag nopan flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetX - 18}px, ${targetY}px)`,
            background: 'linear-gradient(145deg, #5b9dff, #6d5cf0)',
            boxShadow: '0 2px 6px -1px rgba(109,92,240,0.6), 0 0 0 2px var(--card)',
            pointerEvents: 'none',
          }}
        >
          {step ?? '•'}
        </div>
        {selected && <EdgeDeleteButton edgeId={id} x={labelX} y={labelY} />}
      </EdgeLabelRenderer>
    </>
  )
}

export const FlowSequenceEdge = memo(FlowSequenceEdgeImpl)
