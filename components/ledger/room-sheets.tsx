'use client'

import { Copy, Lock, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { can, MAX_MEMBERS, type MemberId, ROLE_LABEL } from '@/lib/ledger'
import { BottomSheet } from './bottom-sheet'
import { useRoom } from './store'
import { Avatar, RoleTag, SecondaryButton } from './ui'

const inputClass =
  'h-12 w-full min-w-0 rounded-2xl border border-border bg-background px-4 text-[16px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20'

const isComposing = (e: React.KeyboardEvent) => e.nativeEvent.isComposing || e.keyCode === 229

function AddMemberForm() {
  const { room, addMember, showToast } = useRoom()
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const full = room.members.length >= MAX_MEMBERS
  const dupe = room.members.some((m) => m.name === trimmed)
  const disabled = !trimmed || full || dupe || room.status !== 'playing'

  function submit() {
    if (disabled) return
    addMember(trimmed)
    showToast(`${trimmed} 已加入房间（模拟）`)
    setName('')
  }

  return (
    <div>
      <label htmlFor="add-member" className="text-[13px] text-muted-foreground">
        模拟成员加入
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="add-member"
          value={name}
          maxLength={8}
          placeholder={full ? `已满 ${MAX_MEMBERS} 人` : '输入昵称'}
          disabled={full}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isComposing(e)) {
              e.preventDefault()
              submit()
            }
          }}
          className={inputClass}
        />
        <SecondaryButton type="button" onClick={submit} disabled={disabled} className="shrink-0">
          <UserPlus className="size-4" aria-hidden="true" />
          添加
        </SecondaryButton>
      </div>
      {dupe && trimmed && <p className="mt-1 text-xs text-destructive">房间里已有同名成员</p>}
      {room.status !== 'playing' && <p className="mt-1 text-xs text-muted-foreground">牌局已结束，不能再加入成员</p>}
    </div>
  )
}

export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { room, role, showToast } = useRoom()
  return (
    <BottomSheet open={open} onClose={onClose} title="邀请成员">
      <div className="flex flex-col gap-4 pt-1">
        <div className="rounded-3xl bg-lime p-4 text-center text-lime-foreground">
          <p className="text-[13px]">房间号</p>
          <p className="mt-1 text-[34px] font-extrabold tracking-[0.2em] tabular-nums">{room.code}</p>
          <p className="mt-1 text-xs text-lime-foreground/70">{`${room.members.length}/${MAX_MEMBERS} 人`}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(room.code).catch(() => {})
            showToast('房间号已复制')
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-[15px] font-medium active:bg-muted"
        >
          <Copy className="size-4" aria-hidden="true" />
          复制房间号
        </button>
        <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          演示限制：没有真实的微信分享与多人同步。其他设备无法真正加入，可以在下方模拟一位成员加入本房间。
        </p>
        {can.invite(role) ? <AddMemberForm /> : <p className="text-center text-[13px] text-muted-foreground">只有房主和主记可以添加成员</p>}
      </div>
      <div className="pb-safe" />
    </BottomSheet>
  )
}

function MemberRow({ id }: { id: MemberId }) {
  const { room, role, me, member, setRole, removeMember, showToast } = useRoom()
  const m = member(id)
  const [confirm, setConfirm] = useState(false)
  const hasRecords = room.records.some((r) => r.from === id || r.to === id) || room.drafts.some((d) => d.from === id || d.to === id)
  const manage = can.manageMembers(role) && m.role !== 'owner' && room.status === 'playing'

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <Avatar member={m} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[15px] font-medium">
            <span className="truncate">{m.name}</span>
            {id === me && <span className="text-xs text-muted-foreground">（我）</span>}
            <RoleTag member={m} />
          </p>
        </div>
        {manage && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const next = m.role === 'scorer' ? 'member' : 'scorer'
                setRole(id, next)
                showToast(`${m.name} 已设为${ROLE_LABEL[next]}`)
              }}
              className="h-9 rounded-full border border-border px-3 text-[13px] font-medium active:bg-muted"
            >
              {m.role === 'scorer' ? '取消主记' : '设为主记'}
            </button>
            {id !== me && (
              <button
                type="button"
                onClick={() => (hasRecords ? showToast('该成员已有流水，不能移除') : setConfirm(true))}
                className={cn('flex size-9 items-center justify-center rounded-full active:bg-muted', hasRecords ? 'text-muted-foreground/40' : 'text-destructive')}
                aria-label={`移除 ${m.name}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
      {confirm && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-destructive/5 px-3 py-2" role="alert">
          <span className="flex-1 text-[13px]">{`确认移除 ${m.name}？`}</span>
          <button type="button" onClick={() => setConfirm(false)} className="h-9 rounded-lg px-3 text-[13px] active:bg-muted">
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              removeMember(id)
              showToast(`已移除 ${m.name}`)
            }}
            className="h-9 rounded-lg bg-destructive px-3 text-[13px] font-semibold text-white"
          >
            移除
          </button>
        </div>
      )}
    </li>
  )
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { room, role, rename, toggleFrozen, showToast } = useRoom()
  const [name, setName] = useState(room.name)
  const owner = can.manageRoom(role)
  const trimmed = name.trim()

  return (
    <BottomSheet open={open} onClose={onClose} title="房间设置">
      <div className="flex flex-col gap-5 pt-1">
        <section>
          <label htmlFor="room-name" className="text-[13px] text-muted-foreground">
            房间名称
          </label>
          <div className="mt-1.5 flex gap-2">
            <input id="room-name" value={name} maxLength={12} disabled={!owner} onChange={(e) => setName(e.target.value)} className={cn(inputClass, 'disabled:opacity-60')} />
            {owner && (
              <SecondaryButton
                type="button"
                className="shrink-0"
                disabled={!trimmed || trimmed === room.name}
                onClick={() => {
                  rename(trimmed)
                  showToast('房间名称已更新')
                }}
              >
                保存
              </SecondaryButton>
            )}
          </div>
        </section>

        {owner && room.status === 'playing' && (
          <button type="button" role="switch" aria-checked={room.frozen} onClick={toggleFrozen} className="flex min-h-14 items-center gap-3 rounded-2xl bg-muted/60 px-3 text-left active:bg-muted">
            <Lock className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-[15px] font-medium">冻结房间</span>
              <span className="block text-xs text-muted-foreground">暂停记账和撤销，明细和结算仍可查看</span>
            </span>
            <span className={cn('relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors', room.frozen ? 'bg-primary' : 'bg-border')} aria-hidden="true">
              <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform', room.frozen ? 'translate-x-[22px]' : 'translate-x-0.5')} />
            </span>
          </button>
        )}

        <section>
          <h3 className="text-[13px] text-muted-foreground">{`成员（${room.members.length}/${MAX_MEMBERS}）`}</h3>
          <ul className="divide-y divide-border">
            {room.members.map((m) => (
              <MemberRow key={m.id} id={m.id} />
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">权限说明</p>
          <p className="mt-1">房主：管理成员与角色、改名、冻结、结束牌局与确认账本。</p>
          <p>主记：可用主记台代记、撤销任意流水、添加成员。</p>
          <p>成员：个人记账，只能撤销自己记录的流水。</p>
          <p>结算时每人只能标记自己的付款、确认自己的收款。</p>
        </section>
      </div>
      <div className="pb-safe" />
    </BottomSheet>
  )
}
