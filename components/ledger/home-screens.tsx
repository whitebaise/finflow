'use client'

import { ChevronRight, Info, LogIn, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { computeNet, formatDate, formatSigned, isActive, MAX_MEMBERS, netLabel, type Room, VIEWER_NAME } from '@/lib/ledger'
import { BottomSheet } from './bottom-sheet'
import { RecordRow } from './record-row'
import { NetList, PlanList } from './settle-page'
import { useLedger, useRoom } from './store'
import { Avatar, Card, PrimaryButton, RoomStatusTag, SecondaryButton, SectionHeader } from './ui'

const inputClass =
  'h-12 w-full min-w-0 rounded-2xl border border-border bg-background px-4 text-[16px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20'
const isComposing = (e: React.KeyboardEvent) => e.nativeEvent.isComposing || e.keyCode === 229

function RoomCard({ room, onOpen }: { room: Room; onOpen: () => void }) {
  const net = computeNet(room)
  const myNet = net[room.viewerId] ?? 0
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-xl p-2 text-left active:bg-muted/60">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[17px] font-semibold">{room.name}</p>
          <RoomStatusTag room={room} />
        </div>
        <div className="mt-2 flex items-center">
          {room.members.slice(0, 6).map((m, i) => (
            <Avatar key={m.id} member={m} size="sm" className={cn('ring-2 ring-card', i > 0 && '-ml-2')} />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">{`${room.members.length} 人 · ${room.records.filter(isActive).length} 笔`}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[11px] text-muted-foreground">{`我${netLabel(myNet)}`}</p>
        <p className={cn('text-[20px] font-bold tabular-nums', myNet > 0 && 'text-positive', myNet < 0 && 'text-negative')}>{formatSigned(myNet)}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  )
}

export function HomeScreen({ onEnterRoom, onOpenHistory }: { onEnterRoom: (id: string) => void; onOpenHistory: (id: string) => void }) {
  const { rooms } = useLedger()
  const [sheet, setSheet] = useState<null | 'create' | 'join'>(null)
  const active = rooms.filter((r) => r.status !== 'settled')

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-2">
      <div className="px-1 pb-1">
        <p className="text-[26px] font-extrabold tracking-tight">晚上好</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">熟人牌局，记清每一笔</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSheet('create')}
          className="flex h-[104px] flex-col items-start justify-between rounded-3xl bg-lime p-4 text-left text-lime-foreground active:opacity-90"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-lime-foreground text-lime">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-bold">创建房间</span>
        </button>
        <button
          type="button"
          onClick={() => setSheet('join')}
          className="flex h-[104px] flex-col items-start justify-between rounded-3xl bg-primary p-4 text-left text-primary-foreground active:opacity-90"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
            <LogIn className="size-5" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-semibold">输入房间号加入</span>
        </button>
      </div>

      <Card className="px-2 pb-2">
        <div className="px-2">
          <SectionHeader title={`进行中的房间（${active.length}）`} />
        </div>
        {active.length === 0 ? (
          <p className="px-2 py-4 text-center text-[13px] text-muted-foreground">没有进行中的房间，创建一个开始记账</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {active.map((r) => (
              <li key={r.id}>
                <RoomCard room={r} onOpen={() => onEnterRoom(r.id)} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        这是本地交互原型，所有数据为模拟数据并只保存在当前页面，不连接微信登录、数据库或支付，也不支持多人实时同步。
      </p>

      <CreateRoomSheet
        open={sheet === 'create'}
        onClose={() => setSheet(null)}
        onCreated={(id) => {
          setSheet(null)
          onEnterRoom(id)
        }}
      />
      {sheet === 'join' && (
        <JoinRoomSheet
          onClose={() => setSheet(null)}
          onJoined={(room) => {
            setSheet(null)
            if (room.status === 'settled') onOpenHistory(room.id)
            else onEnterRoom(room.id)
          }}
        />
      )}
    </main>
  )
}

function CreateRoomSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { createRoom, showToast } = useLedger()
  const [name, setName] = useState('')
  const [draft, setDraft] = useState('')
  const [names, setNames] = useState<string[]>([])
  const trimmed = draft.trim()
  const canAdd = Boolean(trimmed) && names.length + 1 < MAX_MEMBERS && !names.includes(trimmed) && trimmed !== VIEWER_NAME
  const canCreate = names.length >= 1

  function addName() {
    if (!canAdd) return
    setNames((n) => [...n, trimmed])
    setDraft('')
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="创建房间">
      <form
        className="flex flex-col gap-4 pt-1"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canCreate) return
          const room = createRoom({ name: name.trim() || '新的牌局', memberNames: names })
          showToast(`已创建「${room.name}」，房间号 ${room.code}`)
          setName('')
          setNames([])
          onCreated(room.id)
        }}
      >
        <div>
          <label htmlFor="new-room-name" className="text-[13px] text-muted-foreground">
            房间名称
          </label>
          <input id="new-room-name" value={name} maxLength={12} placeholder="新的牌局" onChange={(e) => setName(e.target.value)} className={cn(inputClass, 'mt-1.5')} />
        </div>

        <div>
          <p className="text-[13px] text-muted-foreground">{`成员（${names.length + 1}/${MAX_MEMBERS}，至少 2 人）`}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            <li className="flex h-9 items-center rounded-full bg-primary px-3 text-[13px] font-medium text-primary-foreground">{`${VIEWER_NAME}（我 · 房主）`}</li>
            {names.map((n) => (
              <li key={n} className="flex h-9 items-center gap-1 rounded-full bg-secondary pl-3 pr-1 text-[13px] font-medium text-secondary-foreground">
                {n}
                <button
                  type="button"
                  onClick={() => setNames((all) => all.filter((x) => x !== n))}
                  className="flex size-7 items-center justify-center rounded-full active:bg-black/5"
                  aria-label={`移除 ${n}`}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <label htmlFor="new-member" className="sr-only">
              成员昵称
            </label>
            <input
              id="new-member"
              value={draft}
              maxLength={8}
              placeholder="输入成员昵称"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isComposing(e)) {
                  e.preventDefault()
                  addName()
                }
              }}
              className={inputClass}
            />
            <SecondaryButton type="button" onClick={addName} disabled={!canAdd} className="shrink-0">
              <Plus className="size-4" aria-hidden="true" />
              添加
            </SecondaryButton>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">也可以创建后通过「邀请」继续添加。新房间没有任何流水。</p>
        </div>

        <PrimaryButton type="submit" disabled={!canCreate}>
          创建并进入
        </PrimaryButton>
      </form>
      <div className="pb-safe" />
    </BottomSheet>
  )
}

function JoinRoomSheet({ onClose, onJoined }: { onClose: () => void; onJoined: (room: Room) => void }) {
  const { findByCode, rooms, showToast } = useLedger()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const samples = rooms.filter((r) => r.status !== 'settled').slice(0, 3)

  return (
    <BottomSheet open onClose={onClose} title="加入房间">
      <form
        className="flex flex-col gap-4 pt-1"
        onSubmit={(e) => {
          e.preventDefault()
          const room = findByCode(code)
          if (!room) {
            setError('本机没有这个房间号。演示版只能加入本机已存在的房间。')
            return
          }
          showToast(room.status === 'settled' ? `「${room.name}」已结清，打开历史详情` : `已进入「${room.name}」`)
          onJoined(room)
        }}
      >
        <div>
          <label htmlFor="join-code" className="text-[13px] text-muted-foreground">
            6 位房间号
          </label>
          <input
            id="join-code"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            maxLength={6}
            placeholder="例如 382915"
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''))
              setError(null)
            }}
            aria-invalid={Boolean(error)}
            aria-describedby="join-hint"
            className={cn(inputClass, 'mt-1.5 text-center text-[22px] font-bold tracking-[0.3em] tabular-nums', error && 'border-destructive')}
          />
          {error && (
            <p role="alert" className="mt-1.5 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <div id="join-hint" className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-[#5C4410]">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>
            演示限制：没有服务端，只能模拟加入本机已存在的房间。
            {samples.length > 0 && ` 可试：${samples.map((r) => `${r.code}（${r.name}）`).join('、')}`}
          </span>
        </div>
        <PrimaryButton type="submit" disabled={code.length !== 6}>
          加入
        </PrimaryButton>
      </form>
      <div className="pb-safe" />
    </BottomSheet>
  )
}

export function HistoryScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { rooms } = useLedger()
  const settled = rooms.filter((r) => r.status === 'settled').sort((a, b) => (b.settledAt ?? 0) - (a.settledAt ?? 0))

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-2">
      <p className="px-1 text-[13px] text-muted-foreground">所有付款确认到账后，房间会归档到这里</p>
      {settled.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-[13px] text-muted-foreground">还没有已结清的房间</p>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {settled.map((r) => {
              const myNet = r.settlement?.net[r.viewerId] ?? 0
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => onOpen(r.id)} className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{r.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {`${formatDate(r.settledAt ?? r.createdAt)} · ${r.members.length} 人 · ${r.records.filter(isActive).length} 笔`}
                        {r.settlement?.tasks.length === 0 && ' · 无需转账'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">{myNet === 0 ? '持平' : myNet > 0 ? '我收回' : '我付出'}</p>
                      <p className={cn('text-[16px] font-semibold tabular-nums', myNet > 0 && 'text-positive', myNet < 0 && 'text-negative')}>{formatSigned(myNet)}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </main>
  )
}

export function HistoryDetail({ roomId }: { roomId: string }) {
  const api = useRoom(roomId)
  const { room } = api
  const s = room.settlement
  const tasks = s?.tasks ?? []
  const records = [...room.records].reverse()

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pb-10 pt-1">
      <Card className="bg-secondary">
        <div className="flex items-center gap-2">
          <RoomStatusTag room={room} />
          <span className="text-xs tabular-nums text-secondary-foreground/75">{`房间号 ${room.code}`}</span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-secondary-foreground">
          {`${formatDate(room.createdAt)} 开局 · ${room.members.length} 人 · ${room.records.filter(isActive).length} 笔有效流水`}
          {s && ` · 账本 v${s.ledgerVersion}`}
        </p>
        <p className="mt-1 text-[15px] font-semibold text-secondary-foreground">
          {tasks.length === 0 ? '无需转账，已结清' : `${tasks.length} 笔转账全部确认到账`}
        </p>
      </Card>

      <NetList net={s?.net ?? api.net} api={api} caption="最终净额" />

      {tasks.length > 0 && (
        <Card>
          <SectionHeader title="结算记录" />
          <PlanList tasks={tasks} api={api} />
        </Card>
      )}

      <Card>
        <SectionHeader title={`流水明细（${room.records.length}）`} action={<span className="text-xs text-muted-foreground">只读</span>} />
        {records.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">本局没有流水</p>
        ) : (
          <ul className="divide-y divide-border">
            {records.map((r) => (
              <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                <RecordRow record={r} api={api} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  )
}
