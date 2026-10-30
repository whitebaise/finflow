'use client'

import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime, formatYuan, type LedgerRecord, ME, memberById } from '@/lib/ledger'
import { Avatar, ProxyTag } from './ui'

export function recorderText(r: LedgerRecord) {
  const recorder = memberById(r.recorder).name
  return r.mode === 'proxy' ? `${recorder}代记` : `${recorder}本人记录`
}

export function RecordRow({ record, className }: { record: LedgerRecord; className?: string }) {
  const from = memberById(record.from)
  const to = memberById(record.to)
  const revoked = Boolean(record.revoked)
  const mine = record.from === ME ? 'out' : record.to === ME ? 'in' : null

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex shrink-0 items-center">
        <Avatar id={record.from} size="sm" className="ring-2 ring-card" />
        <Avatar id={record.to} size="sm" className="-ml-2.5 ring-2 ring-card" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('flex items-center gap-1 text-[15px] font-medium', revoked && 'text-muted-foreground line-through')}>
          <span>{from.name}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" aria-label="转给" />
          <span>{to.name}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span>{formatTime(record.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{recorderText(record)}</span>
          {record.mode === 'proxy' && <ProxyTag />}
          {revoked && (
            <span className="rounded-md bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">已撤销</span>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            'text-[17px] font-semibold tabular-nums',
            revoked && 'text-muted-foreground line-through',
            !revoked && mine === 'out' && 'text-negative',
            !revoked && mine === 'in' && 'text-positive',
          )}
        >
          {mine === 'out' ? '−' : mine === 'in' ? '+' : ''}¥{formatYuan(record.amount)}
        </p>
        {mine && <p className="text-[11px] text-muted-foreground">{mine === 'out' ? '我转出' : '我收到'}</p>}
      </div>
    </div>
  )
}
