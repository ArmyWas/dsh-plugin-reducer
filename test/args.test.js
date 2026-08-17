import assert from 'node:assert/strict'
import test from 'node:test'
import { parseArgs } from '../src/args.js'

test('parses a custom command after the separator', () => {
  const options = parseArgs(['--profile', 'web', '--repeat=2', '--', 'node', 'probe.js'])
  assert.equal(options.probe, 'command')
  assert.equal(options.repeat, 2)
  assert.deepEqual(options.command, ['node', 'probe.js'])
})
test('rejects conflicting probe forms', () => {
  assert.throws(
    () => parseArgs(['--probe', 'web', '--', 'node', 'probe.js']),
    /cannot be combined/,
  )
})
