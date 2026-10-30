'use client'

import { ChevronLeft } from 'lucide-react'

/** Mirrors a WeChat custom navigation bar: status area, title, and reserved space for the native capsule. */
export function WxNavBar({
  title,
  onBack,
  left,
}: {
  title: string
  onBack?: () => void
  left?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/95 pt-[max(env(safe-area-inset-top),20px)] backdrop-blur">
      <div className="relative flex h-11 items-center px-2">
        <div className="flex min-w-[88px] items-center">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="ml-1.5 flex size-10 items-center justify-center rounded-full bg-card text-foreground shadow-[0_1px_4px_rgba(20,48,31,0.12)] active:bg-muted"
              aria-label="返回"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          ) : (
            left
          )}
        </div>
        <h1 className="pointer-events-none absolute inset-x-[96px] truncate text-center text-[17px] font-semibold">{title}</h1>
        <div className="ml-auto mr-1.5 flex h-8 w-[87px] items-center justify-around rounded-full border border-black/10 bg-white/70" aria-hidden="true">
          <span className="flex gap-[3px]">
            <span className="size-[5px] rounded-full bg-foreground/80" />
            <span className="size-[6px] rounded-full bg-foreground/80" />
            <span className="size-[5px] rounded-full bg-foreground/80" />
          </span>
          <span className="h-4 w-px bg-black/10" />
          <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-foreground/80">
            <span className="size-[6px] rounded-full bg-foreground/80" />
          </span>
        </div>
      </div>
    </header>
  )
}
