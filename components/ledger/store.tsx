'use client'

import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState } from 'react'
import {
  buildSettlement,
  can,
  computeNet,
  computeSettlement,
  createDemoRoom,
  createHistoryRooms,
  type DraftItem,
  type DraftRecord,
  emptyDraftForm,
  isActive,
  type LedgerRecord,
  MAX_MEMBERS,
  type Member,
  MEMBER_TONES,
  memberIn,
  type MemberId,
  type Role,
  type Room,
  type SettleStatus,
  VIEWER_NAME,
} from '@/lib/ledger'

type State = { rooms: Room[]; currentRoomId: string; failNext: boolean }

type Action =
  | { type: 'room'; id: string; update: (room: Room) => Room }
  | { type: 'createRoom'; room: Room }
  | { type: 'open'; id: string }
  | { type: 'setFailNext'; value: boolean }
  | { type: 'resetDemo' }

const initialState = (): State => ({
  rooms: [createDemoRoom(), ...createHistoryRooms()],
  currentRoomId: 'room-demo',
  failNext: false,
})

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'room':
      return { ...state, rooms: state.rooms.map((r) => (r.id === action.id ? action.update(r) : r)) }
    case 'createRoom':
      return { ...state, rooms: [action.room, ...state.rooms], currentRoomId: action.room.id }
    case 'open':
      return { ...state, currentRoomId: action.id }
    case 'setFailNext':
      return { ...state, failNext: action.value }
    case 'resetDemo':
      return { ...state, rooms: state.rooms.map((r) => (r.id === 'room-demo' ? createDemoRoom() : r)) }
  }
}

const isLocked = (room: Room) => room.status !== 'playing' || room.frozen

/** Pure room transitions. Each guards its own preconditions so stale UI cannot force an illegal state. */
const ops = {
  commit: (records: LedgerRecord[], draftKeys: string[]) => (room: Room): Room => {
    if (isLocked(room)) return room
    const existing = new Set(room.records.map((r) => r.id))
    const fresh = records.filter((r) => !existing.has(r.id))
    const keys = new Set(draftKeys)
    return {
      ...room,
      records: fresh.length ? [...room.records, ...fresh] : room.records,
      ledgerVersion: fresh.length ? room.ledgerVersion + 1 : room.ledgerVersion,
      drafts: room.drafts.filter((d) => !keys.has(d.key)),
    }
  },
  revoke: (id: string, by: MemberId, now: number) => (room: Room): Room => {
    if (isLocked(room)) return room
    const target = room.records.find((r) => r.id === id)
    if (!target || target.revoked) return room
    return {
      ...room,
      ledgerVersion: room.ledgerVersion + 1,
      records: room.records.map((r) => (r.id === id ? { ...r, revoked: { by, at: now } } : r)),
    }
  },
  endGame: () => (room: Room): Room => (room.status === 'playing' ? { ...room, status: 'reviewing', frozen: false } : room),
  reopen: () => (room: Room): Room => {
    if (room.status === 'reviewing') return { ...room, status: 'playing' }
    return room
  },
  confirmLedger: (now: number) => (room: Room): Room => {
    if (room.status !== 'reviewing') return room
    const settlement = buildSettlement(room, now)
    return settlement.tasks.length === 0
      ? { ...room, settlement, status: 'settled', settledAt: now }
      : { ...room, settlement, status: 'settling' }
  },
  backToReview: () => (room: Room): Room => {
    if (room.status !== 'settling' || !room.settlement) return room
    if (room.settlement.tasks.some((t) => t.status !== 'pending')) return room
    return { ...room, status: 'reviewing', settlement: null }
  },
  setTask: (key: string, next: SettleStatus, now: number) => (room: Room): Room => {
    if (room.status !== 'settling' || !room.settlement) return room
    const order: SettleStatus[] = ['pending', 'marked', 'confirmed']
    const tasks = room.settlement.tasks.map((t) =>
      t.key === key && order.indexOf(next) === order.indexOf(t.status) + 1 ? { ...t, status: next } : t,
    )
    const settlement = { ...room.settlement, tasks }
    const allDone = tasks.every((t) => t.status === 'confirmed')
    return allDone ? { ...room, settlement, status: 'settled', settledAt: now } : { ...room, settlement }
  },
  toggleFrozen: () => (room: Room): Room => (room.status === 'playing' ? { ...room, frozen: !room.frozen } : room),
  rename: (name: string) => (room: Room): Room => ({ ...room, name }),
  addMember: (member: Member) => (room: Room): Room =>
    room.status === 'playing' && room.members.length < MAX_MEMBERS ? { ...room, members: [...room.members, member] } : room,
  removeMember: (id: MemberId) => (room: Room): Room => {
    const m = room.members.find((x) => x.id === id)
    if (!m || m.role === 'owner' || id === room.viewerId || room.status !== 'playing') return room
    if (room.records.some((r) => r.from === id || r.to === id) || room.drafts.some((d) => d.from === id || d.to === id)) return room
    return { ...room, members: room.members.filter((x) => x.id !== id) }
  },
  setRole: (id: MemberId, role: Exclude<Role, 'owner'>) => (room: Room): Room => ({
    ...room,
    members: room.members.map((m) => (m.id === id && m.role !== 'owner' ? { ...m, role } : m)),
  }),
  setViewer: (id: MemberId) => (room: Room): Room => ({ ...room, viewerId: id }),
  setDrafts: (drafts: DraftItem[]) => (room: Room): Room => ({ ...room, drafts }),
  setDraftForm: (draftForm: Room['draftForm']) => (room: Room): Room => ({ ...room, draftForm }),
  clearRecords: () => (room: Room): Room => ({
    ...room,
    records: [],
    ledgerVersion: room.ledgerVersion + 1,
    status: 'playing',
    frozen: false,
    settlement: null,
    settledAt: undefined,
  }),
}

export type SubmitResult =
  | { ok: true; already?: boolean }
  | { ok: false; reason: 'failed' | 'locked' | 'busy' }
  | { ok: false; reason: 'duplicate'; matches: LedgerRecord[] }

const DUPLICATE_WINDOW = 3 * 60_000
const recordIdFor = (key: string) => `rec-${key}`

let seq = 0
export const newKey = () => `${Date.now().toString(36)}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`

type LedgerContextValue = {
  rooms: Room[]
  currentRoomId: string
  failNext: boolean
  setFailNext: (v: boolean) => void
  openRoom: (id: string) => void
  createRoom: (input: { name: string; memberNames: string[] }) => Room
  findByCode: (code: string) => Room | undefined
  resetDemo: () => void
  update: (id: string, fn: (room: Room) => Room) => void
  submit: (
    roomId: string,
    drafts: DraftItem[],
    mode: 'self' | 'proxy',
    opts?: { allowDuplicate?: boolean },
  ) => Promise<SubmitResult>
  toast: string | null
  showToast: (message: string) => void
}

const LedgerContext = createContext<LedgerContextValue | null>(null)

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const stateRef = useRef(state)
  stateRef.current = state
  const inFlight = useRef(new Set<string>())
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const update = useCallback((id: string, fn: (room: Room) => Room) => dispatch({ type: 'room', id, update: fn }), [])

  const submit = useCallback<LedgerContextValue['submit']>(async (roomId, requested, mode, opts) => {
    const getRoom = () => stateRef.current.rooms.find((r) => r.id === roomId)
    const room = getRoom()
    if (!room || isLocked(room)) return { ok: false, reason: 'locked' }
    if (requested.length === 0) return { ok: false, reason: 'failed' }
    if (requested.some((d) => inFlight.current.has(d.key))) return { ok: false, reason: 'busy' }

    // Drafts whose record already landed (an earlier attempt succeeded) are never written twice.
    const recorded = new Set(room.records.map((r) => r.id))
    const landed = requested.filter((d) => recorded.has(recordIdFor(d.key))).map((d) => d.key)
    const batch = requested.filter((d) => !recorded.has(recordIdFor(d.key)))
    if (batch.length === 0) {
      dispatch({ type: 'room', id: roomId, update: ops.commit([], landed) })
      return { ok: true, already: true }
    }
    const keys = batch.map((d) => d.key)

    if (!opts?.allowDuplicate) {
      const now = Date.now()
      const matches = room.records.filter(
        (r) =>
          isActive(r) &&
          r.id.startsWith('rec-') &&
          now - r.createdAt < DUPLICATE_WINDOW &&
          batch.some((d) => d.from === r.from && d.to === r.to && d.amount === r.amount),
      )
      if (matches.length > 0) return { ok: false, reason: 'duplicate', matches }
    }

    for (const k of keys) inFlight.current.add(k)
    try {
      await new Promise((resolve) => setTimeout(resolve, 900))

      if (stateRef.current.failNext) {
        dispatch({ type: 'setFailNext', value: false })
        return { ok: false, reason: 'failed' }
      }

      // Re-check right before the write: the room may have been frozen or ended while waiting.
      const latest = getRoom()
      if (!latest || isLocked(latest)) return { ok: false, reason: 'locked' }

      const now = Date.now()
      const records: LedgerRecord[] = batch.map((d, i) => ({
        id: recordIdFor(d.key),
        from: d.from,
        to: d.to,
        amount: d.amount,
        createdAt: now + i,
        recorder: latest.viewerId,
        mode,
      }))
      dispatch({ type: 'room', id: roomId, update: ops.commit(records, [...keys, ...landed]) })
      return { ok: true }
    } finally {
      for (const k of keys) inFlight.current.delete(k)
    }
  }, [])

  const createRoom = useCallback<LedgerContextValue['createRoom']>((input) => {
    const taken = new Set(stateRef.current.rooms.map((r) => r.code))
    let code = ''
    do code = String(100000 + Math.floor(Math.random() * 900000))
    while (taken.has(code))
    const members: Member[] = [VIEWER_NAME, ...input.memberNames].slice(0, MAX_MEMBERS).map((name, i) => ({
      id: i === 0 ? 'me' : `m-${newKey()}`,
      name,
      initial: name.slice(-1),
      tone: MEMBER_TONES[(i + 2) % MEMBER_TONES.length],
      role: i === 0 ? 'owner' : 'member',
    }))
    const room: Room = {
      id: `room-${newKey()}`,
      code,
      name: input.name,
      createdAt: Date.now(),
      members,
      viewerId: 'me',
      records: [],
      ledgerVersion: 0,
      status: 'playing',
      frozen: false,
      settlement: null,
      drafts: [],
      draftForm: emptyDraftForm(),
      isDemo: false,
    }
    dispatch({ type: 'createRoom', room })
    return room
  }, [])

  const value: LedgerContextValue = {
    rooms: state.rooms,
    currentRoomId: state.currentRoomId,
    failNext: state.failNext,
    setFailNext: (v) => dispatch({ type: 'setFailNext', value: v }),
    openRoom: (id) => dispatch({ type: 'open', id }),
    createRoom,
    findByCode: (code) => stateRef.current.rooms.find((r) => r.code === code),
    resetDemo: () => dispatch({ type: 'resetDemo' }),
    update,
    submit,
    toast,
    showToast,
  }

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export function useLedger() {
  const ctx = useContext(LedgerContext)
  if (!ctx) throw new Error('useLedger must be used within LedgerProvider')
  return ctx
}

/** Everything a screen needs about one room, with actions pre-bound to its id. */
export function useRoom(roomId?: string) {
  const ledger = useLedger()
  const room = ledger.rooms.find((r) => r.id === (roomId ?? ledger.currentRoomId)) ?? ledger.rooms[0]
  const { update, showToast } = ledger
  const id = room.id

  const net = useMemo(() => computeNet(room), [room])
  const preview = useMemo(() => computeSettlement(room.members, net), [room.members, net])
  const viewer = memberIn(room, room.viewerId)
  const me = room.viewerId
  const role = viewer.role

  const member = (mid: MemberId) => memberIn(room, mid)
  const nameOf = (mid: MemberId) => (mid === me ? '我' : memberIn(room, mid).name)

  return {
    room,
    net,
    /** Live preview while playing/reviewing. During settling use room.settlement instead. */
    preview,
    me,
    role,
    viewer,
    locked: isLocked(room),
    member,
    nameOf,
    canRevoke: (r: LedgerRecord) => !isLocked(room) && !r.revoked && (can.revokeAny(role) || r.recorder === me),
    showToast,
    submit: (drafts: DraftItem[], mode: 'self' | 'proxy', opts?: { allowDuplicate?: boolean }) => ledger.submit(id, drafts, mode, opts),
    revoke: (recordId: string) => update(id, ops.revoke(recordId, me, Date.now())),
    endGame: () => update(id, ops.endGame()),
    reopen: () => update(id, ops.reopen()),
    confirmLedger: () => update(id, ops.confirmLedger(Date.now())),
    backToReview: () => update(id, ops.backToReview()),
    setTask: (key: string, status: SettleStatus) => update(id, ops.setTask(key, status, Date.now())),
    toggleFrozen: () => update(id, ops.toggleFrozen()),
    rename: (name: string) => update(id, ops.rename(name)),
    addMember: (name: string) =>
      update(
        id,
        ops.addMember({
          id: `m-${newKey()}`,
          name,
          initial: name.slice(-1),
          tone: MEMBER_TONES[room.members.length % MEMBER_TONES.length],
          role: 'member',
        }),
      ),
    removeMember: (mid: MemberId) => update(id, ops.removeMember(mid)),
    setRole: (mid: MemberId, r: Exclude<Role, 'owner'>) => update(id, ops.setRole(mid, r)),
    setViewer: (mid: MemberId) => update(id, ops.setViewer(mid)),
    setDrafts: (drafts: DraftItem[]) => update(id, ops.setDrafts(drafts)),
    setDraftForm: (form: Room['draftForm']) => update(id, ops.setDraftForm(form)),
    addDraft: (d: DraftRecord) => {
      const key = newKey()
      update(id, (r) => ({ ...r, drafts: [...r.drafts, { ...d, key }] }))
    },
    removeDraft: (key: string) => update(id, (r) => ({ ...r, drafts: r.drafts.filter((x) => x.key !== key) })),
    clearRecords: () => update(id, ops.clearRecords()),
  }
}

export type RoomApi = ReturnType<typeof useRoom>
