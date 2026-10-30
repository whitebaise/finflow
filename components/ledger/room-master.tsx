'use client'

import { AlertTriangle, ArrowRight, PenLine, Plus, Trash2, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  type DraftRecord,
  formatYuan,
  type LedgerRecord,
  MEMBERS,
  memberById,
  type MemberId,
  parseAmount,
} from '@/lib/ledger'
import { AmountField } from './amount-field'
import { useLedger } from './store'
import { Avatar, Card, PrimaryButton, SecondaryButton, SectionHeader } from './ui'

type Phase = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'failed' } | { kind: 'duplicate'; matches: LedgerRecord[] }

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
  return (
    <fieldset>
      <legend className="text-[13px] text-muted-foreground">{label}</legend>
      <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-label={label}>
        {MEMBERS.map((m) => {
          const selected = value === m.id
          const disabled = disabledId === m.id
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(m.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border py-2 transition-colors disabled:opacity-35',
                selected ? 'border-primary bg-secondary' : 'border-border bg-card active:bg-muted',
              )}
            >
              <Avatar id={m.id} size="sm" />
              <span className={cn('text-[13px]', selected ? 'font-semibold text-secondary-foreground' : 'text-foreground')}>{m.name}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function RoomMaster() {
  const { submit, showToast, locked } = useLedger()
  const [from, setFrom] = useState<MemberId | null>(null)
  const [to, setTo] = useState<MemberId | null>(null)
  const [value, setValue] = useState('')
  const [drafts, setDrafts] = useState<(DraftRecord & { key: number })[]>([])
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const cents = parseAmount(value)
  const canAdd = from && to && from !== to && cents && !locked
  const total = drafts.reduce((s, d) => s + d.amount, 0)

  function addDraft() {
    if (!from || !to || !cents) return
    setDrafts((d) => [...d, { from, to, amount: cents, key: Date.now() }])
    setValue('')
    setTo(null)
    setPhase({ kind: 'idle' })
  }

  async function submitAll(allowDuplicate = false) {
    if (drafts.length === 0) return
    setPhase({ kind: 'submitting' })
    const res = await submit(
      drafts.map(({ from, to, amount }) => ({ from, to, amount })),
      'proxy',
      { allowDuplicate },
    )
    if (res.ok) {
      showToast(`已代记 ${drafts.length} 笔，合计 ¥${formatYuan(total)}`)
      setDrafts([])
      setPhase({ kind: 'idle' })
    } else if (res.reason === 'duplicate') {
      setPhase({ kind: 'duplicate', matches: res.matches })
    } else if (res.reason === 'locked') {
      setPhase({ kind: 'idle' })
      showToast('房间已冻结，暂不能记账')
    } else {
      setPhase({ kind: 'failed' })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-secondary px-4 py-3" role="status">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <PenLine className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-secondary-foreground">正在代记 · 记录人：我</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-secondary-foreground/80">
            替其他人记账，与个人记账共用同一份账本，每笔都会标注「我代记」。
          </p>
        </div>
      </div>

      <Card>
        <SectionHeader title="新增一笔" />
        <div className="flex flex-col gap-4">
          <MemberPicker
            label="付款人（谁转出）"
            value={from}
            onChange={(id) => {
              setFrom(id)
              if (to === id) setTo(null)
            }}
          />
          <MemberPicker label="收款人（转给谁）" value={to} onChange={setTo} disabledId={from} />
          <AmountField value={value} onChange={setValue} invalid={value !== '' && cents === null} />
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[14px]" aria-live="polite">
            {from && to && cents ? (
              <>
                <span className="font-medium">{memberById(from).name}</span>
                <ArrowRight className="size-4 text-muted-foreground" aria-label="转给" />
                <span className="font-medium">{memberById(to).name}</span>
                <span className="ml-auto font-semibold tabular-nums">¥{formatYuan(cents)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">选择付款人、收款人并输入金额</span>
            )}
          </div>
          <SecondaryButton type="button" onClick={addDraft} disabled={!canAdd} className="w-full">
            <Plus className="size-4" aria-hidden="true" />
            加入待提交
          </SecondaryButton>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title={`待提交（${drafts.length}）`}
          action={drafts.length > 0 && <span className="text-[13px] tabular-nums text-muted-foreground">合计 ¥{formatYuan(total)}</span>}
        />
        {drafts.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">可以连续添加多笔，再统一提交</p>
        ) : (
          <ul className="divide-y divide-border">
            {drafts.map((d) => (
              <li key={d.key} className="flex items-center gap-3 py-2.5">
                <div className="flex shrink-0">
                  <Avatar id={d.from} size="sm" className="ring-2 ring-card" />
                  <Avatar id={d.to} size="sm" className="-ml-2.5 ring-2 ring-card" />
                </div>
                <p className="flex min-w-0 flex-1 items-center gap-1 text-[15px] font-medium">
                  {memberById(d.from).name}
                  <ArrowRight className="size-3.5 text-muted-foreground" aria-label="转给" />
                  {memberById(d.to).name}
                </p>
                <span className="text-[16px] font-semibold tabular-nums">¥{formatYuan(d.amount)}</span>
                <button
                  type="button"
                  onClick={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}
                  disabled={phase.kind === 'submitting'}
                  className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                  aria-label={`删除 ${memberById(d.from).name} 转给 ${memberById(d.to).name} ¥${formatYuan(d.amount)}`}
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
            <span>提交失败：网络异常（演示）。待提交列表已保留，可直接重试。</span>
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
                <li key={m.id}>{`刚刚已记：${memberById(m.from).name} → ${memberById(m.to).name} ¥${formatYuan(m.amount)}`}</li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPhase({ kind: 'idle' })} className="h-11 rounded-xl border border-border bg-card text-[15px] font-medium active:bg-muted">
                返回检查
              </button>
              <button type="button" onClick={() => submitAll(true)} className="h-11 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground active:opacity-85">
                仍然提交
              </button>
            </div>
          </div>
        ) : (
          drafts.length > 0 && (
            <PrimaryButton type="button" className="mt-3" onClick={() => submitAll()} loading={phase.kind === 'submitting'} disabled={locked}>
              {phase.kind === 'submitting'
                ? '提交中…'
                : phase.kind === 'failed'
                  ? `重试提交 ${drafts.length} 笔`
                  : `统一提交 ${drafts.length} 笔 · ¥${formatYuan(total)}`}
            </PrimaryButton>
          )
        )}
      </Card>
    </div>
  )
}
