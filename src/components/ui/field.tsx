import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/cn'

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-[11px] font-semibold uppercase tracking-wide text-ink-faint',
        className,
      )}
      {...props}
    />
  )
}

export function Input({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-lg border border-border-strong bg-card px-3 text-[13px] text-ink',
        'placeholder:text-ink-faint transition-colors hover:border-accent/50',
        'focus:outline-none focus:ring-2 focus:ring-accent/40',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-lg border border-border-strong bg-card px-3 py-2 text-[13px] leading-relaxed text-ink',
        'placeholder:text-ink-faint transition-colors hover:border-accent/50',
        'focus:outline-none focus:ring-2 focus:ring-accent/40',
        className,
      )}
      {...props}
    />
  )
}
