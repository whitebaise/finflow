'use client'

import { cn } from '@/lib/utils'
import { formatSigned, formatYuan, type Member, netLabel, ROLE_LABEL, ROOM_STATUS_LABEL, type Room } from '@/lib/ledger'

export function Avatar({
  member: m,
  size = 'md',
  className,
}: {
  member: Member
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        m.tone,
        size === 'sm' && 'size-8 text-sm',
        size === 'md' && 'size-11 text-base',
        size === 'lg' && 'size-14 text-lg',
        className,
      )}
    >
      {m.initial}
    </span>
  )
}

/** Net amount always pairs a sign and a text label, so it never relies on colour alone. */
export function NetTag({ cents, className }: { cents: number; className?: string }) {
  const tone = cents > 0 ? 'positive' : cents < 0 ? 'negative' : 'neutral'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
        tone === 'positive' && 'bg-positive/10 text-positive',
        tone === 'negative' && 'bg-negative/10 text-negative',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
        className,
      )}
    >
      <span>{netLabel(cents)}</span>
      <span>{cents === 0 ? '¥0' : `¥${formatYuan(cents)}`}</span>
    </span>
  )
}

export function SignedAmount({ cents, className }: { cents: number; className?: string }) {
  return (
    <span
      className={cn(
        'tabular-nums',
        cents > 0 && 'text-positive',
        cents < 0 && 'text-negative',
        cents === 0 && 'text-foreground',
        className,
      )}
    >
      {formatSigned(cents)}
    </span>
  )
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('rounded-3xl bg-card p-4 shadow-[0_1px_3px_rgba(20,48,31,0.06)]', className)}>
      {children}
    </section>
  )
}

export function SectionHeader({
  title,
  action,
  id,
}: {
  title: string
  action?: React.ReactNode
  id?: string
}) {
  return (
    <div className="mb-3 flex min-h-6 items-center justify-between">
      <h2 id={id} className="text-[15px] font-semibold text-foreground">
        {title}
      </h2>
      {action}
    </div>
  )
}

export function RoleTag({ member, className }: { member: Member; className?: string }) {
  if (member.role === 'member') return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-px text-[11px] font-semibold',
        member.role === 'owner' ? 'bg-primary text-primary-foreground' : 'bg-lime text-lime-foreground',
        className,
      )}
    >
      {ROLE_LABEL[member.role]}
    </span>
  )
}

export function RoomStatusTag({ room, className }: { room: Pick<Room, 'status' | 'frozen'>; className?: string }) {
  const label = room.status === 'playing' && room.frozen ? '已冻结' : ROOM_STATUS_LABEL[room.status]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        room.status === 'playing' && !room.frozen && 'bg-secondary text-secondary-foreground',
        (room.frozen || room.status === 'reviewing') && 'bg-warning-soft text-[#7A5A12]',
        room.status === 'settling' && 'bg-[#E6ECF7] text-[#2F4C80]',
        room.status === 'settled' && 'bg-positive/10 text-positive',
        className,
      )}
    >
      {label}
    </span>
  )
}

export function ProxyTag() {
  return (
    <span className="inline-flex items-center rounded-full bg-lime px-1.5 py-px text-[11px] font-semibold text-lime-foreground">
      代记
    </span>
  )
}

export function PrimaryButton({
  className,
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[16px] font-semibold text-primary-foreground transition-opacity active:opacity-85 disabled:opacity-40',
        className,
      )}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function SecondaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-lime px-4 text-[15px] font-medium text-secondary-foreground transition-opacity active:opacity-80 disabled:opacity-45',
        className,
      )}
    />
  )
}
