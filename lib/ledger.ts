import { computeNet as computeNetFor, computeSettlement as computeSettlementFor, MAX_MEMBERS } from './settlement'

export { MAX_MEMBERS }

export type MemberId = string

/** owner: 房主 · scorer: 主记 · member: 普通成员 */
export type Role = 'owner' | 'scorer' | 'member'

export const ROLE_LABEL: Record<Role, string> = { owner: '房主', scorer: '主记', member: '成员' }

export type Member = {
  id: MemberId
  name: string
  initial: string
  tone: string
  role: Role
}

export const MEMBER_TONES = [
  'bg-[#C8E43B] text-[#14301F]',
  'bg-[#7C4DEB] text-white',
  'bg-[#183A27] text-white',
  'bg-[#F4A42C] text-[#2E1C00]',
  'bg-[#2F7DE1] text-white',
  'bg-[#E2557A] text-white',
  'bg-[#ECE9D9] text-[#14301F]',
  'bg-[#0E8F7E] text-white',
]

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
export type DraftItem = DraftRecord & { key: string }

export type SettleStatus = 'pending' | 'marked' | 'confirmed'

export type SettlementTask = DraftRecord & { key: string; status: SettleStatus }

/** A settlement plan is frozen against one ledger version and never silently recomputed. */
export type Settlement = {
  ledgerVersion: number
  activeCount: number
  createdAt: number
  net: Record<MemberId, number>
  tasks: SettlementTask[]
}

/** playing: 进行中 · reviewing: 待核对 · settling: 结算中 · settled: 已结清 */
export type RoomStatus = 'playing' | 'reviewing' | 'settling' | 'settled'

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  playing: '进行中',
  reviewing: '待核对',
  settling: '结算中',
  settled: '已结清',
}

export type Room = {
  id: string
  code: string
  name: string
  createdAt: number
  members: Member[]
  /** Which member this device is acting as (switchable in the demo panel). */
  viewerId: MemberId
  records: LedgerRecord[]
  /** Increments on every ledger change; settlement plans pin to it. */
  ledgerVersion: number
  status: RoomStatus
  frozen: boolean
  settlement: Settlement | null
  settledAt?: number
  drafts: DraftItem[]
  draftForm: { from: MemberId | null; to: MemberId | null; value: string }
  isDemo: boolean
}

export const isActive = (r: LedgerRecord) => !r.revoked

export function computeNet(room: Pick<Room, 'members' | 'records'>): Record<MemberId, number> {
  return computeNetFor(
    room.members.map((m) => m.id),
    room.records,
  )
}

export function computeSettlement(members: Member[], net: Record<MemberId, number>): DraftRecord[] {
  return computeSettlementFor(
    members.map((m) => m.id),
    net,
  )
}

export function buildSettlement(room: Room, now: number): Settlement {
  const net = computeNet(room)
  return {
    ledgerVersion: room.ledgerVersion,
    activeCount: room.records.filter(isActive).length,
    createdAt: now,
    net,
    tasks: computeSettlement(room.members, net).map((t, i) => ({
      ...t,
      key: `v${room.ledgerVersion}-${i + 1}`,
      status: 'pending',
    })),
  }
}

export const can = {
  proxy: (role: Role) => role === 'owner' || role === 'scorer',
  revokeAny: (role: Role) => role === 'owner' || role === 'scorer',
  invite: (role: Role) => role === 'owner' || role === 'scorer',
  manageMembers: (role: Role) => role === 'owner',
  manageRoom: (role: Role) => role === 'owner',
}

export const SETTLE_STATUS_LABEL: Record<SettleStatus, string> = {
  pending: '待付款',
  marked: '付款人已标记',
  confirmed: '收款人已确认',
}

export const emptyDraftForm = (): Room['draftForm'] => ({ from: null, to: null, value: '' })

const base = new Date('2026-10-30T20:00:00+08:00').getTime()
const min = 60_000
const day = 24 * 60 * min

const mk = (id: string, name: string, tone: number, role: Role): Member => ({
  id,
  name,
  initial: name.slice(-1),
  tone: MEMBER_TONES[tone],
  role,
})

export const VIEWER_NAME = '阿杰'

export const DEMO_RECORDS: LedgerRecord[] = [
  { id: 'r1', from: 'lin', to: 'li', amount: 800, createdAt: base + 6 * min, recorder: 'lin', mode: 'self' },
  { id: 'r2', from: 'me', to: 'lin', amount: 1800, createdAt: base + 14 * min, recorder: 'me', mode: 'self' },
  { id: 'r3', from: 'chen', to: 'lin', amount: 2600, createdAt: base + 23 * min, recorder: 'lin', mode: 'proxy' },
  { id: 'r4', from: 'chen', to: 'li', amount: 400, createdAt: base + 31 * min, recorder: 'chen', mode: 'self' },
]

export function createDemoRoom(): Room {
  return {
    id: 'room-demo',
    code: '382915',
    name: '周五小聚',
    createdAt: base,
    members: [mk('lin', '小林', 0, 'scorer'), mk('li', '小李', 1, 'member'), mk('me', VIEWER_NAME, 2, 'owner'), mk('chen', '小陈', 3, 'member')],
    viewerId: 'me',
    records: DEMO_RECORDS,
    ledgerVersion: DEMO_RECORDS.length,
    status: 'playing',
    frozen: false,
    settlement: null,
    drafts: [],
    draftForm: emptyDraftForm(),
    isDemo: true,
  }
}

function settledRoom(partial: Omit<Room, 'ledgerVersion' | 'status' | 'frozen' | 'settlement' | 'drafts' | 'draftForm' | 'isDemo'>): Room {
  const room: Room = {
    ...partial,
    ledgerVersion: partial.records.length,
    status: 'settled',
    frozen: false,
    settlement: null,
    drafts: [],
    draftForm: emptyDraftForm(),
    isDemo: true,
  }
  const settlement = buildSettlement(room, partial.settledAt! - 30 * min)
  settlement.tasks = settlement.tasks.map((t) => ({ ...t, status: 'confirmed' }))
  return { ...room, settlement }
}

export function createHistoryRooms(): Room[] {
  const h1 = base - 27 * day
  const h2 = base - 43 * day
  return [
    settledRoom({
      id: 'room-h1',
      code: '615204',
      name: '国庆家里局',
      createdAt: h1,
      settledAt: h1 + 190 * min,
      members: [mk('me', VIEWER_NAME, 2, 'owner'), mk('ma', '老妈', 5, 'member'), mk('ge', '表哥', 4, 'scorer'), mk('sao', '表嫂', 3, 'member'), mk('jiu', '舅舅', 7, 'member')],
      viewerId: 'me',
      records: [
        { id: 'h1-1', from: 'ge', to: 'me', amount: 3000, createdAt: h1 + 20 * min, recorder: 'ge', mode: 'self' },
        { id: 'h1-2', from: 'sao', to: 'ma', amount: 1200, createdAt: h1 + 41 * min, recorder: 'ge', mode: 'proxy' },
        { id: 'h1-3', from: 'jiu', to: 'me', amount: 1600, createdAt: h1 + 66 * min, recorder: 'jiu', mode: 'self' },
        { id: 'h1-4', from: 'ma', to: 'ge', amount: 800, createdAt: h1 + 92 * min, recorder: 'ma', mode: 'self' },
        { id: 'h1-5', from: 'me', to: 'sao', amount: 500, createdAt: h1 + 120 * min, recorder: 'me', mode: 'self', revoked: { by: 'me', at: h1 + 122 * min } },
      ],
    }),
    settledRoom({
      id: 'room-h2',
      code: '209731',
      name: '中秋夜',
      createdAt: h2,
      settledAt: h2 + 150 * min,
      members: [mk('me', VIEWER_NAME, 2, 'owner'), mk('lin', '小林', 0, 'member'), mk('wang', '老王', 4, 'member')],
      viewerId: 'me',
      records: [
        { id: 'h2-1', from: 'lin', to: 'wang', amount: 1000, createdAt: h2 + 30 * min, recorder: 'lin', mode: 'self' },
        { id: 'h2-2', from: 'wang', to: 'lin', amount: 1000, createdAt: h2 + 95 * min, recorder: 'me', mode: 'proxy' },
      ],
    }),
  ]
}

export function memberIn(room: Pick<Room, 'members'>, id: MemberId): Member {
  return room.members.find((m) => m.id === id) ?? { id, name: '已移除成员', initial: '?', tone: 'bg-muted text-muted-foreground', role: 'member' }
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

const dateFmt = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' })

export const formatTime = (ts: number) => timeFmt.format(ts)
export const formatDateTime = (ts: number) => dateTimeFmt.format(ts)
export const formatDate = (ts: number) => dateFmt.format(ts)

/** Parses user input like "18" or "18.5" into cents. Returns null when invalid. */
export function parseAmount(input: string): number | null {
  if (!/^\d{1,5}(\.\d{0,2})?$/.test(input)) return null
  const cents = Math.round(Number.parseFloat(input) * 100)
  return cents > 0 ? cents : null
}

export const QUICK_AMOUNTS = [5, 10, 20, 50, 100]
