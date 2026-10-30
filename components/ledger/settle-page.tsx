'use client'

import { ArrowRight, Check, CheckCircle2, Clock, Flag, Send, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  type DraftRecord,
  formatDateTime,
  formatYuan,
  isActive,
  type MemberId,
  netLabel,
  SETTLE_STATUS_LABEL,
  type SettlementTask,
  type SettleStatus,
} from '@/lib/ledger'
import { type RoomApi, useRoom } from './store'
import { Avatar, Card, PrimaryButton, SectionHeader, SignedAmount } from './ui'

export function StatusPill({ status }: { status: SettleStatus }) {
  const Icon = status === 'pending' ? Clock : status === 'marked' ? Send : CheckCircle2
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
        status === 'pending' && 'bg-warning-soft text-[#7A5A12]',
        status === 'marked' && 'bg-[#E6ECF7] text-[#2F4C80]',
        status === 'confirmed' && 'bg-positive/10 text-positive',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {SETTLE_STATUS_LABEL[status]}
    </span>
  )
}

export function PlanList({ tasks, api }: { tasks: (DraftRecord & { key?: string; status?: SettleStatus })[]; api: Pick<RoomApi, 'member' | 'nameOf' | 'me'> }) {
  return (
    <ul className="divide-y divide-border">
      {tasks.map((t) => {
        const involvesMe = t.from === api.me || t.to === api.me
        return (
          <li key={t.key ?? `${t.from}>${t.to}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex shrink-0">
              <Avatar member={api.member(t.from)} size="sm" className="ring-2 ring-card" />
              <Avatar member={api.member(t.to)} size="sm" className="-ml-2.5 ring-2 ring-card" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1 text-[15px] font-medium">
                {api.nameOf(t.from)}
                <ArrowRight className="size-3.5 text-muted-foreground" aria-label="付给" />
                {api.nameOf(t.to)}
                {involvesMe && <span className="ml-1 rounded bg-secondary px-1 text-[11px] text-secondary-foreground">与我有关</span>}
              </p>
              {t.status && (
                <div className="mt-1">
                  <StatusPill status={t.status} />
                </div>
              )}
            </div>
            <span className="text-[17px] font-semibold tabular-nums">¥{formatYuan(t.amount)}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function NetList({ net, api, caption }: { net: Record<MemberId, number>; api: Pick<RoomApi, 'member' | 'nameOf'> & { room: { members: { id: string }[] } }; caption: string }) {
  return (
    <Card>
      <SectionHeader title="各人净额" action={<span className="text-xs text-muted-foreground">{caption}</span>} />
      <ul className="divide-y divide-border">
        {api.room.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <Avatar member={api.member(m.id)} size="sm" />
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{api.nameOf(m.id)}</span>
            <span className="text-xs text-muted-foreground">{netLabel(net[m.id] ?? 0)}</span>
            <SignedAmount cents={net[m.id] ?? 0} className="w-20 text-right text-[16px] font-semibold" />
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** The viewer may only act on their own side of a task; other members are simulated from the demo panel. */
function MyTaskRow({ task }: { task: SettlementTask }) {
  const { member, nameOf, setTask, showToast, me } = useRoom()
  const paying = task.from === me
  const other = paying ? task.to : task.from
  const otherName = nameOf(other)
  const action =
    paying && task.status === 'pending'
      ? { label: '我已付款', next: 'marked' as const, toast: `已标记付给${otherName} ¥${formatYuan(task.amount)}，等待对方确认` }
      : !paying && task.status === 'marked'
        ? { label: '确认收款', next: 'confirmed' as const, toast: `已确认收到${otherName}的 ¥${formatYuan(task.amount)}` }
        : null
  const waiting = task.status === 'confirmed' ? '已完成' : paying ? '等对方确认' : '等对方付款'

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Avatar member={member(other)} size="sm" className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{paying ? `我付给${otherName}` : `${otherName}付给我`}</p>
        <p className={cn('text-[17px] font-bold tabular-nums', paying ? 'text-negative' : 'text-positive')}>
          {`${paying ? '−' : '+'}¥${formatYuan(task.amount)}`}
        </p>
      </div>
      {action ? (
        <button
          type="button"
          onClick={() => {
            setTask(task.key, action.next)
            showToast(action.toast)
          }}
          className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-primary px-3.5 text-[14px] font-semibold text-primary-foreground active:opacity-85"
        >
          <Check className="size-4" aria-hidden="true" />
          {action.label}
        </button>
      ) : task.status === 'confirmed' ? (
        <StatusPill status="confirmed" />
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">{waiting}</span>
      )}
    </li>
  )
}

export function SettlePage({ onArchived }: { onArchived: () => void }) {
  const api = useRoom()
  const { room, net, preview, me, role, endGame, reopen, confirmLedger, backToReview, showToast } = api
  const [confirming, setConfirming] = useState(false)
  const isOwner = role === 'owner'
  const activeCount = room.records.filter(isActive).length
  const s = room.settlement
  const tasks = s?.tasks ?? []
  const myTasks = tasks.filter((t) => t.from === me || t.to === me)
  const done = tasks.filter((t) => t.status === 'confirmed').length
  const anyProgress = tasks.some((t) => t.status !== 'pending')
  const beforeSettle = room.status === 'playing' || room.status === 'reviewing'

  function settleNow() {
    if (room.status === 'playing') endGame()
    confirmLedger()
    setConfirming(false)
    showToast(preview.length === 0 ? '全员持平，已结清并归档' : `已生成 ${preview.length} 笔转账，记账已关闭`)
  }

  function undoSettle() {
    backToReview()
    reopen()
    showToast('已撤回结算，可以继续记账')
  }

  if (beforeSettle) {
    return (
      <div className="flex flex-col gap-3">
        <Card>
          <SectionHeader
            title="结算方案"
            action={<span className="text-xs text-muted-foreground">{preview.length > 0 ? `最少 ${preview.length} 笔转账` : `${activeCount} 笔流水`}</span>}
          />
          {preview.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle2 className="size-9 text-positive" aria-hidden="true" />
              <p className="mt-2 text-[15px] font-semibold">{activeCount === 0 ? '暂无需要结算的款项' : '账面全部持平'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{activeCount === 0 ? '还没有有效流水' : '结算后直接归档'}</p>
            </div>
          ) : (
            <PlanList tasks={preview} api={api} />
          )}

          {!isOwner ? (
            <p className="mt-4 rounded-lg bg-muted/60 py-3 text-center text-[13px] text-muted-foreground">由房主发起结算</p>
          ) : confirming ? (
            <div className="mt-4 rounded-xl bg-muted/60 p-3">
              <p className="text-center text-[13px] text-muted-foreground">确认后记账关闭，按以上方案收付款</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirming(false)} className="h-11 rounded-lg border border-border bg-card text-[15px] font-medium active:bg-muted">
                  再等等
                </button>
                <button type="button" onClick={settleNow} className="h-11 rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground active:opacity-85">
                  确认结算
                </button>
              </div>
            </div>
          ) : (
            <PrimaryButton type="button" className="mt-4 rounded-xl" onClick={() => setConfirming(true)} disabled={room.members.length < 2}>
              <Flag className="size-4" aria-hidden="true" />
              {room.status === 'reviewing' ? '确认结算' : '结束牌局并结算'}
            </PrimaryButton>
          )}
          {isOwner && room.status === 'reviewing' && (
            <button type="button" onClick={reopen} className="mt-2 flex h-9 w-full items-center justify-center gap-1 text-[13px] text-primary active:underline">
              <Undo2 className="size-3.5" aria-hidden="true" />
              继续记账
            </button>
          )}
        </Card>

        <NetList net={net} api={api} caption="实时" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {room.status === 'settled' ? (
        <Card className="bg-secondary">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-9 shrink-0 text-positive" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold text-secondary-foreground">{tasks.length === 0 ? '无需转账，已结清' : '全部到账，已结清'}</p>
              <p className="mt-0.5 text-xs text-secondary-foreground/75">{`${room.settledAt ? formatDateTime(room.settledAt) : ''} 归档`}</p>
            </div>
          </div>
          <PrimaryButton type="button" className="mt-3 h-11 rounded-xl" onClick={onArchived}>
            查看历史记录
          </PrimaryButton>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold">结算中</p>
            <span className="text-[13px] tabular-nums text-muted-foreground">{`已到账 ${done}/${tasks.length}`}</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={done} aria-label="结算完成进度">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / Math.max(tasks.length, 1)) * 100}%` }} />
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2.5 text-[13px] font-medium text-muted-foreground">我的收付款</p>
            {myTasks.length === 0 ? (
              <p className="rounded-lg bg-muted/60 py-3 text-center text-[13px] text-muted-foreground">我无需收付款</p>
            ) : (
              <ul className="divide-y divide-border">
                {myTasks.map((t) => (
                  <MyTaskRow key={t.key} task={t} />
                ))}
              </ul>
            )}
          </div>

          {isOwner && !anyProgress && (
            <button type="button" onClick={undoSettle} className="mt-3 flex h-9 w-full items-center justify-center gap-1 text-[13px] text-primary active:underline">
              <Undo2 className="size-3.5" aria-hidden="true" />
              还没人付款，撤回并继续记账
            </button>
          )}
        </Card>
      )}

      {tasks.length > 0 && (
        <Card>
          <SectionHeader title="全桌转账" action={<span className="text-xs text-muted-foreground">付款在微信或线下完成</span>} />
          <PlanList tasks={tasks} api={api} />
        </Card>
      )}
    </div>
  )
}
