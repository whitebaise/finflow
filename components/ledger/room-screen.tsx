'use client'

import { ClipboardCheck, Flag, FlaskConical, ListOrdered, Lock, PencilLine, Settings, UserPlus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { can, ROLE_LABEL } from '@/lib/ledger'
import { DemoSheet } from './demo-sheet'
import { LedgerPage } from './ledger-page'
import { RoomMaster } from './room-master'
import { RoomPersonal } from './room-personal'
import { InviteSheet, SettingsSheet } from './room-sheets'
import { SettlePage } from './settle-page'
import { useRoom } from './store'
import { TabBar } from './tab-bar'
import { RoomStatusTag } from './ui'
import { WxNavBar } from './wx-nav-bar'

export type RoomTab = 'record' | 'ledger' | 'settle'
export type RecordMode = 'personal' | 'master'

const chip =
  'flex h-9 shrink-0 items-center gap-1 rounded-full bg-card px-3 text-[13px] font-medium text-foreground shadow-[0_1px_3px_rgba(20,48,31,0.1)] active:bg-muted'

export function RoomScreen({
  tab,
  onTab,
  mode,
  onMode,
  onBack,
  onArchived,
}: {
  tab: RoomTab
  onTab: (t: RoomTab) => void
  mode: RecordMode
  onMode: (m: RecordMode) => void
  onBack: () => void
  onArchived: () => void
}) {
  const { room, role, viewer } = useRoom()
  const [sheet, setSheet] = useState<null | 'demo' | 'invite' | 'settings'>(null)
  const canProxy = can.proxy(role)
  const effectiveMode: RecordMode = canProxy ? mode : 'personal'
  const close = () => setSheet(null)

  return (
    <>
      <WxNavBar title={room.name} onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground">{room.code.replace(/(\d{3})(\d{3})/, '$1 $2')}</span>
              <span>{`· ${room.members.length} 人`}</span>
              <RoomStatusTag room={room} />
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{`我是 ${viewer.name} · ${ROLE_LABEL[role]}`}</p>
          </div>
          {room.status === 'playing' && can.invite(role) && (
            <button type="button" onClick={() => setSheet('invite')} className={chip} aria-label="邀请成员">
              <UserPlus className="size-3.5" aria-hidden="true" />
              <span className="max-[380px]:sr-only">邀请</span>
            </button>
          )}
          <button type="button" onClick={() => setSheet('settings')} className={cn(chip, 'w-9 justify-center px-0')} aria-label="房间设置">
            <Settings className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setSheet('demo')} className={cn(chip, 'w-9 justify-center px-0')} aria-label="演示面板">
            <FlaskConical className="size-4" aria-hidden="true" />
          </button>
        </div>

        {room.status === 'playing' && room.frozen && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2.5 text-[13px]">
            <Lock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>房间已冻结：暂停记账与撤销，明细和结算仍可查看。</span>
          </div>
        )}
        {room.status !== 'playing' && tab !== 'settle' && (
          <button
            type="button"
            onClick={() => onTab('settle')}
            className="flex items-center gap-2 rounded-2xl bg-secondary px-3.5 py-3 text-left text-[13px] text-secondary-foreground"
          >
            {room.status === 'reviewing' ? <ClipboardCheck className="size-4 shrink-0" aria-hidden="true" /> : <Flag className="size-4 shrink-0" aria-hidden="true" />}
            <span className="flex-1">
              {room.status === 'reviewing' ? '牌局已结束，等待核对账本。' : room.status === 'settling' ? '结算进行中，记账已关闭。' : '本房间已结清并归档。'}
            </span>
            <span className="font-medium underline underline-offset-2">{room.status === 'settled' ? '查看' : '去结算'}</span>
          </button>
        )}

        {tab === 'record' && (
          <>
            {canProxy && (
              <div className="grid grid-cols-2 rounded-full bg-secondary p-1" role="tablist" aria-label="记账方式">
                {(
                  [
                    { id: 'personal', label: '个人记账' },
                    { id: 'master', label: '主记台' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={effectiveMode === m.id}
                    onClick={() => onMode(m.id)}
                    className={cn(
                      'h-10 rounded-full text-[15px] font-semibold transition-all',
                      effectiveMode === m.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            {effectiveMode === 'personal' ? <RoomPersonal onViewAll={() => onTab('ledger')} /> : <RoomMaster />}
          </>
        )}
        {tab === 'ledger' && <LedgerPage />}
        {tab === 'settle' && <SettlePage onArchived={onArchived} />}
      </main>

      <TabBar
        label="房间导航"
        value={tab}
        onChange={onTab}
        featured="record"
        items={[
          { id: 'ledger', label: '明细', icon: ListOrdered },
          { id: 'record', label: '记账', icon: PencilLine },
          { id: 'settle', label: '结算', icon: Wallet },
        ]}
      />
      <DemoSheet open={sheet === 'demo'} onClose={close} />
      <InviteSheet open={sheet === 'invite'} onClose={close} />
      {sheet === 'settings' && <SettingsSheet key={room.id} open onClose={close} />}
    </>
  )
}
