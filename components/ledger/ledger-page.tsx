'use client'

import { ChevronDown, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDateTime, formatYuan, type LedgerRecord } from '@/lib/ledger'
import { RecordRow, recorderText } from './record-row'
import { EmptyRecords } from './room-personal'
import { useRoom } from './store'
import { Card } from './ui'

type Filter = 'all' | 'mine' | 'revoked'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'mine', label: '与我有关' },
  { id: 'revoked', label: '已撤销' },
]

export function LedgerPage() {
  const { room, me } = useRoom()
  const records = room.records
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const sorted = [...records].reverse()
  const list = sorted.filter((r) =>
    filter === 'all' ? true : filter === 'mine' ? r.from === me || r.to === me : Boolean(r.revoked),
  )
  const counts: Record<Filter, number> = {
    all: records.length,
    mine: records.filter((r) => r.from === me || r.to === me).length,
    revoked: records.filter((r) => r.revoked).length,
  }
  const activeTotal = records.filter((r) => !r.revoked).reduce((s, r) => s + r.amount, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="tablist" aria-label="流水筛选">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'h-9 rounded-full px-4 text-[14px] font-medium transition-colors',
              filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground active:bg-muted',
            )}
          >
            {f.label}
            <span className={cn('ml-1 tabular-nums', filter === f.id ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        {`有效流水合计 ¥${formatYuan(activeTotal)} · 撤销的记录会保留，但不计入净额`}
      </p>

      {list.length === 0 ? (
        <Card>
          <EmptyRecords
            text={filter === 'revoked' ? '没有已撤销的记录' : filter === 'mine' ? '暂无与我有关的记录' : '还没有任何记录'}
            hint={filter === 'revoked' ? '撤销后的流水会显示在这里' : '回到记账页添加一笔'}
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {list.map((r) => (
            <LedgerItem key={r.id} record={r} open={expanded === r.id} onToggle={() => setExpanded(expanded === r.id ? null : r.id)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function LedgerItem({ record, open, onToggle }: { record: LedgerRecord; open: boolean; onToggle: () => void }) {
  const { revoke, canRevoke, room, nameOf, showToast: showToastFn } = useRoom()
  const revocable = canRevoke(record)
  const blockedReason = record.revoked
    ? null
    : room.status !== 'playing'
      ? '牌局已结束，流水已锁定'
      : room.frozen
        ? '房间已冻结，暂不能撤销'
        : !revocable
          ? '普通成员只能撤销自己记录的流水'
          : null
  const [confirming, setConfirming] = useState(false)
  const detailId = `detail-${record.id}`

  return (
    <li className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(20,48,31,0.06)]">
      <button
        type="button"
        onClick={() => {
          onToggle()
          setConfirming(false)
        }}
        aria-expanded={open}
        aria-controls={detailId}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left active:bg-muted/60"
      >
        <RecordRow record={record} className="flex-1" />
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id={detailId} className="mx-3 mb-3 rounded-xl bg-muted p-3">
          <dl className="grid grid-cols-[72px_1fr] gap-y-1.5 text-[13px]">
            <dt className="text-muted-foreground">方向</dt>
            <dd>{`${nameOf(record.from)} 转给 ${nameOf(record.to)}`}</dd>
            <dt className="text-muted-foreground">金额</dt>
            <dd className="font-semibold tabular-nums">¥{formatYuan(record.amount)}</dd>
            <dt className="text-muted-foreground">记录方式</dt>
            <dd>{record.mode === 'proxy' ? '主记台代记' : '个人记账'}</dd>
            <dt className="text-muted-foreground">记录人</dt>
            <dd>{recorderText(record, nameOf)}</dd>
            <dt className="text-muted-foreground">时间</dt>
            <dd className="tabular-nums">{formatDateTime(record.createdAt)}</dd>
            <dt className="text-muted-foreground">状态</dt>
            <dd>
              {record.revoked
                ? `已撤销（${nameOf(record.revoked.by)} · ${formatDateTime(record.revoked.at)}）`
                : '有效，计入净额'}
            </dd>
            <dt className="text-muted-foreground">编号</dt>
            <dd className="font-mono text-xs leading-5 text-muted-foreground">{record.id.toUpperCase()}</dd>
          </dl>

          {blockedReason && <p className="mt-3 text-center text-xs text-muted-foreground">{blockedReason}</p>}
          {revocable &&
            (confirming ? (
              <div className="mt-3 rounded-lg border border-destructive/25 bg-card p-3" role="alert">
                <p className="text-[13px] leading-relaxed">撤销后这笔不再计入净额，原记录仍会保留并标注「已撤销」。</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setConfirming(false)} className="h-11 rounded-xl border border-border text-[14px] font-medium active:bg-muted">
                    再想想
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      revoke(record.id)
                      setConfirming(false)
                      showToastFn('已撤销，原记录已保留')
                    }}
                    className="h-11 rounded-xl bg-destructive text-[14px] font-semibold text-white active:opacity-85"
                  >
                    确认撤销
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[14px] font-medium text-destructive active:bg-muted"
              >
                <Undo2 className="size-4" aria-hidden="true" />
                撤销这笔记录
              </button>
            ))}
        </div>
      )}
    </li>
  )
}
