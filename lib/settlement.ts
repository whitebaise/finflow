/**
 * Pure ledger math with no framework or path-alias imports,
 * so it can be unit-tested directly with `node --test`.
 */

export type NetRecord = {
  from: string
  to: string
  /** Amount in cents (分). */
  amount: number
  revoked?: unknown
}

export type Transfer = { from: string; to: string; amount: number }

export const MAX_MEMBERS = 10

export function computeNet(memberIds: readonly string[], records: readonly NetRecord[]): Record<string, number> {
  const net: Record<string, number> = {}
  for (const id of memberIds) net[id] = 0
  for (const r of records) {
    if (r.revoked) continue
    net[r.from] = (net[r.from] ?? 0) - r.amount
    net[r.to] = (net[r.to] ?? 0) + r.amount
  }
  return net
}

/** Two-pointer matching in the given order. Produces at most (debtors + creditors − 1) transfers. */
function greedy(ids: readonly string[], net: Record<string, number>): Transfer[] {
  const debtors = ids.filter((id) => net[id] < 0).map((id) => ({ id, left: -net[id] }))
  const creditors = ids.filter((id) => net[id] > 0).map((id) => ({ id, left: net[id] }))
  const out: Transfer[] = []
  let c = 0
  for (const d of debtors) {
    while (d.left > 0 && c < creditors.length) {
      const pay = Math.min(d.left, creditors[c].left)
      out.push({ from: d.id, to: creditors[c].id, amount: pay })
      d.left -= pay
      creditors[c].left -= pay
      if (creditors[c].left === 0) c++
    }
  }
  return out
}

/**
 * Minimum-transfer settlement.
 *
 * The fewest transfers for k non-zero members equals k − g, where g is the largest number of
 * disjoint zero-sum groups the members can be split into. We find that partition exactly with a
 * bitmask DP (k ≤ 10 → at most 3^10 submask steps), then settle each group with ≤ (size − 1)
 * transfers. Ties are broken deterministically by member order, so the same input always yields
 * the same plan.
 */
export function computeSettlement(memberIds: readonly string[], net: Record<string, number>): Transfer[] {
  const ids = memberIds.filter((id) => (net[id] ?? 0) !== 0)
  const total = ids.reduce((s, id) => s + net[id], 0)
  if (total !== 0) throw new Error(`Net amounts must sum to zero, got ${total}`)
  if (ids.length === 0) return []
  if (ids.length > MAX_MEMBERS) return sortTransfers(memberIds, greedy(ids, net))

  const k = ids.length
  const full = (1 << k) - 1
  const sum = new Array<number>(full + 1).fill(0)
  for (let mask = 1; mask <= full; mask++) {
    const low = mask & -mask
    sum[mask] = sum[mask ^ low] + net[ids[31 - Math.clz32(low)]]
  }

  // best[mask]: max zero-sum groups partitioning `mask` (only defined when sum[mask] === 0).
  // pick[mask]: the group containing the lowest member of `mask` in that optimal partition.
  const best = new Array<number>(full + 1).fill(-1)
  const pick = new Array<number>(full + 1).fill(0)
  best[0] = 0
  for (let mask = 1; mask <= full; mask++) {
    if (sum[mask] !== 0) continue
    const low = mask & -mask
    const rest = mask ^ low
    // Enumerate submasks of `rest` from smallest to largest so the smallest valid group wins ties.
    let sub = 0
    while (true) {
      const group = sub | low
      const remaining = mask ^ group
      if (sum[group] === 0 && best[remaining] >= 0) {
        const value = best[remaining] + 1
        if (value > best[mask]) {
          best[mask] = value
          pick[mask] = group
        }
      }
      if (sub === rest) break
      sub = (sub - rest) & rest
    }
  }

  const transfers: Transfer[] = []
  let mask = full
  while (mask) {
    const group = pick[mask]
    const groupIds = ids.filter((_, i) => group & (1 << i))
    transfers.push(...greedy(groupIds, net))
    mask ^= group
  }
  return sortTransfers(memberIds, transfers)
}

function sortTransfers(order: readonly string[], list: Transfer[]): Transfer[] {
  const idx = (id: string) => order.indexOf(id)
  return [...list].sort((a, b) => idx(a.from) - idx(b.from) || idx(a.to) - idx(b.to))
}

/** Applies transfers to net balances; a correct plan brings everyone to exactly zero. */
export function applyTransfers(net: Record<string, number>, transfers: readonly Transfer[]): Record<string, number> {
  const out = { ...net }
  for (const t of transfers) {
    out[t.from] += t.amount
    out[t.to] -= t.amount
  }
  return out
}
