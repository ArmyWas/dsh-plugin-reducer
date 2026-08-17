export const Outcome = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  UNRESOLVED: 'unresolved',
})

export class TrialLimitError extends Error {
  constructor(limit) {
    super(`trial limit reached (${limit})`)
    this.name = 'TrialLimitError'
    this.limit = limit
  }
}
function assertUnique(items) {
  if (new Set(items).size !== items.length) {
    throw new TypeError('ddmin items must be unique')
  }
}

function split(items, count) {
  const partitions = []
  let offset = 0
  for (let index = 0; index < count; index += 1) {
    const remainingItems = items.length - offset
    const remainingPartitions = count - index
    const size = Math.ceil(remainingItems / remainingPartitions)
    partitions.push(items.slice(offset, offset + size))
    offset += size
  }
  return partitions.filter(partition => partition.length > 0)
}

function without(items, removed) {
  const removedSet = new Set(removed)
  return items.filter(item => !removedSet.has(item))
}

/**
 * Reduce a known failure-inducing list to a 1-minimal subset.
 *
 * The oracle returns `fail` when the failure is reproduced, `pass` when it is
 * not, and `unresolved` when repeated probes disagree. Unresolved trials never
 * justify removing an item.
 */
export async function ddmin(items, oracle, options = {}) {
  assertUnique(items)
  if (items.length === 0) return { minimal: [], oracleCalls: 0, unresolvedCalls: 0 }

  const maxOracleCalls = options.maxOracleCalls ?? 256
  let oracleCalls = 0
  let unresolvedCalls = 0

  const test = async candidate => {
    if (oracleCalls >= maxOracleCalls) throw new TrialLimitError(maxOracleCalls)
    oracleCalls += 1
    const outcome = await oracle([...candidate])
    if (!Object.values(Outcome).includes(outcome)) {
      throw new TypeError(`oracle returned invalid outcome: ${String(outcome)}`)
    }
    if (outcome === Outcome.UNRESOLVED) unresolvedCalls += 1
    return outcome
  }

  let current = [...items]
  let granularity = Math.min(2, current.length)

  while (current.length >= 2) {
    const partitions = split(current, granularity)
    let reduced = false

    // Complements usually remove more plugins per probe, so try them first.
    for (const partition of partitions) {
      const complement = without(current, partition)
      if (complement.length === 0) continue
      if (await test(complement) === Outcome.FAIL) {
        current = complement
        granularity = Math.max(2, granularity - 1)
        reduced = true
        break
      }
    }
    if (reduced) continue

    // A whole partition may contain the interacting set even when neither
    // complement does (the classical ddmin subset step).
    for (const partition of partitions) {
      if (partition.length === current.length) continue
      if (await test(partition) === Outcome.FAIL) {
        current = partition
        granularity = Math.max(2, granularity - 1)
        reduced = true
        break
      }
    }
    if (reduced) continue

    if (granularity >= current.length) break
    granularity = Math.min(current.length, granularity * 2)
  }

  // Explicit 1-minimality pass. This also protects against an unlucky
  // partition history when an oracle has unresolved outcomes.
  let changed = true
  while (changed && current.length > 1) {
    changed = false
    for (const item of [...current]) {
      const candidate = current.filter(value => value !== item)
      if (await test(candidate) === Outcome.FAIL) {
        current = candidate
        changed = true
        break
      }
    }
  }

  return { minimal: current, oracleCalls, unresolvedCalls }
}
