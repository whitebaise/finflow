'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // Callers pass inline handlers; keeping the latest in a ref stops every parent render
  // from re-running the effect below, which would yank focus out of inputs mid-typing.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const appRoot = document.getElementById('app-root')
    appRoot?.setAttribute('inert', '')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      appRoot?.removeAttribute('inert')
      prev?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="absolute inset-0 animate-fade bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute bottom-0 flex max-h-[88dvh] w-full max-w-[430px] animate-sheet-up flex-col rounded-t-3xl bg-card outline-none"
      >
        <div className="flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <h2 id={titleId} className="text-[17px] font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
            aria-label="关闭"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="pb-safe border-t border-border px-5 pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
