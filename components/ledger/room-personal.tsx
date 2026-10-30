'use client'

import { ChevronRight, Inbox } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatYuan, isActive, type MemberId, netLabel } from '@/lib/ledger'
import { RecordRow } from './record-row'
import { RecordSheet } from './record-sheet'
import { useRoom } from './store'
import { Avatar, Card, NetTag, SectionHeader } from './ui'

export function RoomPersonal({ onViewAll }: { onViewAll: () => void }) {
  const { room, net, me, locked, showToast, nameOf, preview } = useRoom()
  const [target, setTarget] = useState<MemberId | null>(null)
  const toReceive = preview.filter((t) => t.to === me).reduce((s, t) => s + t.amount, 0)
  const toPay = preview.filter((t) => t.from === me).reduce((s, t) => s + t.amount, 0)
  const myNet = net[me] ?? 0
  const activeCount = room.records.filter(isActive).length
  const recent = [...room.records].reverse().slice(0, 3)
  const cols = room.members.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl bg-lime p-5 text-lime-foreground" aria-labelledby="my-net-label">
        <p id="my-net-label" className="flex items-center gap-2 text-[14px] font-semibold">
          我的当前净额
          <span className="rounded-md bg-lime-soft px-2 py-0.5 text-[12px]">{netLabel(myNet)}</span>
        </p>
        <p className="mt-2 text-[46px] font-extrabold leading-none tracking-tight tabular-nums">
          {myNet === 0 ? '¥0' : `${myNet > 0 ? '+' : '−'}¥${formatYuan(myNet)}`}
        </p>
        <dl className="mt-4 grid grid-cols-4 divide-x divide-lime-foreground/15 rounded-xl bg-lime-soft py-2.5 text-center">
          <div>
            <dt className="text-[11px] text-lime-foreground/70">预计应收</dt>
            <dd className="mt-0.5 text-[15px] font-bold tabular-nums">{`¥${formatYuan(toReceive)}`}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-lime-foreground/70">预计应付</dt>
            <dd className="mt-0.5 text-[15px] font-bold tabular-nums">{`¥${formatYuan(toPay)}`}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-lime-foreground/70">有效流水</dt>
            <dd className="mt-0.5 text-[15px] font-bold tabular-nums">{activeCount}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-lime-foreground/70">成员</dt>
            <dd className="mt-0.5 text-[15px] font-bold tabular-nums">{room.members.length}</dd>
          </div>
        </dl>
      </section>

      <Card className="pb-3">
        <SectionHeader title="点头像记一笔" action={<span className="text-xs text-muted-foreground">付款人默认是我</span>} />
        <ul className={cn('grid gap-1', cols)}>
          {room.members.map((m) => {
            const isMe = m.id === me
            const content = (
              <>
                <Avatar member={m} size="lg" className={cn('size-12 text-base', !isMe && 'ring-offset-2 transition-shadow group-active:ring-2 group-active:ring-primary')} />
                <span className="mt-1 max-w-full truncate px-0.5 text-[13px] font-medium text-foreground">{nameOf(m.id)}</span>
                <NetTag cents={net[m.id] ?? 0} className="mt-0.5 px-1.5 text-[10px]" />
              </>
            )
            return (
              <li key={m.id} className="min-w-0">
                {isMe ? (
                  <div className="flex flex-col items-center rounded-xl py-1.5 opacity-90">{content}</div>
                ) : (
                  <button
                    type="button"
                    onClick={() => (locked ? showToast(room.frozen ? '房间已冻结，暂不能记账' : '牌局已结束，记账已关闭') : setTarget(m.id))}
                    aria-label={`记给${m.name}，当前${netLabel(net[m.id] ?? 0)} ¥${formatYuan(net[m.id] ?? 0)}`}
                    className="group flex w-full flex-col items-center rounded-xl py-1.5 active:bg-muted"
                  >
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {room.members.length < 2 && <p className="mt-2 text-center text-xs text-muted-foreground">至少需要 2 名成员才能记账，先邀请成员加入</p>}
      </Card>

      <section aria-labelledby="recent-title" className="pt-1">
        <div className="mb-2.5 flex min-h-8 items-center justify-between px-1">
          <h2 id="recent-title" className="text-[16px] font-bold">
            最近记录
          </h2>
          {room.records.length > 0 && (
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
              <li key={r.id} className="rounded-xl bg-card px-3.5 py-3 shadow-[0_1px_3px_rgba(20,48,31,0.06)]">
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
