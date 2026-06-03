import { useCallback, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react'
import { useShallow } from 'zustand/react/shallow'
import { useFlowStore } from '@/store/flowStore'
import { NODE_TYPES, CATEGORIES } from '@/lib/nodeCatalog'
import { FlowNode } from '@/components/nodes/FlowNode'
import { TriggerNode } from '@/components/nodes/TriggerNode'
import { DataEdge } from './edges/DataEdge'
import { FlowSequenceEdge } from './edges/FlowSequenceEdge'

const edgeTypes: EdgeTypes = { data: DataEdge, flow: FlowSequenceEdge }

function Canvas() {
  const wrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } =
    useFlowStore(
      useShallow((s) => ({
        nodes: s.nodes,
        edges: s.edges,
        onNodesChange: s.onNodesChange,
        onEdgesChange: s.onEdgesChange,
        onConnect: s.onConnect,
        addNode: s.addNode,
      })),
    )

  // generic component for every catalog type, except the special trigger node
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      ...Object.fromEntries(NODE_TYPES.map((n) => [n.type, FlowNode])),
      'flow-trigger': TriggerNode,
    }),
    [],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/fluxnode')
      if (!type) return
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode(type, position)
    },
    [screenToFlowPosition, addNode],
  )

  return (
    <div ref={wrapper} className="h-full w-full">
      {/* gradient used by the flow-sequence edges */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="fp-flow-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5b9dff" />
            <stop offset="100%" stopColor="#8b7cf6" />
          </linearGradient>
        </defs>
      </svg>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        defaultEdgeOptions={{ type: 'data', animated: true }}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.6}
          color="var(--grid-dot)"
        />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="color-mix(in srgb, var(--canvas) 70%, transparent)"
          style={{ background: 'var(--surface)' }}
          nodeColor={(n) =>
            CATEGORIES[
              NODE_TYPES.find((d) => d.type === n.type)?.category ?? 'ai'
            ].to
          }
        />
      </ReactFlow>
    </div>
  )
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}
