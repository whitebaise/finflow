'use client'

import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState } from 'react'
import {
  computeNet,
  computeSettlement,
  type DraftRecord,
  type LedgerRecord,
  ME,
  type MemberId,
  SEED_RECORDS,
  type SettlementTask,
  type SettleStatus,
} from '@/lib/ledger'

type State = {
  records: LedgerRecord[]
  settleStatus: Record<string, SettleStatus>
  phase: 'playing' | 'ended'
  frozen: boolean
  failNext: boolean
}

type Action =
  | { type: 'add'; records: LedgerRecord[] }
  | { type: 'revoke'; id: string; by: MemberId }
  | { type: 'settle'; key: string; status: SettleStatus }
  | { type: 'end' }
  | { type: 'reopen' }
  | { type: 'toggleFrozen' }
  | { type: 'setFailNext'; value: boolean }
  | { type: 'clear' }
  | { type: 'reset' }

const initialState: State = {
  records: SEED_RECORDS,
  settleStatus: {},
  phase: 'playing',
  frozen: false,
  failNext: false,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return { ...state, records: [...state.records, ...action.records] }
    case 'revoke':
      return {
        ...state,
        records: state.records.map((r) =>
          r.id === action.id && !r.revoked ? { ...r, revoked: { by: action.by, at: Date.now() } } : r,
        ),
      }
    case 'settle':
      return { ...state, settleStatus: { ...state.settleStatus, [action.key]: action.status } }
    case 'end':
      return { ...state, phase: 'ended', settleStatus: {} }
    case 'reopen':
      return { ...state, phase: 'playing', settleStatus: {} }
    case 'toggleFrozen':
      return { ...state, frozen: !state.frozen }
    case 'setFailNext':
      return { ...state, failNext: action.value }
    case 'clear':
      return { ...state, records: [], settleStatus: {}, phase: 'playing' }
    case 'reset':
      return initialState
  }
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'failed' | 'locked' }
  | { ok: false; reason: 'duplicate'; matches: LedgerRecord[] }

const DUPLICATE_WINDOW = 3 * 60_000
const SEED_IDS = new Set(SEED_RECORDS.map((r) => r.id))

type LedgerContextValue = State & {
  net: Record<MemberId, number>
  tasks: SettlementTask[]
  /** Recording is blocked when the room is frozen or the game has ended. */
  locked: boolean
  submit: (drafts: DraftRecord[], mode: 'self' | 'proxy', opts?: { allowDuplicate?: boolean }) => Promise<SubmitResult>
  revoke: (id: string) => void
  setSettle: (key: string, status: SettleStatus) => void
  endGame: () => void
  reopen: () => void
  toggleFrozen: () => void
  setFailNext: (value: boolean) => void
  clear: () => void
  reset: () => void
  toast: string | null
  showToast: (message: string) => void
}

const LedgerContext = createContext<LedgerContextValue | null>(null)

let idSeq = 100

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const net = useMemo(() => computeNet(state.records), [state.records])
  const tasks = useMemo(() => computeSettlement(net), [net])
  const locked = state.frozen || state.phase === 'ended'

  const submit = useCallback<LedgerContextValue['submit']>(async (drafts, mode, opts) => {
    const current = stateRef.current
    if (current.frozen || current.phase === 'ended') return { ok: false, reason: 'locked' }

    if (!opts?.allowDuplicate) {
      const now = Date.now()
      const matches = current.records.filter(
        (r) =>
          !r.revoked &&
          !SEED_IDS.has(r.id) &&
          now - r.createdAt < DUPLICATE_WINDOW &&
          drafts.some((d) => d.from === r.from && d.to === r.to && d.amount === r.amount),
      )
      if (matches.length > 0) return { ok: false, reason: 'duplicate', matches }
    }

    await new Promise((resolve) => setTimeout(resolve, 900))

    if (stateRef.current.failNext) {
      dispatch({ type: 'setFailNext', value: false })
      return { ok: false, reason: 'failed' }
    }

    const now = Date.now()
    dispatch({
      type: 'add',
      records: drafts.map((d, i) => ({
        id: `r${++idSeq}`,
        ...d,
        createdAt: now + i,
        recorder: ME,
        mode,
      })),
    })
    return { ok: true }
  }, [])

  const value: LedgerContextValue = {
    ...state,
    net,
    tasks,
    locked,
    submit,
    revoke: (id) => dispatch({ type: 'revoke', id, by: ME }),
    setSettle: (key, status) => dispatch({ type: 'settle', key, status }),
    endGame: () => dispatch({ type: 'end' }),
    reopen: () => dispatch({ type: 'reopen' }),
    toggleFrozen: () => dispatch({ type: 'toggleFrozen' }),
    setFailNext: (v) => dispatch({ type: 'setFailNext', value: v }),
    clear: () => dispatch({ type: 'clear' }),
    reset: () => dispatch({ type: 'reset' }),
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
