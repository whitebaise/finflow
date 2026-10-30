'use client'

import { Copy, Inbox, Lock, RotateCcw, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BottomSheet } from './bottom-sheet'
import { useLedger } from './store'

function Toggle({ checked }: { checked: boolean }) {
  return (
    <span className={cn('relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border')} aria-hidden="true">
      <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </span>
  )
}

export function DemoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { frozen, failNext, toggleFrozen, setFailNext, clear, reset, showToast } = useLedger()

  const rowClass = 'flex min-h-14 w-full items-center gap-3 px-1 py-2 text-left active:bg-muted/60'

  return (
    <BottomSheet open={open} onClose={onClose} title="演示状态">
      <p className="mb-2 text-[13px] leading-relaxed text-muted-foreground">
        仅用于本地原型演示，数据保存在当前页面，不代表已实现多人云端同步。
      </p>
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
        <li>
          <button type="button" role="switch" aria-checked={frozen} onClick={toggleFrozen} className={rowClass}>
            <Lock className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-[15px] font-medium">冻结房间</span>
              <span className="block text-xs text-muted-foreground">暂停记账和撤销，仍可查看</span>
            </span>
            <Toggle checked={frozen} />
          </button>
        </li>
        <li className="flex min-h-14 items-center gap-3 px-1 py-2">
          <Copy className="size-5 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-[15px] font-medium">疑似重复</span>
            <span className="block text-xs text-muted-foreground">3 分钟内连续记同一笔（同人、同金额）即可触发</span>
          </span>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              clear()
              onClose()
              showToast('已清空流水')
            }}
            className={rowClass}
          >
            <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-[15px] font-medium">清空流水</span>
              <span className="block text-xs text-muted-foreground">查看空记录状态</span>
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              reset()
              onClose()
              showToast('已恢复初始模拟数据')
            }}
            className={rowClass}
          >
            <RotateCcw className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-[15px] font-medium">恢复初始数据</span>
              <span className="block text-xs text-muted-foreground">4 笔流水：小林 +36、小李 +12、我 −18、小陈 −30</span>
            </span>
          </button>
        </li>
      </ul>
      <div className="pb-safe" />
    </BottomSheet>
  )
}
