'use client'

import { AlertTriangle, ArrowRight, Info, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { formatTime, formatYuan, type LedgerRecord, ME, memberById, type MemberId, parseAmount } from '@/lib/ledger'
import { AmountField } from './amount-field'
import { BottomSheet } from './bottom-sheet'
import { useLedger } from './store'
import { Avatar, PrimaryButton } from './ui'

export function RecordSheet({ toId, onClose }: { toId: MemberId | null; onClose: () => void }) {
  return (
    <BottomSheet open={toId !== null} onClose={onClose} title={toId ? `记给${memberById(toId).name}` : '记账'}>
      {toId && <RecordForm key={toId} toId={toId} onDone={onClose} />}
    </BottomSheet>
  )
}

type Phase = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'failed' } | { kind: 'duplicate'; matches: LedgerRecord[] }

function RecordForm({ toId, onDone }: { toId: MemberId; onDone: () => void }) {
  const { submit, showToast, locked } = useLedger()
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const cents = parseAmount(value)
  const invalid = touched && value !== '' && cents === null
  const to = memberById(toId)

  async function handleSubmit(allowDuplicate = false) {
    setTouched(true)
    if (!cents) return
    setPhase({ kind: 'submitting' })
    const res = await submit([{ from: ME, to: toId, amount: cents }], 'self', { allowDuplicate })
    if (res.ok) {
      showToast(`已记录：我 → ${to.name} ¥${formatYuan(cents)}`)
      onDone()
    } else if (res.reason === 'duplicate') {
      setPhase({ kind: 'duplicate', matches: res.matches })
    } else if (res.reason === 'locked') {
      showToast('房间已冻结，暂不能记账')
      onDone()
    } else {
      setPhase({ kind: 'failed' })
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
      className="flex flex-col gap-4 pt-2"
    >
      <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
        <div className="flex flex-col items-center gap-1">
          <Avatar id={ME} />
          <span className="text-[13px] font-medium">我</span>
        </div>
        <div className="flex flex-1 flex-col items-center px-2 text-muted-foreground">
          <span className="text-xs">付款人固定为我</span>
          <ArrowRight className="my-0.5 size-5" aria-hidden="true" />
          <span className="text-xs">记一笔转出</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Avatar id={toId} />
          <span className="text-[13px] font-medium">{to.name}</span>
        </div>
      </div>

      <AmountField value={value} onChange={(v) => { setValue(v); if (phase.kind !== 'submitting') setPhase({ kind: 'idle' }) }} invalid={invalid} />

      <p className="flex items-start gap-2 rounded-xl bg-secondary px-3 py-2.5 text-[13px] leading-relaxed text-secondary-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>仅记录，不会实际扣款。牌局结束后统一查看应收应付和结算建议。</span>
      </p>

      {phase.kind === 'failed' && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
          <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>提交失败：网络异常（演示）。这笔没有被记录，可以直接重试。</span>
        </div>
      )}

      {phase.kind === 'duplicate' ? (
        <div role="alert" className="rounded-2xl border border-warning/40 bg-warning-soft p-3">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
            疑似重复记录
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground/80">
            {`${formatTime(phase.matches[0].createdAt)} 已有一笔「我 → ${to.name} ¥${formatYuan(phase.matches[0].amount)}」。确认不是重复提交吗？`}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onDone}
              className="h-11 rounded-xl border border-border bg-card text-[15px] font-medium active:bg-muted"
            >
              不记了
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="h-11 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground active:opacity-85"
            >
              仍然记账
            </button>
          </div>
        </div>
      ) : (
        <PrimaryButton type="submit" loading={phase.kind === 'submitting'} disabled={!cents || locked}>
          {phase.kind === 'submitting'
            ? '提交中…'
            : phase.kind === 'failed'
              ? `重试记账 ¥${cents ? formatYuan(cents) : '0'}`
              : cents
                ? `确认记账 ¥${formatYuan(cents)}`
                : '确认记账'}
        </PrimaryButton>
      )}
      <div className="pb-safe" />
    </form>
  )
}
