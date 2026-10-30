'use client'

import { Flag, FlaskConical, ListOrdered, Lock, PencilLine, Wallet } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DemoSheet } from './demo-sheet'
import { LedgerPage } from './ledger-page'
import { RoomMaster } from './room-master'
import { RoomPersonal } from './room-personal'
import { SettlePage } from './settle-page'
import { useLedger } from './store'
import { TabBar } from './tab-bar'
import { WxNavBar } from './wx-nav-bar'

export type RoomTab = 'record' | 'ledger' | 'settle'
export type RecordMode = 'personal' | 'master'

export const ROOM_NAME = '周五小聚'

export function RoomScreen({
  tab,
  onTab,
  mode,
  onMode,
  onBack,
}: {
  tab: RoomTab
  onTab: (t: RoomTab) => void
  mode: RecordMode
  onMode: (m: RecordMode) => void
  onBack: () => void
}) {
  const { frozen, phase } = useLedger()
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <>
      <WxNavBar title={ROOM_NAME} onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">
            <span>房间号 </span>
            <span className="font-medium tabular-nums text-foreground">382 915</span>
            <span>{' · 4 人'}</span>
          </p>
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="-mr-1 flex h-9 items-center gap-1 rounded-full bg-card px-3 text-[13px] font-medium text-foreground shadow-[0_1px_3px_rgba(20,48,31,0.1)] active:bg-muted"
          >
            <FlaskConical className="size-3.5" aria-hidden="true" />
            演示状态
          </button>
        </div>

        {frozen && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2.5 text-[13px]">
            <Lock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>房间已冻结：暂停记账与撤销，明细和结算仍可查看。</span>
          </div>
        )}
        {phase === 'ended' && tab !== 'settle' && (
          <button
            type="button"
            onClick={() => onTab('settle')}
            className="flex items-center gap-2 rounded-2xl bg-secondary px-3.5 py-3 text-left text-[13px] text-secondary-foreground"
          >
            <Flag className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">牌局已结束，记账已关闭。</span>
            <span className="font-medium underline underline-offset-2">去结算</span>
          </button>
        )}

        {tab === 'record' && (
          <>
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
                  aria-selected={mode === m.id}
                  onClick={() => onMode(m.id)}
                  className={cn(
                    'h-10 rounded-full text-[15px] font-semibold transition-all',
                    mode === m.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {mode === 'personal' ? <RoomPersonal onViewAll={() => onTab('ledger')} /> : <RoomMaster />}
          </>
        )}
        {tab === 'ledger' && <LedgerPage />}
        {tab === 'settle' && <SettlePage />}
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
      <DemoSheet open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  )
}
