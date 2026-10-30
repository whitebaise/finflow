'use client'

import { AlertTriangle, ArrowRight, PenLine, Plus, Trash2, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { type DraftItem, formatYuan, isActive, type LedgerRecord, type MemberId, parseAmount } from '@/lib/ledger'
import { AmountField } from './amount-field'
import { RecordRow } from './record-row'
import { useRoom } from './store'
import { Avatar, Card, PrimaryButton, SecondaryButton, SectionHeader, SignedAmount } from './ui'

type Phase = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'failed' } | { kind: 'duplicate'; matches: LedgerRecord[]; batch: DraftItem[] }

function MemberPicker({
  label,
  value,
  onChange,
  disabledId,
}: {
  label: string
  value: MemberId | null
  onChange: (id: MemberId) => void
  disabledId?: MemberId | null
}) {
  const { room, nameOf } = useRoom()
  return (
    <fieldset>
      <legend className="text-[13px] text-muted-foreground">{label}</legend>
      <div className={cn('mt-1.5 grid gap-1.5', room.members.length <= 4 ? 'grid-cols-4' : 'grid-cols-5')} role="radiogroup" aria-label={label}>
        {room.members.map((m) => {
          const selected = value === m.id
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabledId === m.id}
              onClick={() => onChange(m.id)}
              className={cn(
                'flex min-w-0 items-center justify-center gap-1.5 rounded-lg border-2 px-1 py-1.5 transition-colors disabled:opacity-35',
                selected ? 'border-primary bg-secondary' : 'border-transparent bg-muted active:bg-secondary',
              )}
            >
              <Avatar member={m} size="sm" className="size-6 text-[11px]" />
              <span className={cn('max-w-full truncate px-0.5 text-[13px]', selected && 'font-bold')}>{nameOf(m.id)}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function TableNet() {
  const { room, net, member, nameOf } = useRoom()
  const recent = room.records.filter(isActive).slice(-3).reverse()
  return (
    <Card className="py-3">
      <SectionHeader title="全桌净额" action={<span className="text-xs text-muted-foreground">{`${room.records.filter(isActive).length} 笔有效流水`}</span>} />
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {room.members.map((m) => (
          <li key={m.id} className="flex min-w-0 items-center gap-2">
            <Avatar member={member(m.id)} size="sm" className="size-6 text-[11px]" />
            <span className="min-w-0 flex-1 truncate text-[13px]">{nameOf(m.id)}</span>
            <SignedAmount cents={net[m.id] ?? 0} className="text-[13px] font-semibold" />
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-border pt-2.5">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">最近入账</p>
        {recent.length === 0 ? (
          <p className="py-1 text-[13px] text-muted-foreground">还没有已入账的流水</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((r) => (
              <li key={r.id}>
                <RecordRow record={r} compact />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

export function RoomMaster() {
  const { room, submit, showToast, locked, nameOf, setDraftForm, addDraft, removeDraft, viewer } = useRoom()
  const { from, to, value } = room.draftForm
  const drafts = room.drafts
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const cents = parseAmount(value)
  const canAdd = Boolean(from && to && from !== to && cents && !locked)
  const total = drafts.reduce((s, d) => s + d.amount, 0)
  const submitting = phase.kind === 'submitting'

  function add() {
    if (!from || !to || !cents) return
    addDraft({ from, to, amount: cents })
    setDraftForm({ from, to: null, value: '' })
    if (phase.kind !== 'submitting') setPhase({ kind: 'idle' })
  }

  async function submitBatch(batch: DraftItem[], allowDuplicate = false) {
    if (batch.length === 0 || submitting) return
    setPhase({ kind: 'submitting' })
    const res = await submit(batch, 'proxy', { allowDuplicate })
    const sum = batch.reduce((s, d) => s + d.amount, 0)
    if (res.ok) {
      showToast(res.already ? '这批已入账，未重复记录' : `已代记 ${batch.length} 笔，合计 ¥${formatYuan(sum)}`)
      setPhase({ kind: 'idle' })
    } else if (res.reason === 'busy') {
      return
    } else if (res.reason === 'duplicate') {
      setPhase({ kind: 'duplicate', matches: res.matches, batch })
    } else if (res.reason === 'locked') {
      setPhase({ kind: 'idle' })
      showToast('房间已冻结或牌局已结束，待提交内容已保留')
    } else {
      setPhase({ kind: 'failed' })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="pt-3">
        <SectionHeader
          title="新增一笔"
          action={
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              <PenLine className="size-3" aria-hidden="true" />
              {`代记 · 记录人 ${viewer.name}`}
            </span>
          }
        />
        <div className="flex flex-col gap-3">
          <MemberPicker
            label="付款人（谁转出）"
            value={from}
            onChange={(id) => setDraftForm({ from: id, to: to === id ? null : to, value })}
          />
          <MemberPicker label="收款人（转给谁）" value={to} onChange={(id) => setDraftForm({ from, to: id, value })} disabledId={from} />
          <AmountField compact value={value} onChange={(v) => setDraftForm({ from, to, value: v })} invalid={value !== '' && cents === null} />
          <SecondaryButton type="button" onClick={add} disabled={!canAdd} className="w-full rounded-xl" aria-live="polite">
            <Plus className="size-4" aria-hidden="true" />
            {from && to && cents ? (
              <span className="flex items-center gap-1">
                {`加入：${nameOf(from)}`}
                <ArrowRight className="size-3.5" aria-label="转给" />
                {`${nameOf(to)} ¥${formatYuan(cents)}`}
              </span>
            ) : (
              '选择付款人、收款人和金额'
            )}
          </SecondaryButton>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title={`待提交（${drafts.length}）`}
          action={drafts.length > 0 && <span className="text-[13px] tabular-nums text-muted-foreground">合计 ¥{formatYuan(total)}</span>}
        />
        {drafts.length === 0 ? (
          <p className="py-2 text-center text-[13px] text-muted-foreground">可连续添加多笔再统一提交，草稿切换页面不丢失</p>
        ) : (
          <ul className="divide-y divide-border">
            {drafts.map((d) => (
              <li key={d.key} className="flex items-center gap-3 py-2.5">
                <p className="flex min-w-0 flex-1 items-center gap-1 text-[15px] font-medium">
                  <span className="truncate">{nameOf(d.from)}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-label="转给" />
                  <span className="truncate">{nameOf(d.to)}</span>
                </p>
                <span className="text-[16px] font-semibold tabular-nums">¥{formatYuan(d.amount)}</span>
                <button
                  type="button"
                  onClick={() => removeDraft(d.key)}
                  disabled={submitting}
                  className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground active:bg-muted disabled:opacity-40"
                  aria-label={`删除 ${nameOf(d.from)} 转给 ${nameOf(d.to)} ¥${formatYuan(d.amount)}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {phase.kind === 'failed' && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>提交失败：网络异常（演示）。待提交列表已保留，重试不会重复入账。</span>
          </div>
        )}

        {phase.kind === 'duplicate' ? (
          <div role="alert" className="mt-3 rounded-2xl border border-warning/40 bg-warning-soft p-3">
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
              {`有 ${phase.matches.length} 笔疑似重复`}
            </p>
            <ul className="mt-1 text-[13px] text-foreground/80">
              {phase.matches.map((m) => (
                <li key={m.id}>{`刚刚已记：${nameOf(m.from)} → ${nameOf(m.to)} ¥${formatYuan(m.amount)}`}</li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPhase({ kind: 'idle' })} className="h-11 rounded-xl border border-border bg-card text-[15px] font-medium active:bg-muted">
                返回检查
              </button>
              <button
                type="button"
                onClick={() => submitBatch(phase.batch, true)}
                className="h-11 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground active:opacity-85"
              >
                仍然提交
              </button>
            </div>
          </div>
        ) : (
          drafts.length > 0 && (
            <PrimaryButton type="button" className="mt-3" onClick={() => submitBatch([...drafts])} loading={submitting} disabled={locked}>
              {submitting ? '提交中…' : phase.kind === 'failed' ? `重试提交 ${drafts.length} 笔` : `统一提交 ${drafts.length} 笔 · ¥${formatYuan(total)}`}
            </PrimaryButton>
          )
        )}
      </Card>

      <TableNet />
    </div>
  )
}
