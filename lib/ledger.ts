export type MemberId = 'lin' | 'li' | 'me' | 'chen'

export type Member = {
  id: MemberId
  name: string
  initial: string
  tone: string
}

export const ME: MemberId = 'me'

/** Fixed display order. Never re-sorted by net amount. */
export const MEMBERS: Member[] = [
  { id: 'lin', name: '小林', initial: '林', tone: 'bg-[#C8E43B] text-[#14301F]' },
  { id: 'li', name: '小李', initial: '李', tone: 'bg-[#7C4DEB] text-white' },
  { id: 'me', name: '我', initial: '我', tone: 'bg-[#183A27] text-white' },
  { id: 'chen', name: '小陈', initial: '陈', tone: 'bg-[#F4A42C] text-[#2E1C00]' },
]

export const memberById = (id: MemberId) => MEMBERS.find((m) => m.id === id)!

export type LedgerRecord = {
  id: string
  from: MemberId
  to: MemberId
  /** Amount in cents (分) to avoid floating point errors. */
  amount: number
  createdAt: number
  recorder: MemberId
  mode: 'self' | 'proxy'
  revoked?: { by: MemberId; at: number }
}

export type DraftRecord = { from: MemberId; to: MemberId; amount: number }

const base = new Date('2026-10-30T20:00:00+08:00').getTime()
const min = 60_000

export const SEED_RECORDS: LedgerRecord[] = [
  { id: 'r1', from: 'lin', to: 'li', amount: 800, createdAt: base + 6 * min, recorder: 'lin', mode: 'self' },
  { id: 'r2', from: 'me', to: 'lin', amount: 1800, createdAt: base + 14 * min, recorder: 'me', mode: 'self' },
  { id: 'r3', from: 'chen', to: 'lin', amount: 2600, createdAt: base + 23 * min, recorder: 'li', mode: 'proxy' },
  { id: 'r4', from: 'chen', to: 'li', amount: 400, createdAt: base + 31 * min, recorder: 'chen', mode: 'self' },
]

export const isActive = (r: LedgerRecord) => !r.revoked

export function computeNet(records: LedgerRecord[]): Record<MemberId, number> {
  const net: Record<MemberId, number> = { lin: 0, li: 0, me: 0, chen: 0 }
  for (const r of records) {
    if (!isActive(r)) continue
    net[r.from] -= r.amount
    net[r.to] += r.amount
  }
  return net
}

export type SettlementTask = { key: string; from: MemberId; to: MemberId; amount: number }

/** Greedy matching in fixed member order so the plan stays stable and predictable. */
export function computeSettlement(net: Record<MemberId, number>): SettlementTask[] {
  const debtors = MEMBERS.filter((m) => net[m.id] < 0).map((m) => ({ id: m.id, left: -net[m.id] }))
  const creditors = MEMBERS.filter((m) => net[m.id] > 0).map((m) => ({ id: m.id, left: net[m.id] }))
  const tasks: SettlementTask[] = []
  let c = 0
  for (const d of debtors) {
    while (d.left > 0 && c < creditors.length) {
      const pay = Math.min(d.left, creditors[c].left)
      tasks.push({ key: `${d.id}>${creditors[c].id}:${pay}`, from: d.id, to: creditors[c].id, amount: pay })
      d.left -= pay
      creditors[c].left -= pay
      if (creditors[c].left === 0) c++
    }
  }
  return tasks
}

export type SettleStatus = 'pending' | 'marked' | 'confirmed'

export const SETTLE_STATUS_LABEL: Record<SettleStatus, string> = {
  pending: '待付款',
  marked: '付款人已标记',
  confirmed: '收款人已确认',
}

export function formatYuan(cents: number) {
  const abs = Math.abs(cents)
  const yuan = abs / 100
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2)
}

export function formatSigned(cents: number) {
  if (cents === 0) return '¥0'
  return `${cents > 0 ? '+' : '−'}¥${formatYuan(cents)}`
}

export function netLabel(cents: number) {
  if (cents > 0) return '应收'
  if (cents < 0) return '应付'
  return '持平'
}

const timeFmt = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateTimeFmt = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export const formatTime = (ts: number) => timeFmt.format(ts)
export const formatDateTime = (ts: number) => dateTimeFmt.format(ts)

/** Parses user input like "18" or "18.5" into cents. Returns null when invalid. */
export function parseAmount(input: string): number | null {
  if (!/^\d{1,5}(\.\d{0,2})?$/.test(input)) return null
  const cents = Math.round(Number.parseFloat(input) * 100)
  return cents > 0 ? cents : null
}

export const QUICK_AMOUNTS = [5, 10, 20, 50, 100]
