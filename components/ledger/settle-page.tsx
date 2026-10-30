'use client'

import { ArrowRight, Check, CheckCircle2, Clock, Flag, Info, Send } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  formatYuan,
  ME,
  MEMBERS,
  memberById,
  netLabel,
  SETTLE_STATUS_LABEL,
  type SettlementTask,
  type SettleStatus,
} from '@/lib/ledger'
import { useLedger } from './store'
import { Avatar, Card, PrimaryButton, SectionHeader, SignedAmount } from './ui'

const STATUS_ORDER: SettleStatus[] = ['pending', 'marked', 'confirmed']

function StatusPill({ status }: { status: SettleStatus }) {
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
          <span className={cn('text-[11px]', i <= idx ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            {i < idx ? '✓ ' : ''}
            {SETTLE_STATUS_LABEL[s]}
          </span>
        </li>
      ))}
    </ol>
  )
}

function useTaskAction(task: SettlementTask) {
  const { settleStatus, setSettle, phase, showToast } = useLedger()
  const status = settleStatus[task.key] ?? 'pending'
  const from = memberById(task.from).name
  const to = memberById(task.to).name
  if (phase !== 'ended' || status === 'confirmed') return { status, action: null }
  if (status === 'pending') {
    const isMine = task.from === ME
    return {
      status,
      action: {
        label: isMine ? '我已付款，标记一下' : `模拟${from}标记已付`,
        demo: !isMine,
        run: () => {
          setSettle(task.key, 'marked')
          showToast(isMine ? `已标记付给${to} ¥${formatYuan(task.amount)}，等待对方确认` : `${from}已标记付款`)
        },
      },
    }
  }
  const isMine = task.to === ME
  return {
    status,
    action: {
      label: isMine ? '确认已收到' : `模拟${to}确认收款`,
      demo: !isMine,
      run: () => {
        setSettle(task.key, 'confirmed')
        showToast(`${isMine ? '我' : to}已确认收款`)
      },
    },
  }
}

function MyTaskCard({ task, direction }: { task: SettlementTask; direction: 'pay' | 'receive' }) {
  const { status, action } = useTaskAction(task)
  const other = direction === 'pay' ? task.to : task.from
  const otherName = memberById(other).name
  return (
    <li className="rounded-2xl bg-background p-4">
      <div className="flex items-center gap-3">
        <Avatar id={other} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{direction === 'pay' ? `付给${otherName}` : `等待${otherName}付款`}</p>
          <div className="mt-1">
            <StatusPill status={status} />
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-[22px] font-bold tabular-nums', direction === 'pay' ? 'text-negative' : 'text-positive')}>
            ¥{formatYuan(task.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground">{direction === 'pay' ? '我应付' : '我应收'}</p>
        </div>
      </div>
      <Steps status={status} />
      {action && (
        <button
          type="button"
          onClick={action.run}
          className={cn(
            'mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-[15px] font-semibold active:opacity-85',
            action.demo ? 'border border-dashed border-border bg-muted/60 text-muted-foreground' : 'bg-primary text-primary-foreground',
          )}
        >
          {!action.demo && <Check className="size-4" aria-hidden="true" />}
          {action.label}
          {action.demo && <span className="text-[11px] font-normal">（演示）</span>}
        </button>
      )}
    </li>
  )
}

function TableTaskRow({ task, index }: { task: SettlementTask; index: number }) {
  const { status, action } = useTaskAction(task)
  const involvesMe = task.from === ME || task.to === ME
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums text-muted-foreground">
          {index + 1}
        </span>
        <div className="flex shrink-0">
          <Avatar id={task.from} size="sm" className="ring-2 ring-card" />
          <Avatar id={task.to} size="sm" className="-ml-2.5 ring-2 ring-card" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[15px] font-medium">
            {memberById(task.from).name}
            <ArrowRight className="size-3.5 text-muted-foreground" aria-label="付给" />
            {memberById(task.to).name}
            {involvesMe && <span className="ml-1 rounded bg-secondary px-1 text-[11px] text-secondary-foreground">与我有关</span>}
          </p>
          <div className="mt-1">
            <StatusPill status={status} />
          </div>
        </div>
        <span className="text-[17px] font-semibold tabular-nums">¥{formatYuan(task.amount)}</span>
      </div>
      {action && !involvesMe && (
        <button
          type="button"
          onClick={action.run}
          className="ml-9 mt-2 h-9 rounded-lg border border-dashed border-border px-3 text-[13px] text-muted-foreground active:bg-muted"
        >
          {action.label}（演示）
        </button>
      )}
    </li>
  )
}

export function SettlePage() {
  const { tasks, net, phase, settleStatus, endGame, reopen, records } = useLedger()
  const [confirmEnd, setConfirmEnd] = useState(false)
  const toPay = tasks.filter((t) => t.from === ME)
  const toReceive = tasks.filter((t) => t.to === ME)
  const done = tasks.filter((t) => settleStatus[t.key] === 'confirmed').length
  const anyProgress = Object.keys(settleStatus).length > 0
  const activeCount = records.filter((r) => !r.revoked).length

  return (
    <div className="flex flex-col gap-3">
      <Card>
        {phase === 'playing' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-[#7A5A12]">牌局进行中</span>
              <span className="text-xs text-muted-foreground">以下为实时预览</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {`根据 ${activeCount} 笔有效流水推导。结束牌局后才会生成正式付款任务，届时不能再记账。`}
            </p>
            {confirmEnd ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmEnd(false)} className="h-11 rounded-xl border border-border text-[15px] font-medium active:bg-muted">
                  继续打
                </button>
                <button
                  type="button"
                  onClick={() => {
                    endGame()
                    setConfirmEnd(false)
                  }}
                  className="h-11 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground active:opacity-85"
                >
                  确认结束
                </button>
              </div>
            ) : (
              <PrimaryButton type="button" className="mt-3" onClick={() => setConfirmEnd(true)} disabled={tasks.length === 0}>
                <Flag className="size-4" aria-hidden="true" />
                结束牌局，开始结算
              </PrimaryButton>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-semibold text-lime-foreground">牌局已结束 · 结算中</span>
              <span className="text-[13px] tabular-nums text-muted-foreground">{`已完成 ${done}/${tasks.length}`}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={done} aria-label="结算完成进度">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 100}%` }} />
            </div>
            {!anyProgress && (
              <button type="button" onClick={reopen} className="mt-3 h-9 text-[13px] text-primary underline-offset-2 active:underline">
                结束错了？重新开放记账
              </button>
            )}
          </>
        )}
      </Card>

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        付款在微信或线下完成，这里只记录结算状态。标记和确认不会改变牌局净额。
      </p>

      {tasks.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="size-10 text-positive" aria-hidden="true" />
            <p className="mt-2 text-[15px] font-medium">账面全部持平</p>
            <p className="mt-1 text-xs text-muted-foreground">没有需要结算的款项</p>
          </div>
        </Card>
      ) : (
        <>
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
              <SectionHeader title="我等待谁付款" />
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

          <Card>
            <SectionHeader title="全桌结算方案" action={<span className="text-xs text-muted-foreground">{`共 ${tasks.length} 笔转账`}</span>} />
            <ul className="divide-y divide-border">
              {tasks.map((t, i) => (
                <TableTaskRow key={t.key} task={t} index={i} />
              ))}
            </ul>
          </Card>
        </>
      )}

      <Card>
        <SectionHeader title="各人净额" action={<span className="text-xs text-muted-foreground">由有效流水推导</span>} />
        <ul className="divide-y divide-border">
          {MEMBERS.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Avatar id={m.id} size="sm" />
              <span className="flex-1 text-[15px] font-medium">{m.name}</span>
              <span className="text-xs text-muted-foreground">{netLabel(net[m.id])}</span>
              <SignedAmount cents={net[m.id]} className="w-16 text-right text-[16px] font-semibold" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
