'use client'

import { History, House } from 'lucide-react'
import { useState } from 'react'
import { HistoryDetail, HistoryScreen, HomeScreen } from './home-screens'
import { type RecordMode, type RoomTab, RoomScreen } from './room-screen'
import { LedgerProvider, useLedger } from './store'
import { TabBar } from './tab-bar'
import { WxNavBar } from './wx-nav-bar'

type Screen = { name: 'home' } | { name: 'history' } | { name: 'room' } | { name: 'historyDetail'; roomId: string; from: 'history' | 'home' }

function Toast() {
  const { toast } = useLedger()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[38%] z-[60] flex justify-center px-8">
      {toast && <p className="animate-fade rounded-xl bg-black/80 px-4 py-2.5 text-center text-[14px] leading-relaxed text-white">{toast}</p>}
    </div>
  )
}

function Screens() {
  const { openRoom, rooms } = useLedger()
  const [screen, setScreen] = useState<Screen>({ name: 'room' })
  const [roomTab, setRoomTab] = useState<RoomTab>('record')
  const [mode, setMode] = useState<RecordMode>('personal')

  const go = (next: Screen) => {
    setScreen(next)
    window.scrollTo({ top: 0 })
  }

  if (screen.name === 'room') {
    return (
      <RoomScreen
        tab={roomTab}
        onTab={(t) => {
          setRoomTab(t)
          window.scrollTo({ top: 0 })
        }}
        mode={mode}
        onMode={setMode}
        onBack={() => go({ name: 'home' })}
        onArchived={() => go({ name: 'history' })}
      />
    )
  }

  if (screen.name === 'historyDetail') {
    const room = rooms.find((r) => r.id === screen.roomId)
    return (
      <>
        <WxNavBar title={room?.name ?? '历史详情'} onBack={() => go({ name: screen.from })} />
        <HistoryDetail roomId={screen.roomId} />
      </>
    )
  }

  const enterRoom = (id: string) => {
    openRoom(id)
    setRoomTab('record')
    go({ name: 'room' })
  }

  return (
    <>
      <WxNavBar title={screen.name === 'home' ? '牌局记账' : '历史房间'} />
      {screen.name === 'home' ? (
        <HomeScreen onEnterRoom={enterRoom} onOpenHistory={(id) => go({ name: 'historyDetail', roomId: id, from: 'home' })} />
      ) : (
        <HistoryScreen onOpen={(id) => go({ name: 'historyDetail', roomId: id, from: 'history' })} />
      )}
      <TabBar
        label="主导航"
        value={screen.name}
        onChange={(s) => go({ name: s })}
        items={[
          { id: 'home', label: '首页', icon: House },
          { id: 'history', label: '历史', icon: History },
        ]}
      />
    </>
  )
}

export function AppShell() {
  return (
    <LedgerProvider>
      <div id="app-root" className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
        <Screens />
      </div>
      <Toast />
    </LedgerProvider>
  )
}
