import { CheckCircle2, XCircle, Loader2, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatLatency, type RunResult, type RunStatus } from '@/lib/mockRun'

interface Props {
  status: RunStatus
  result?: RunResult
  variant?: 'bar' | 'line'
  className?: string
}

export function NodeStatusBar({ status, result, variant = 'bar', className }: Props) {
  const isBar = variant === 'bar'

  const content = () => {
    if (status === 'running') {
      return (
        <span className="flex items-center gap-1.5 text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Running…
        </span>
      )
    }
    if (status === 'queued') {
      return (
        <span className="flex items-center gap-1.5 text-ink-faint">
          <Clock className="h-3.5 w-3.5" />
          Queued…
        </span>
      )
    }
    if (status === 'idle' || !result) {
      return (
        <span className="flex items-center gap-1.5 text-ink-faint">
          <Circle className="h-3 w-3" />
          Not run yet
        </span>
      )
    }
    if (result.status === 'error') {
      return (
        <span className="flex items-center gap-2 text-err">
          <span className="flex items-center gap-1.5 font-medium">
            <XCircle className="h-3.5 w-3.5" />
            Error
          </span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-ink-muted">{formatLatency(result.latencyMs)}</span>
          <span className="text-ink-faint">·</span>
          <span className="text-err">{result.error}</span>
        </span>
      )
    }
    return (
      <span className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 font-medium text-ok">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Success
        </span>
        <span className="text-ink-faint">·</span>
        <span className="font-mono text-ink-muted">{formatLatency(result.latencyMs)}</span>
        {result.tokens > 0 && (
          <>
            <span className="text-ink-faint">·</span>
            <span className="font-mono text-ink-muted">{result.tokens} tokens</span>
          </>
        )}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'text-[12px]',
        isBar &&
          'rounded-lg border px-3 py-2',
        isBar && result?.status === 'error'
          ? 'border-err/30 bg-err-soft'
          : isBar && status === 'success'
            ? 'border-ok/25 bg-ok-soft'
            : isBar && 'border-border-soft bg-card-muted',
        className,
      )}
    >
      {content()}
    </div>
  )
}
