import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { applyTransfers, computeNet, computeSettlement, type NetRecord, type Transfer } from './settlement.ts'

const ORDER = ['lin', 'li', 'me', 'chen']

function assertBalanced(net: Record<string, number>, transfers: Transfer[]) {
  for (const t of transfers) {
    assert.ok(Number.isInteger(t.amount) && t.amount > 0, `transfer amount must be a positive integer: ${t.amount}`)
    assert.notEqual(t.from, t.to)
  }
  const after = applyTransfers(net, transfers)
  for (const [id, v] of Object.entries(after)) assert.equal(v, 0, `${id} should end at 0, got ${v}`)
}

/** Exhaustive lower bound: k non-zero members minus the max number of zero-sum groups. */
function bruteForceMin(values: number[]): number {
  const nz = values.filter((v) => v !== 0)
  let bestGroups = 0
  const assign = (i: number, groups: number[]) => {
    if (i === nz.length) {
      if (groups.every((g) => g === 0)) bestGroups = Math.max(bestGroups, groups.length)
      return
    }
    for (let g = 0; g < groups.length; g++) {
      groups[g] += nz[i]
      assign(i + 1, groups)
      groups[g] -= nz[i]
    }
    groups.push(nz[i])
    assign(i + 1, groups)
    groups.pop()
  }
  assign(0, [])
  return nz.length - bestGroups
}

describe('computeSettlement', () => {
  test('counterexample: greedy in fixed order would need 3, optimal is 2', () => {
    const net = { lin: 1000, li: 2000, me: -2000, chen: -1000 }
    const plan = computeSettlement(ORDER, net)
    assert.deepEqual(plan, [
      { from: 'me', to: 'li', amount: 2000 },
      { from: 'chen', to: 'lin', amount: 1000 },
    ])
    assertBalanced(net, plan)
  })

  test('all zero produces no transfers', () => {
    assert.deepEqual(computeSettlement(ORDER, { lin: 0, li: 0, me: 0, chen: 0 }), [])
  })

  test('members with zero net never appear in the plan', () => {
    const net = { lin: 1500, li: 0, me: -1500, chen: 0 }
    const plan = computeSettlement(ORDER, net)
    assert.deepEqual(plan, [{ from: 'me', to: 'lin', amount: 1500 }])
    assertBalanced(net, plan)
  })

  test('revoked records are excluded from net', () => {
    const records: NetRecord[] = [
      { from: 'me', to: 'lin', amount: 1000 },
      { from: 'chen', to: 'li', amount: 500 },
      { from: 'me', to: 'li', amount: 9999, revoked: { by: 'me', at: 0 } },
    ]
    const net = computeNet(ORDER, records)
    assert.deepEqual(net, { lin: 1000, li: 500, me: -1000, chen: -500 })
    const plan = computeSettlement(ORDER, net)
    assert.equal(plan.length, 2)
    assertBalanced(net, plan)
  })

  test('original demo data: 小林 +36, 小李 +12, 我 −18, 小陈 −30', () => {
    const records: NetRecord[] = [
      { from: 'lin', to: 'li', amount: 800 },
      { from: 'me', to: 'lin', amount: 1800 },
      { from: 'chen', to: 'lin', amount: 2600 },
      { from: 'chen', to: 'li', amount: 400 },
    ]
    const net = computeNet(ORDER, records)
    assert.deepEqual(net, { lin: 3600, li: 1200, me: -1800, chen: -3000 })
    const plan = computeSettlement(ORDER, net)
    assert.equal(plan.length, 3)
    assertBalanced(net, plan)
  })

  test('same input always yields the same plan', () => {
    const net = { lin: 1000, li: 2000, me: -2000, chen: -1000 }
    const a = computeSettlement(ORDER, net)
    const b = computeSettlement(ORDER, { ...net })
    assert.deepEqual(a, b)
  })

  test('rejects nets that do not sum to zero', () => {
    assert.throws(() => computeSettlement(ORDER, { lin: 100, li: 0, me: 0, chen: 0 }))
  })

  test('randomised 2–10 members: conserves money and matches brute-force minimum', () => {
    let seed = 42
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed / 2 ** 31
    }
    for (let round = 0; round < 300; round++) {
      const n = 2 + Math.floor(rand() * 9)
      const ids = Array.from({ length: n }, (_, i) => `m${i}`)
      const records: NetRecord[] = []
      const count = Math.floor(rand() * 12)
      for (let j = 0; j < count; j++) {
        const from = ids[Math.floor(rand() * n)]
        let to = ids[Math.floor(rand() * n)]
        if (to === from) to = ids[(ids.indexOf(from) + 1) % n]
        // Small amount pool makes zero-sum subgroups common, which is where greedy fails.
        records.push({ from, to, amount: [500, 1000, 1500, 2000][Math.floor(rand() * 4)], revoked: rand() < 0.15 })
      }
      const net = computeNet(ids, records)
      const plan = computeSettlement(ids, net)
      assertBalanced(net, plan)
      const nonZero = ids.filter((id) => net[id] !== 0).length
      assert.ok(plan.length <= Math.max(0, nonZero - 1))
      if (n <= 8) assert.equal(plan.length, bruteForceMin(ids.map((id) => net[id])), `round ${round}`)
    }
  })
})
