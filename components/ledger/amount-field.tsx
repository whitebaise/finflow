'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { QUICK_AMOUNTS } from '@/lib/ledger'

export function AmountField({
  value,
  onChange,
  invalid,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  autoFocus?: boolean
}) {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div>
      <label htmlFor={id} className="text-[13px] text-muted-foreground">
        金额
      </label>
      <div
        className={cn(
          'mt-1.5 flex h-16 items-center gap-1 rounded-2xl border bg-muted/60 px-4 transition-colors focus-within:border-primary focus-within:bg-card',
          invalid ? 'border-destructive' : 'border-transparent',
        )}
      >
        <span className="text-2xl font-semibold text-foreground" aria-hidden="true">
          ¥
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0"
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={hintId}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d.]/g, '')
            if (next === '' || /^\d{0,5}(\.\d{0,2})?$/.test(next)) onChange(next)
          }}
          className="h-full w-full min-w-0 bg-transparent text-[32px] font-semibold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 rounded-full px-2 py-1 text-[13px] text-muted-foreground active:bg-muted"
          >
            清空
          </button>
        )}
      </div>
      <p id={hintId} className={cn('mt-1.5 text-xs', invalid ? 'text-destructive' : 'text-muted-foreground')}>
        {invalid ? '请输入大于 0 的金额，最多两位小数' : '支持最多两位小数'}
      </p>
      <div className="mt-3 grid grid-cols-5 gap-2" role="group" aria-label="快捷金额">
        {QUICK_AMOUNTS.map((n) => {
          const active = value === String(n)
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              aria-pressed={active}
              className={cn(
                'h-11 rounded-xl border text-[15px] font-medium tabular-nums transition-colors',
                active ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-card text-foreground active:bg-muted',
              )}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
