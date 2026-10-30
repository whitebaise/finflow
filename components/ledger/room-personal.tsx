'use client'

import { ChevronRight, Inbox } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatYuan, ME, MEMBERS, type MemberId, netLabel } from '@/lib/ledger'
import { RecordRow } from './record-row'
import { RecordSheet } from './record-sheet'
import { useLedger } from './store'
import { Avatar, Card, NetTag, SectionHeader } from './ui'

export function RoomPersonal({ onViewAll }: { onViewAll: () => void }) {
  const { net, records, locked, showToast } = useLedger()
  const [target, setTarget] = useState<MemberId | null>(null)
  const myNet = net[ME]
  const activeCount = records.filter((r) => !r.revoked).length
  const recent = [...records].reverse().slice(0, 3)

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-3xl bg-lime p-4 text-lime-foreground" aria-labelledby="my-net-label">
        <div className="flex items-start justify-between px-1 pt-1">
          <div>
            <p id="my-net-label" className="text-[20px] font-bold">
              我的当前净额
            </p>
            <p className="mt-0.5 text-[13px] text-lime-foreground/70">
              {myNet < 0
                ? `账面上我需要付出 ¥${formatYuan(myNet)}`
                : myNet > 0
                  ? `账面上我可以收回 ¥${formatYuan(myNet)}`
                  : '目前账面持平'}
            </p>
          </div>
          <span className="rounded-full bg-lime-soft px-3 py-1 text-[13px] font-semibold">{netLabel(myNet)}</span>
        </div>
        <p className="mt-3 px-1 text-[42px] font-extrabold leading-none tracking-tight tabular-nums">
          {myNet === 0 ? '¥0' : `${myNet > 0 ? '+' : '−'}¥${formatYuan(myNet)}`}
        </p>
        <dl className="mt-4 grid grid-cols-2 rounded-2xl bg-lime-soft px-3 py-3">
          <div className="border-r border-lime-foreground/15 pr-3">
            <dt className="text-[12px] text-lime-foreground/70">有效流水</dt>
            <dd className="mt-0.5 text-[18px] font-bold tabular-nums">{`${activeCount} 笔`}</dd>
          </div>
          <div className="pl-3">
            <dt className="text-[12px] text-lime-foreground/70">房间成员</dt>
            <dd className="mt-0.5 text-[18px] font-bold tabular-nums">{`${MEMBERS.length} 人`}</dd>
          </div>
        </dl>
      </section>

      <Card>
        <SectionHeader
          title="点头像记一笔"
          action={<span className="text-xs text-muted-foreground">付款人默认是我</span>}
        />
        <ul className="grid grid-cols-4 gap-1">
          {MEMBERS.map((m) => {
            const isMe = m.id === ME
            const content = (
              <>
                <Avatar id={m.id} size="lg" className={cn(!isMe && 'ring-offset-2 transition-shadow group-active:ring-2 group-active:ring-primary')} />
                <span className="mt-1.5 text-[14px] font-medium text-foreground">{isMe ? '我' : m.name}</span>
                <NetTag cents={net[m.id]} className="mt-1 px-1.5 text-[11px]" />
              </>
            )
            return (
              <li key={m.id}>
                {isMe ? (
                  <div className="flex flex-col items-center rounded-xl py-2 opacity-90">{content}</div>
                ) : (
                  <button
                    type="button"
                    onClick={() => (locked ? showToast('房间已冻结，暂不能记账') : setTarget(m.id))}
                    aria-label={`记给${m.name}，当前${netLabel(net[m.id])} ¥${formatYuan(net[m.id])}`}
                    className="group flex w-full flex-col items-center rounded-xl py-2 active:bg-muted"
                  >
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <section aria-labelledby="recent-title" className="pt-1">
        <div className="mb-2.5 flex min-h-8 items-center justify-between px-1">
          <h2 id="recent-title" className="text-[16px] font-bold">
            最近记录
          </h2>
          {records.length > 0 && (
            <button type="button" onClick={onViewAll} className="-mr-2 flex h-8 items-center rounded-full px-2 text-[13px] font-semibold active:bg-muted">
              查看全部
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <Card>
            <EmptyRecords />
          </Card>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {recent.map((r) => (
              <li key={r.id} className="rounded-2xl bg-card px-3.5 py-3 shadow-[0_1px_3px_rgba(20,48,31,0.06)]">
                <RecordRow record={r} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <RecordSheet toId={target} onClose={() => setTarget(null)} />
    </div>
  )
}

export function EmptyRecords({
  text = '还没有任何记录',
  hint = '点上方成员头像，记下第一笔',
}: {
  text?: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      </span>
      <p className="mt-3 text-[14px] font-medium">{text}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
