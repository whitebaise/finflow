'use client'

import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime, formatYuan, type LedgerRecord, type MemberId } from '@/lib/ledger'
import { type RoomApi, useRoom } from './store'
import { Avatar, ProxyTag } from './ui'

export function recorderText(r: LedgerRecord, nameOf: (id: MemberId) => string) {
  const recorder = nameOf(r.recorder)
  return r.mode === 'proxy' ? `${recorder}代记` : `${recorder}本人记录`
}

export function RecordRow({
  record,
  className,
  api,
  compact,
}: {
  record: LedgerRecord
  className?: string
  /** Pass when rendering a room other than the current one (e.g. history detail). */
  api?: Pick<RoomApi, 'member' | 'nameOf' | 'me'>
  compact?: boolean
}) {
  const current = useRoom()
  const { member, nameOf, me } = api ?? current
  const revoked = Boolean(record.revoked)
  const mine = record.from === me ? 'out' : record.to === me ? 'in' : null

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex shrink-0 items-center">
        <Avatar member={member(record.from)} size="sm" className={cn('ring-2 ring-card', compact ? 'size-7 text-xs' : 'size-9')} />
        <Avatar member={member(record.to)} size="sm" className={cn('-ml-3 ring-2 ring-card', compact ? 'size-7 text-xs' : 'size-9')} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('flex items-center gap-1 font-medium', compact ? 'text-[14px]' : 'text-[15px]', revoked && 'text-muted-foreground line-through')}>
          <span className="truncate">{nameOf(record.from)}</span>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-label="转给" />
          <span className="truncate">{nameOf(record.to)}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span>{formatTime(record.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{recorderText(record, nameOf)}</span>
          {record.mode === 'proxy' && !compact && <ProxyTag />}
          {revoked && <span className="rounded-md bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">已撤销</span>}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            'font-semibold tabular-nums',
            compact ? 'text-[15px]' : 'text-[17px]',
            revoked && 'text-muted-foreground line-through',
            !revoked && mine === 'out' && 'text-negative',
            !revoked && mine === 'in' && 'text-positive',
          )}
        >
          {mine === 'out' ? '−' : mine === 'in' ? '+' : ''}¥{formatYuan(record.amount)}
        </p>
        {mine && !compact && <p className="text-[11px] text-muted-foreground">{mine === 'out' ? '我转出' : '我收到'}</p>}
      </div>
    </div>
  )
}
