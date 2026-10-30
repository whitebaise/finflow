'use client'

import { History, House } from 'lucide-react'
import { useState } from 'react'
import { HistoryScreen, HomeScreen } from './home-screens'
import { type RecordMode, type RoomTab, RoomScreen } from './room-screen'
import { LedgerProvider, useLedger } from './store'
import { TabBar } from './tab-bar'
import { WxNavBar } from './wx-nav-bar'

type Screen = 'home' | 'history' | 'room'

function Toast() {
  const { toast } = useLedger()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[38%] z-[60] flex justify-center px-8">
      {toast && (
        <p className="animate-fade rounded-xl bg-black/80 px-4 py-2.5 text-center text-[14px] leading-relaxed text-white">{toast}</p>
      )}
    </div>
  )
}

function Screens() {
  const [screen, setScreen] = useState<Screen>('room')
  const [roomTab, setRoomTab] = useState<RoomTab>('record')
  const [mode, setMode] = useState<RecordMode>('personal')

  const go = (fn: () => void) => {
    fn()
    window.scrollTo({ top: 0 })
  }

  if (screen === 'room') {
    return (
      <RoomScreen
        tab={roomTab}
        onTab={(t) => go(() => setRoomTab(t))}
        mode={mode}
        onMode={setMode}
        onBack={() => go(() => setScreen('home'))}
      />
    )
  }

  return (
    <>
      <WxNavBar title={screen === 'home' ? '牌局记账' : '历史房间'} />
      {screen === 'home' ? <HomeScreen onEnterRoom={() => go(() => setScreen('room'))} /> : <HistoryScreen />}
      <TabBar
        label="主导航"
        value={screen}
        onChange={(s) => go(() => setScreen(s))}
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
