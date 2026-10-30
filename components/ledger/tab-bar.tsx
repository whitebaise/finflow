'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TabBar<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; label: string; icon: LucideIcon }[]
  value: T
  onChange: (id: T) => void
  label: string
}) {
  return (
    <nav aria-label={label} className="pb-safe fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur">
      <ul className="flex">
        {items.map(({ id, label, icon: Icon }) => {
          const active = value === id
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className={cn('flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px]', active ? 'font-semibold text-primary' : 'text-muted-foreground')}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
