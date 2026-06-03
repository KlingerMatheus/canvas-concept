# ReactFlow Architecture — Replication Blueprint

A condensed map of **how the flow editor uses ReactFlow** (package `reactflow`, v11), plus a **self-contained minimal skeleton** you can paste into a fresh React + Vite project to prototype (e.g. with Claude design). Business logic (autosave, API, sockets, MUI) is intentionally stripped — only the ReactFlow wiring is kept.

> Stack assumed for the prototype: React 18 + TypeScript + Vite + `reactflow@^11`.

---

## 1. Architecture at a glance

```
<ReactFlowProvider>                     ← context, mounted once near the app root
  └─ <FlowCanvas>                        ← owns nodes/edges state
       └─ <ReactFlow                     ← the canvas
            nodeTypes={nodeTypes}        ← map: "typeString" -> component
            edgeTypes={edgeTypes}        ← map: "typeString" -> edge component
            onNodesChange / onEdgesChange / onConnect ...>
            <Background/> <Controls/> <Panel/>
          </ReactFlow>

Each node component = { id, data } props
  └─ base <Node> wrapper (frame: header, run button, menu)
       └─ <Handle> (source/target connection points)
       └─ node body (the dynamic fields)
```

**Key decisions in the real app (worth copying or skipping):**

| Decision | What it does | Keep for prototype? |
|---|---|---|
| `useNodesState` / `useEdgesState` in a parent view | Local source of truth for nodes/edges | ✅ Keep |
| Zustand store holds the **setter functions** (not the data) | Lets side-effects update nodes from anywhere | ⛔ Skip (use local state) |
| `withRemountKey` HOC on every node type | Forces a remount when `data._remountKey` changes | ⚠️ Optional |
| Custom edge types (`custom`, `loopEdge`, `default`) | Gradient/animated/selectable edges | ✅ Keep one |
| Base `<Node>` UI wrapper shared by all nodes | Consistent frame + handles + toolbar | ✅ Keep (simplified) |

---

## 2. Provider (mounted once)

`src/App.tsx` wraps the router in the provider so the whole app shares one ReactFlow context:

```tsx
import { ReactFlowProvider } from 'reactflow';

<ReactFlowProvider>
  <RouterProvider router={router} />
</ReactFlowProvider>
```

`<ReactFlowProvider>` is required if any component outside `<ReactFlow>` calls hooks like `useReactFlow()`, `useNodesState`, or `useStore()`.

---

## 3. State ownership

The parent view (`src/views/CoreNodeDisplay.tsx`) owns the state with ReactFlow's built-in hooks (which apply `applyNodeChanges` / `applyEdgeChanges` for you):

```tsx
const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
```

Then it passes them to the canvas component along with the handlers. *(The real app also stores `setNodes`/`setEdges` in a Zustand store so autosave/socket code can mutate nodes — not needed for a prototype.)*

---

## 4. Canvas configuration

The real canvas (`src/components/ReactFlow/ReactFlowBody.tsx`) renders `<ReactFlow>` with these meaningful props:

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onlyRenderVisibleElements   // perf: skip off-screen nodes/edges
  snapToGrid
  fitView
  minZoom={0.03}
  multiSelectionKeyCode={['Control', 'Shift']}
  elevateEdgesOnSelect
  proOptions={{ hideAttribution: true }}
  connectionLineType={lineType}            // 'default' | 'straight' | 'step' | 'smoothstep' | 'bezier'
  connectionLineStyle={{ strokeWidth: 2 }}
>
  <Background gap={12} size={1} />
  <Controls position="bottom-right" />
  <Panel position="top-right">{/* toolbar */}</Panel>
</ReactFlow>
```

---

## 5. Node + edge type registries

`src/util/nodeTypes.tsx` maps **type strings → components**. The real app wraps each with `withRemountKey`:

```tsx
const withRemountKey =
  (Component) => (props) => <Component key={props.data?._remountKey} {...props} />;

export const nodeTypes = {
  textBox: withRemountKey(TextBoxNode),
  webSearch: withRemountKey(WebSearch),
  stickyNote: withRemountKey(StickyNote),
  // ~45 types total: each key is the node's `type`, value is the component
};

export const edgeTypes = {
  custom: FlowGlobalEdge,          // gradient/animated "flow" edge
  loopEdge: LoopEdge,              // self-reference loop
  default: SelectableDefaultEdge,  // plain selectable edge
};
```

> ⚠️ Define `nodeTypes`/`edgeTypes` **outside** the component (or wrap in `useMemo`). New object identity each render forces ReactFlow to re-init all node types.

---

## 6. Anatomy of a custom node

Every node receives `{ id, data, selected, ... }` (type `NodeProps`), renders a shared frame, the connection **handles**, and its own body. Simplified from `src/components/nodes/*` + the base `src/components/UI/Node/Node.tsx`:

```tsx
import { Handle, Position, NodeProps } from 'reactflow';
import { memo, useState } from 'react';

function TextBoxNode({ id, data }: NodeProps) {
  const [text, setText] = useState(data?.text ?? '');
  return (
    <div className="node">
      <Handle type="target" position={Position.Left} id="input" />
      <strong>{data?.label}</strong>
      <textarea
        className="nodrag nowheel"   // nodrag = don't drag node; nowheel = allow scroll
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Handle type="source" position={Position.Right} id="output" />
    </div>
  );
}
export default memo(TextBoxNode);   // memo so unrelated re-renders don't repaint it
```

Handle essentials: `type="source"` (outgoing) or `"target"` (incoming), a `position`, and a unique `id` (used as `sourceHandle`/`targetHandle` when an edge connects). Add `nodrag`/`nowheel` classes to interactive fields so dragging/scrolling inside them doesn't move the canvas.

---

## 7. Custom edge

Edges receive `EdgeProps` and build a path with `getBezierPath`; labels/buttons go through `EdgeLabelRenderer`. Simplified from `src/components/edges/`:

```tsx
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from 'reactflow';

function CustomEdge({ id, sourceX, sourceY, targetX, targetY,
                      sourcePosition, targetPosition, selected, markerEnd }: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd}
                style={{ strokeWidth: selected ? 3 : 2 }} />
      {selected && (
        <EdgeLabelRenderer>
          <button
            className="nodrag nopan"
            style={{ position: 'absolute', transform:
              `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }}
            onClick={() => {/* delete this edge */}}
          >×</button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
```

---

## 8. Core interactions

**Connect (create an edge)** — `onConnect` uses `addEdge`; the app picks the edge `type` from the source handle id:

```tsx
const onConnect = useCallback((params: Connection) => {
  setEdges((eds) => addEdge({
    ...params,                       // { source, target, sourceHandle, targetHandle }
    type: params.sourceHandle === 'outputFlow' ? 'custom' : 'default',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  }, eds));
}, [setEdges]);
```

**Add a node** — push a new node object (drag-and-drop computes `position` from the drop point via `screenToFlowPosition`):

```tsx
const newNode = {
  id: `${type}_${crypto.randomUUID()}`,
  type,                              // must exist in nodeTypes
  position: { x, y },
  data: { label, ...initialData },   // real app also stores myId, title, isEmptyState
};
setNodes((nds) => nds.concat(newNode));
```

**Delete** — ReactFlow fires `onNodesChange`/`onEdgesChange` with `{ type: 'remove' }`, or call `setNodes`/`setEdges` to filter them out. The real app intercepts deletes to also clean up connected edges and call the backend.

---

## 9. Minimal runnable skeleton (paste into a fresh project)

```bash
npm create vite@latest flow-proto -- --template react-ts
cd flow-proto && npm i reactflow
```

```tsx
// src/App.tsx
import { useCallback, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  Handle, Position, getBezierPath, BaseEdge,
  type Connection, type Edge, type Node, type NodeProps, type EdgeProps,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// --- custom node ---
function TextNode({ data }: NodeProps) {
  const [text, setText] = useState(data?.text ?? '');
  return (
    <div style={{ padding: 10, border: '1px solid #888', borderRadius: 8, background: '#fff' }}>
      <Handle type="target" position={Position.Left} id="input" />
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{data?.label ?? 'Node'}</div>
      <textarea className="nodrag nowheel" value={text}
        onChange={(e) => setText(e.target.value)} rows={3} style={{ width: 160 }} />
      <Handle type="source" position={Position.Right} id="output" />
    </div>
  );
}

// --- custom edge ---
function CustomEdge({ id, sourceX, sourceY, targetX, targetY,
                      sourcePosition, targetPosition, markerEnd }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition,
                                 targetX, targetY, targetPosition });
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ strokeWidth: 2 }} />;
}

// --- registries: declared OUTSIDE the component ---
const nodeTypes = { textNode: TextNode };
const edgeTypes = { custom: CustomEdge };

const initialNodes: Node[] = [
  { id: 'a', type: 'textNode', position: { x: 0,   y: 0 },   data: { label: 'A' } },
  { id: 'b', type: 'textNode', position: { x: 320, y: 120 }, data: { label: 'B' } },
];
const initialEdges: Edge[] = [];

function FlowCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(
      { ...params, type: 'custom', animated: true,
        markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }, [setEdges]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onlyRenderVisibleElements
        snapToGrid
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={12} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
```

This runs a working canvas: drag nodes, connect handles to create edges, pan/zoom, with a custom node and custom edge. Extend it by adding entries to `nodeTypes`/`edgeTypes`.

---

## 10. Performance notes (when scaling the prototype)

- Declare `nodeTypes`/`edgeTypes` **outside** the component (already done above).
- Wrap node components in `React.memo`.
- Keep `onlyRenderVisibleElements` on for large graphs.
- In node components, subscribe only to the specific state you need — avoid reading the whole edge list (`useEdges()`) in every node, since that re-renders all nodes whenever any edge changes. *(This is the main scaling pitfall in the real app — see [performance-overview.md](performance-overview.md).)*

---

*Source references: `src/App.tsx`, `src/views/CoreNodeDisplay.tsx`, `src/components/ReactFlow/ReactFlowBody.tsx`, `src/util/nodeTypes.tsx`, `src/components/UI/Node/Node.tsx`, `src/components/nodes/*`, `src/components/edges/*`.*
