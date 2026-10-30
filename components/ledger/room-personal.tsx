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
      <section className="rounded-2xl bg-primary px-5 pb-5 pt-4 text-primary-foreground shadow-[0_8px_24px_rgba(20,70,50,0.18)]" aria-labelledby="my-net-label">
        <div className="flex items-center justify-between">
          <p id="my-net-label" className="text-[13px] text-primary-foreground/75">
            我的当前净额
          </p>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">{netLabel(myNet)}</span>
        </div>
        <p className="mt-1 text-[40px] font-bold leading-tight tabular-nums">
          {myNet === 0 ? '¥0' : `${myNet > 0 ? '+' : '−'}¥${formatYuan(myNet)}`}
        </p>
        <p className="mt-1 text-[13px] text-primary-foreground/75">
          {myNet < 0
            ? `账面上我需要付出 ¥${formatYuan(myNet)}`
            : myNet > 0
              ? `账面上我可以收回 ¥${formatYuan(myNet)}`
              : '目前账面持平'}
          {` · ${activeCount} 笔有效流水`}
        </p>
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

      <Card>
        <SectionHeader
          title="最近记录"
          action={
            records.length > 0 && (
              <button type="button" onClick={onViewAll} className="-mr-2 flex h-8 items-center rounded-full px-2 text-[13px] text-primary active:bg-muted">
                查看全部
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            )
          }
        />
        {recent.length === 0 ? (
          <EmptyRecords />
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <RecordRow record={r} />
              </li>
            ))}
          </ul>
        )}
      </Card>

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
