'use client'

import { ChevronRight, LogIn, Plus } from 'lucide-react'
import { formatSigned, ME, MEMBERS, netLabel } from '@/lib/ledger'
import { cn } from '@/lib/utils'
import { ROOM_NAME } from './room-screen'
import { useLedger } from './store'
import { Avatar, Card, SectionHeader } from './ui'

export function HomeScreen({ onEnterRoom }: { onEnterRoom: () => void }) {
  const { net, records, phase, frozen, showToast } = useLedger()
  const myNet = net[ME]
  const status = phase === 'ended' ? '结算中' : frozen ? '已冻结' : '进行中'

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-2">
      <div className="px-1 pb-1">
        <p className="text-[26px] font-extrabold tracking-tight">晚上好</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">熟人牌局，记清每一笔</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => showToast('原型暂未开放创建房间')}
          className="flex h-[104px] flex-col items-start justify-between rounded-3xl bg-lime p-4 text-left text-lime-foreground active:opacity-90"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-lime-foreground text-lime">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-bold">创建房间</span>
        </button>
        <button
          type="button"
          onClick={() => showToast('原型暂未开放加入房间')}
          className="flex h-[104px] flex-col items-start justify-between rounded-3xl bg-primary p-4 text-left text-primary-foreground active:opacity-90"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
            <LogIn className="size-5" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-semibold">输入房间号加入</span>
        </button>
      </div>

      <Card>
        <SectionHeader title="当前房间" />
        <button type="button" onClick={onEnterRoom} className="-m-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-xl p-2 text-left active:bg-muted/60">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[17px] font-semibold">{ROOM_NAME}</p>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', phase === 'ended' || frozen ? 'bg-warning-soft text-[#7A5A12]' : 'bg-secondary text-secondary-foreground')}>
                {status}
              </span>
            </div>
            <div className="mt-2 flex items-center">
              {MEMBERS.map((m, i) => (
                <Avatar key={m.id} id={m.id} size="sm" className={cn('ring-2 ring-card', i > 0 && '-ml-2')} />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">{`${records.filter((r) => !r.revoked).length} 笔流水`}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">{`我${netLabel(myNet)}`}</p>
            <p className={cn('text-[20px] font-bold tabular-nums', myNet > 0 && 'text-positive', myNet < 0 && 'text-negative')}>{formatSigned(myNet)}</p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
        </button>
      </Card>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        这是本地交互原型，所有数据为模拟数据，不连接微信登录、数据库或支付。
      </p>
    </main>
  )
}

const HISTORY = [
  { id: 'h1', name: '国庆家里局', date: '10月3日', people: 5, records: 12, net: 4600 },
  { id: 'h2', name: '周末茶馆', date: '9月20日', people: 4, records: 9, net: -2200 },
  { id: 'h3', name: '中秋夜', date: '9月17日', people: 4, records: 7, net: 0 },
]

export function HistoryScreen() {
  const { showToast } = useLedger()
  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-2">
      <p className="px-1 text-[13px] text-muted-foreground">已结算完成的房间</p>
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {HISTORY.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => showToast('历史详情将在后续版本提供')}
                className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{h.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{`${h.date} · ${h.people} 人 · ${h.records} 笔`}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">{h.net === 0 ? '持平' : h.net > 0 ? '我收回' : '我付出'}</p>
                  <p className={cn('text-[16px] font-semibold tabular-nums', h.net > 0 && 'text-positive', h.net < 0 && 'text-negative')}>{formatSigned(h.net)}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  )
}
