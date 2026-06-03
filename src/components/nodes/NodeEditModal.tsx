import { useMemo, useState } from 'react'
import { Settings2, BookOpen, ListChecks, SlidersHorizontal, TerminalSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label, Input, Textarea } from '@/components/ui/field'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NODE_TYPE_MAP, type EditTab, type FieldDef } from '@/lib/nodeCatalog'
import { useFlowStore } from '@/store/flowStore'
import { NodeIcon } from './NodeIcon'
import { NodeStatusBar } from './NodeStatusBar'

const TABS: { id: EditTab | 'output'; label: string; icon: typeof Settings2 }[] = [
  { id: 'config', label: 'Configuration', icon: Settings2 },
  { id: 'context', label: 'Context', icon: BookOpen },
  { id: 'instructions', label: 'Instructions', icon: ListChecks },
  { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
  { id: 'output', label: 'Output', icon: TerminalSquare },
]

type Values = Record<string, string | number>

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: string | number
  onChange: (v: string | number) => void
}) {
  switch (field.type) {
    case 'select':
      return (
        <Select value={String(value)} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'slider':
      return (
        <div className="flex items-center gap-3">
          <Slider
            value={[Number(value)]}
            min={field.min ?? 0}
            max={field.max ?? 1}
            step={field.step ?? 0.1}
            onValueChange={(v) => onChange(v[0])}
            className="flex-1"
          />
          <span className="w-10 text-right font-mono text-[13px] text-ink">
            {Number(value).toFixed(field.step && field.step < 1 ? 1 : 0)}
          </span>
        </div>
      )
    case 'textarea':
      return (
        <Textarea
          rows={4}
          value={String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          value={String(value)}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )
    case 'password':
      return (
        <Input
          type="password"
          value={String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    default:
      return (
        <Input
          value={String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

function ModalBody({ nodeId }: { nodeId: string }) {
  const node = useFlowStore((s) => s.nodes.find((n) => n.id === nodeId))!
  const updateValues = useFlowStore((s) => s.updateValues)
  const closeEditor = useFlowStore((s) => s.closeEditor)
  const initialTab = useFlowStore((s) => s.editingTab)
  const def = NODE_TYPE_MAP[node.type!]
  const [draft, setDraft] = useState<Values>({ ...node.data.values })

  const byTab = useMemo(() => {
    const map: Record<EditTab, FieldDef[]> = {
      config: [],
      context: [],
      instructions: [],
      advanced: [],
    }
    for (const f of def.fields) map[f.tab ?? 'config'].push(f)
    return map
  }, [def])

  const set = (key: string, v: string | number) =>
    setDraft((d) => ({ ...d, [key]: v }))

  const save = () => {
    updateValues(nodeId, draft)
    closeEditor()
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-soft px-5 py-4">
        <NodeIcon def={def} size="sm" />
        <div>
          <DialogTitle>Edit Node · {def.label}</DialogTitle>
          <p className="text-[12px] text-ink-muted">{def.subtitle}</p>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="flex">
        {/* Left nav */}
        <TabsList className="flex w-52 shrink-0 flex-col gap-1 border-r border-border-soft p-3">
          {TABS.map((t) => {
            const Icon = t.icon
            const count = t.id === 'output' ? 0 : byTab[t.id].length
            return (
              <TabsTrigger key={t.id} value={t.id}>
                <Icon className="h-4 w-4" />
                {t.label}
                {t.id === 'output' ? (
                  <span
                    className="ml-auto h-2 w-2 rounded-full"
                    style={{
                      background:
                        node.data.status === 'error'
                          ? 'var(--err)'
                          : node.data.status === 'success'
                            ? 'var(--ok)'
                            : 'var(--ink-faint)',
                    }}
                  />
                ) : (
                  count > 0 && (
                    <span className="ml-auto rounded-full bg-card-muted px-1.5 text-[10px] text-ink-faint group-data-[state=active]:bg-accent/15 group-data-[state=active]:text-accent">
                      {count}
                    </span>
                  )
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <ScrollArea className="h-[560px]">
            <div className="p-6">
              {TABS.filter((t) => t.id !== 'output').map((t) => (
                <TabsContent key={t.id} value={t.id} className="mx-auto max-w-2xl space-y-5">
                  {byTab[t.id as EditTab].length === 0 ? (
                    <p className="py-10 text-center text-[13px] text-ink-faint">
                      No {t.label.toLowerCase()} options for this node.
                    </p>
                  ) : (
                    byTab[t.id as EditTab].map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <Label>{f.label}</Label>
                        <FieldControl
                          field={f}
                          value={draft[f.key]}
                          onChange={(v) => set(f.key, v)}
                        />
                      </div>
                    ))
                  )}
                </TabsContent>
              ))}

              {/* Output tab */}
              <TabsContent value="output" className="mx-auto max-w-3xl">
                {!def.producesOutput ? (
                  <p className="py-10 text-center text-[13px] text-ink-faint">
                    This node does not produce an output.
                  </p>
                ) : (
                  <div
                    className="rounded-xl border-l-2 bg-card-muted p-4"
                    style={{
                      borderLeftColor:
                        node.data.status === 'error'
                          ? 'var(--err)'
                          : node.data.status === 'success'
                            ? 'var(--ok)'
                            : 'var(--border-strong)',
                    }}
                  >
                    <NodeStatusBar
                      status={node.data.status}
                      result={node.data.result}
                      variant="line"
                      className="mb-3"
                    />
                    <div className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-ink-muted">
                      {node.data.result?.output || 'Run the flow to generate output.'}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border-soft px-5 py-3.5">
        <Button variant="secondary" size="sm" onClick={closeEditor}>
          Cancel
        </Button>
        <Button size="sm" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  )
}

export function NodeEditModal() {
  const editingId = useFlowStore((s) => s.editingId)
  const closeEditor = useFlowStore((s) => s.closeEditor)

  return (
    <Dialog open={!!editingId} onOpenChange={(o) => !o && closeEditor()}>
      <DialogContent className="w-[min(1080px,calc(100vw-2rem))] p-0">
        {editingId && <ModalBody key={editingId} nodeId={editingId} />}
      </DialogContent>
    </Dialog>
  )
}
