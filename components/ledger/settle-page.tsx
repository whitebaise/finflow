'use client'

import { ArrowRight, Check, CheckCircle2, ClipboardCheck, Clock, Flag, Info, Lock, Send, Undo2 } from 'lucide-react'
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

const STATUS_ORDER: SettleStatus[] = ['pending', 'marked', 'confirmed']

export function StatusPill({ status }: { status: SettleStatus }) {
  const Icon = status === 'pending' ? Clock : status === 'marked' ? Send : CheckCircle2
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
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

function Steps({ status }: { status: SettleStatus }) {
  const idx = STATUS_ORDER.indexOf(status)
  return (
    <ol className="mt-3 grid grid-cols-3 gap-1.5" aria-label="结算进度">
      {STATUS_ORDER.map((s, i) => (
        <li key={s} className="flex flex-col gap-1">
          <span className={cn('h-1 rounded-full', i <= idx ? 'bg-primary' : 'bg-border')} />
          <span className={cn('text-[11px]', i <= idx ? 'font-medium text-foreground' : 'text-muted-foreground')}>{SETTLE_STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  )
}

/** The viewer may only act on their own side of a task; other members are simulated from the demo panel. */
function MyTaskCard({ task, direction }: { task: SettlementTask; direction: 'pay' | 'receive' }) {
  const { member, nameOf, setTask, showToast } = useRoom()
  const other = direction === 'pay' ? task.to : task.from
  const otherName = nameOf(other)
  const action =
    direction === 'pay' && task.status === 'pending'
      ? { label: '我已付款，标记一下', next: 'marked' as const, toast: `已标记付给${otherName} ¥${formatYuan(task.amount)}，等待对方确认` }
      : direction === 'receive' && task.status === 'marked'
        ? { label: '确认已收到', next: 'confirmed' as const, toast: `已确认收到${otherName}的 ¥${formatYuan(task.amount)}` }
        : null
  const waiting =
    task.status === 'confirmed'
      ? null
      : direction === 'pay' && task.status === 'marked'
        ? `等待${otherName}确认到账`
        : direction === 'receive' && task.status === 'pending'
          ? `等待${otherName}付款`
          : null

  return (
    <li className="rounded-2xl bg-background p-4">
      <div className="flex items-center gap-3">
        <Avatar member={member(other)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{direction === 'pay' ? `付给${otherName}` : `${otherName}付给我`}</p>
          <div className="mt-1">
            <StatusPill status={task.status} />
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-[22px] font-bold tabular-nums', direction === 'pay' ? 'text-negative' : 'text-positive')}>¥{formatYuan(task.amount)}</p>
          <p className="text-[11px] text-muted-foreground">{direction === 'pay' ? '我应付' : '我应收'}</p>
        </div>
      </div>
      <Steps status={task.status} />
      {action && (
        <button
          type="button"
          onClick={() => {
            setTask(task.key, action.next)
            showToast(action.toast)
          }}
          className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground active:opacity-85"
        >
          <Check className="size-4" aria-hidden="true" />
          {action.label}
        </button>
      )}
      {waiting && <p className="mt-3 text-center text-xs text-muted-foreground">{waiting}</p>}
    </li>
  )
}

export function PlanList({ tasks, api }: { tasks: (DraftRecord & { key?: string; status?: SettleStatus })[]; api: Pick<RoomApi, 'member' | 'nameOf' | 'me'> }) {
  return (
    <ul className="divide-y divide-border">
      {tasks.map((t, i) => {
        const involvesMe = t.from === api.me || t.to === api.me
        return (
          <li key={t.key ?? `${t.from}>${t.to}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums text-muted-foreground">{i + 1}</span>
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

function ConfirmPair({ cancel, confirm, onCancel, onConfirm }: { cancel: string; confirm: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-border text-[15px] font-medium active:bg-muted">
        {cancel}
      </button>
      <button type="button" onClick={onConfirm} className="h-11 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground active:opacity-85">
        {confirm}
      </button>
    </div>
  )
}

function AllSettled({ text = '无需转账，已结清', hint = '全员净额为零' }: { text?: string; hint?: string }) {
  return (
    <Card>
      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="size-10 text-positive" aria-hidden="true" />
        <p className="mt-2 text-[15px] font-semibold">{text}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </Card>
  )
}

export function SettlePage({ onArchived }: { onArchived: () => void }) {
  const api = useRoom()
  const { room, net, preview, me, role, endGame, reopen, confirmLedger, backToReview, showToast } = api
  const [confirming, setConfirming] = useState<null | 'end' | 'lock'>(null)
  const isOwner = role === 'owner'
  const activeCount = room.records.filter(isActive).length
  const s = room.settlement
  const tasks = s?.tasks ?? []
  const done = tasks.filter((t) => t.status === 'confirmed').length
  const anyProgress = tasks.some((t) => t.status !== 'pending')
  const lockedNet = s?.net ?? net

  return (
    <div className="flex flex-col gap-3">
      {room.status === 'playing' && (
        <Card>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">进行中</span>
            <span className="text-xs text-muted-foreground">以下为实时预览</span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {`根据 ${activeCount} 笔有效流水推导。结束牌局后进入「待核对」，记账关闭；确认账本后才生成正式付款任务。`}
          </p>
          {!isOwner ? (
            <p className="mt-3 rounded-xl bg-muted/60 py-3 text-center text-[13px] text-muted-foreground">由房主结束牌局</p>
          ) : confirming === 'end' ? (
            <ConfirmPair cancel="继续打" confirm="确认结束" onCancel={() => setConfirming(null)} onConfirm={() => (endGame(), setConfirming(null))} />
          ) : (
            <PrimaryButton type="button" className="mt-3" onClick={() => setConfirming('end')} disabled={room.members.length < 2}>
              <Flag className="size-4" aria-hidden="true" />
              结束牌局
            </PrimaryButton>
          )}
        </Card>
      )}

      {room.status === 'reviewing' && (
        <Card>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-[#7A5A12]">待核对</span>
            <span className="text-xs tabular-nums text-muted-foreground">{`账本 v${room.ledgerVersion} · ${activeCount} 笔有效流水`}</span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            记账已关闭。请全桌核对下方净额，确认无误后由房主锁定账本并生成结算方案。
          </p>
          {!isOwner ? (
            <p className="mt-3 rounded-xl bg-muted/60 py-3 text-center text-[13px] text-muted-foreground">等待房主确认账本</p>
          ) : confirming === 'lock' ? (
            <ConfirmPair
              cancel="再核对一下"
              confirm={preview.length === 0 ? '确认结清' : '锁定并生成'}
              onCancel={() => setConfirming(null)}
              onConfirm={() => {
                confirmLedger()
                setConfirming(null)
                if (preview.length === 0) {
                  showToast('无需转账，已结清并归档')
                }
              }}
            />
          ) : (
            <>
              <PrimaryButton type="button" className="mt-3" onClick={() => setConfirming('lock')}>
                <ClipboardCheck className="size-4" aria-hidden="true" />
                {preview.length === 0 ? '全员持平，确认结清' : '确认账本，生成结算方案'}
              </PrimaryButton>
              <button type="button" onClick={reopen} className="mt-2 flex h-10 w-full items-center justify-center gap-1 text-[13px] text-primary active:underline">
                <Undo2 className="size-3.5" aria-hidden="true" />
                结束错了？重新开放记账
              </button>
            </>
          )}
        </Card>
      )}

      {room.status === 'settling' && s && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-semibold text-lime-foreground">结算中</span>
            <span className="text-[13px] tabular-nums text-muted-foreground">{`已到账 ${done}/${tasks.length}`}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={done} aria-label="结算完成进度">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / tasks.length) * 100}%` }} />
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            {`方案基于账本 v${s.ledgerVersion}（${s.activeCount} 笔有效流水），${formatDateTime(s.createdAt)} 锁定`}
          </p>
          {isOwner &&
            (anyProgress ? (
              <p className="mt-2 text-xs text-muted-foreground">已有付款进度，方案不能再撤回重算。</p>
            ) : (
              <button type="button" onClick={backToReview} className="mt-1 h-9 text-[13px] text-primary active:underline">
                还没人付款？撤回方案，退回核对
              </button>
            ))}
        </Card>
      )}

      {room.status === 'settled' && (
        <Card className="bg-secondary">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-9 shrink-0 text-positive" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold text-secondary-foreground">{tasks.length === 0 ? '无需转账，已结清' : '全部到账，已结清'}</p>
              <p className="mt-0.5 text-xs text-secondary-foreground/75">{`${room.settledAt ? formatDateTime(room.settledAt) : ''} 归档 · 已出现在历史记录`}</p>
            </div>
          </div>
          <PrimaryButton type="button" className="mt-3 h-11" onClick={onArchived}>
            查看历史记录
          </PrimaryButton>
        </Card>
      )}

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        付款在微信或线下完成，这里只记录结算状态。标记和确认不会改变牌局净额。
      </p>

      {(room.status === 'settling' || room.status === 'settled') && tasks.length > 0 && (
        <>
          <MyTasks tasks={tasks} me={me} />
          <Card>
            <SectionHeader title="全桌结算方案" action={<span className="text-xs text-muted-foreground">{`最少 ${tasks.length} 笔转账`}</span>} />
            <PlanList tasks={tasks} api={api} />
          </Card>
        </>
      )}

      {(room.status === 'playing' || room.status === 'reviewing') &&
        (preview.length === 0 ? (
          <AllSettled hint={activeCount === 0 ? '还没有有效流水' : '全员净额为零，结束后可直接结清'} text={activeCount === 0 ? '暂无需要结算的款项' : '账面全部持平'} />
        ) : (
          <Card>
            <SectionHeader title={room.status === 'playing' ? '结算预览' : '待确认的结算方案'} action={<span className="text-xs text-muted-foreground">{`最少 ${preview.length} 笔转账`}</span>} />
            <PlanList tasks={preview} api={api} />
          </Card>
        ))}

      {room.status === 'settled' && tasks.length === 0 && <AllSettled />}

      <NetList net={lockedNet} api={api} caption={s ? `锁定于账本 v${s.ledgerVersion}` : '由有效流水推导'} />
    </div>
  )
}

function MyTasks({ tasks, me }: { tasks: SettlementTask[]; me: MemberId }) {
  const toPay = tasks.filter((t) => t.from === me)
  const toReceive = tasks.filter((t) => t.to === me)
  return (
    <Card>
      <SectionHeader title="我需要付给谁" />
      {toPay.length === 0 ? (
        <p className="rounded-xl bg-muted/60 py-3 text-center text-[13px] text-muted-foreground">我无需付款</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {toPay.map((t) => (
            <MyTaskCard key={t.key} task={t} direction="pay" />
          ))}
        </ul>
      )}
      <div className="mt-4">
        <SectionHeader title="谁需要付给我" />
        {toReceive.length === 0 ? (
          <p className="rounded-xl bg-muted/60 py-3 text-center text-[13px] text-muted-foreground">没有人需要付给我</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {toReceive.map((t) => (
              <MyTaskCard key={t.key} task={t} direction="receive" />
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
