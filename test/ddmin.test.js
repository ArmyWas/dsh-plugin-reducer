import assert from 'node:assert/strict'
import test from 'node:test'
import { ddmin, Outcome, TrialLimitError } from '../src/ddmin.js'

test('reduces a single bad item', async () => {
  const result = await ddmin(['a', 'b', 'c', 'd'], async items => (
    items.includes('c') ? Outcome.FAIL : Outcome.PASS
  ))
  assert.deepEqual(result.minimal, ['c'])
})
test('finds an interacting pair that passes individually', async () => {
  const result = await ddmin(['a', 'b', 'c', 'd', 'e'], async items => (
    items.includes('b') && items.includes('e') ? Outcome.FAIL : Outcome.PASS
  ))
  assert.deepEqual(result.minimal, ['b', 'e'])
})

test('does not remove an item based on an unresolved trial', async () => {
  const result = await ddmin(['a', 'b'], async items => {
    if (items.length === 1) return Outcome.UNRESOLVED
    return Outcome.FAIL
  })
  assert.deepEqual(result.minimal, ['a', 'b'])
  assert.ok(result.unresolvedCalls > 0)
})

test('rejects duplicate items', async () => {
  await assert.rejects(() => ddmin(['a', 'a'], async () => Outcome.FAIL), /must be unique/)
})

test('enforces the oracle call limit', async () => {
  await assert.rejects(
    () => ddmin(['a', 'b', 'c'], async () => Outcome.PASS, { maxOracleCalls: 1 }),
    TrialLimitError,
  )
})
