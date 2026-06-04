import { useState } from 'react'
import { Settings, Moon, Sun, Sparkles, Map, ScanEye, ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react'
import { useFlowStore } from '@/store/flowStore'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/cn'

function Row({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: typeof Settings
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-card-muted">
      <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-ink-faint">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const theme = useFlowStore((s) => s.theme)
  const toggleTheme = useFlowStore((s) => s.toggleTheme)
  const animations = useFlowStore((s) => s.animations)
  const minimap = useFlowStore((s) => s.minimap)
  const virtualize = useFlowStore((s) => s.virtualize)
  const setSetting = useFlowStore((s) => s.setSetting)
  const collapseAll = useFlowStore((s) => s.collapseAll)
  const expandAll = useFlowStore((s) => s.expandAll)

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 rounded-xl border border-border-soft bg-card p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[13px] font-semibold text-ink">Canvas settings</span>
            <button
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-card-muted hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Row
            icon={theme === 'dark' ? Moon : Sun}
            label="Dark theme"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
          <Row
            icon={Sparkles}
            label="Animations"
            hint="Edge flow + running pulse"
            checked={animations}
            onChange={(v) => setSetting('animations', v)}
          />
          <Row
            icon={Map}
            label="Minimap"
            checked={minimap}
            onChange={(v) => setSetting('minimap', v)}
          />
          <Row
            icon={ScanEye}
            label="Render only visible"
            hint="Cull off-screen — better perf"
            checked={virtualize}
            onChange={(v) => setSetting('virtualize', v)}
          />

          <div className="my-1.5 h-px bg-border-soft" />
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Default node state
          </div>
          <div className="flex gap-1.5 px-2 pb-1">
            <button
              onClick={collapseAll}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-card px-2 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
            >
              <ChevronsDownUp className="h-3.5 w-3.5" />
              Collapse all
            </button>
            <button
              onClick={expandAll}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-card px-2 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              Expand all
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        title="Canvas settings"
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full border border-border-soft bg-card text-ink-muted shadow-lg transition-all hover:text-ink',
          open && 'bg-accent text-white',
        )}
      >
        <Settings className={cn('h-5 w-5 transition-transform', open && 'rotate-90')} />
      </button>
    </div>
  )
}
