'use client'

import { ArrowRight, Copy, Inbox, RotateCcw, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatYuan, ROLE_LABEL } from '@/lib/ledger'
import { BottomSheet } from './bottom-sheet'
import { useLedger, useRoom } from './store'
import { Avatar } from './ui'

function Toggle({ checked }: { checked: boolean }) {
  return (
    <span className={cn('relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border')} aria-hidden="true">
      <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </span>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="mb-1.5 px-1 text-xs font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function DemoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { failNext, setFailNext, resetDemo } = useLedger()
  const { room, me, member, nameOf, setViewer, setTask, clearRecords, showToast } = useRoom()
  const rowClass = 'flex min-h-14 w-full items-center gap-3 px-1 py-2 text-left active:bg-muted/60'

  const simulated = (room.settlement?.tasks ?? []).flatMap((t) => {
    if (room.status !== 'settling' || t.status === 'confirmed') return []
    const actor = t.status === 'pending' ? t.from : t.to
    if (actor === me) return []
    return [{ task: t, actor, next: t.status === 'pending' ? ('marked' as const) : ('confirmed' as const) }]
  })

  return (
    <BottomSheet open={open} onClose={onClose} title="演示面板">
      <p className="mb-3 rounded-xl bg-warning-soft px-3 py-2 text-[12px] leading-relaxed text-[#5C4410]">
        仅用于本地原型演示。数据只保存在当前页面内存中，刷新即恢复；没有多人云端同步，其他成员的操作在这里模拟。
      </p>

      <Group title="身份切换（模拟不同成员视角）">
        <ul className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="当前身份">
          {room.members.map((m) => (
            <li key={m.id} className="min-w-0">
              <button
                type="button"
                role="radio"
                aria-checked={m.id === me}
                onClick={() => {
                  setViewer(m.id)
                  showToast(`已切换为 ${m.name}（${ROLE_LABEL[m.role]}）`)
                }}
                className={cn(
                  'flex w-full flex-col items-center gap-0.5 rounded-xl border-2 py-1.5',
                  m.id === me ? 'border-primary bg-secondary' : 'border-transparent bg-muted active:bg-secondary',
                )}
              >
                <Avatar member={m} size="sm" />
                <span className="max-w-full truncate px-0.5 text-[12px] font-medium">{m.name}</span>
                <span className="text-[10px] text-muted-foreground">{ROLE_LABEL[m.role]}</span>
              </button>
            </li>
          ))}
        </ul>
      </Group>

      {room.status === 'settling' && (
        <Group title="模拟其他成员付款 / 确认到账">
          {simulated.length === 0 ? (
            <p className="rounded-xl bg-muted/60 px-3 py-3 text-center text-[13px] text-muted-foreground">没有需要其他成员操作的任务</p>
          ) : (
            <ul className="divide-y divide-border">
              {simulated.map(({ task, actor, next }) => (
                <li key={task.key} className="flex items-center gap-2 py-2">
                  <p className="flex min-w-0 flex-1 items-center gap-1 text-[13px]">
                    <span className="truncate">{nameOf(task.from)}</span>
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-label="付给" />
                    <span className="truncate">{nameOf(task.to)}</span>
                    <span className="ml-1 tabular-nums font-semibold">¥{formatYuan(task.amount)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTask(task.key, next)
                      showToast(next === 'marked' ? `${member(actor).name}已标记付款` : `${member(actor).name}已确认到账`)
                    }}
                    className="h-9 shrink-0 rounded-lg border border-dashed border-border px-2.5 text-[12px] font-medium active:bg-muted"
                  >
                    {next === 'marked' ? `模拟${member(actor).name}已付` : `模拟${member(actor).name}确认`}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Group>
      )}

      <Group title="异常与数据">
        <ul className="divide-y divide-border">
          <li>
            <button type="button" role="switch" aria-checked={failNext} onClick={() => setFailNext(!failNext)} className={rowClass}>
              <WifiOff className="size-5 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-[15px] font-medium">下一次提交失败</span>
                <span className="block text-xs text-muted-foreground">模拟网络异常，查看失败与重试</span>
              </span>
              <Toggle checked={failNext} />
            </button>
          </li>
          <li className="flex min-h-14 items-center gap-3 px-1 py-2">
            <Copy className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-[15px] font-medium">疑似重复</span>
              <span className="block text-xs text-muted-foreground">3 分钟内连续记同一笔（同人、同金额）即可触发</span>
            </span>
          </li>
          {room.status !== 'settled' && (
            <li>
              <button
                type="button"
                onClick={() => {
                  clearRecords()
                  onClose()
                  showToast('已清空流水并回到进行中')
                }}
                className={rowClass}
              >
                <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block text-[15px] font-medium">清空本房间流水</span>
                  <span className="block text-xs text-muted-foreground">查看空记录状态</span>
                </span>
              </button>
            </li>
          )}
          {room.id === 'room-demo' && (
            <li>
              <button
                type="button"
                onClick={() => {
                  resetDemo()
                  onClose()
                  showToast('示例房间已恢复初始数据')
                }}
                className={rowClass}
              >
                <RotateCcw className="size-5 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block text-[15px] font-medium">恢复示例房间</span>
                  <span className="block text-xs text-muted-foreground">4 笔流水：小林 +36、小李 +12、阿杰 −18、小陈 −30</span>
                </span>
              </button>
            </li>
          )}
        </ul>
      </Group>
      <div className="pb-safe" />
    </BottomSheet>
  )
}
