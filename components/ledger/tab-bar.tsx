'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TabBar<T extends string>({
  items,
  value,
  onChange,
  label,
  featured,
}: {
  items: { id: T; label: string; icon: LucideIcon }[]
  value: T
  onChange: (id: T) => void
  label: string
  featured?: T
}) {
  return (
    <nav
      aria-label={label}
      className="pb-safe fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-card"
    >
      <ul className="flex">
        {items.map(({ id, label, icon: Icon }) => {
          const active = value === id
          const isFeatured = id === featured
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-[60px] w-full flex-col items-center justify-center gap-0.5 text-[11px]',
                  active ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  isFeatured && 'justify-end pb-2',
                )}
              >
                {isFeatured ? (
                  <span
                    className={cn(
                      '-mt-7 mb-1 flex size-[52px] items-center justify-center rounded-2xl bg-lime text-lime-foreground shadow-[0_6px_16px_rgba(120,150,20,0.35)] transition-transform',
                      active && 'scale-105',
                    )}
                  >
                    <Icon className="size-6" strokeWidth={2.2} aria-hidden="true" />
                  </span>
                ) : (
                  <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
                )}
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
