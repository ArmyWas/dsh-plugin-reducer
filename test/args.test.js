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

test('parses --list-candidates as a read-only listing mode', () => {
  const options = parseArgs(['--list-candidates', '--profile', 'work'])
  assert.equal(options.listCandidates, true)
  assert.equal(options.profile, 'work')
})

test('--list-candidates defaults to the web profile', () => {
  assert.equal(parseArgs(['--list-candidates']).profile, 'web')
})

for (const conflictingOption of [
  ['--dsh', 'custom-dsh'],
  ['--probe', 'web'],
  ['--timeout', '1'],
  ['--settle', '0'],
  ['--repeat', '2'],
  ['--max-trials', '3'],
  ['--report', 'report.json'],
  ['--force'],
  ['--keep-lab'],
  ['--quiet'],
]) {
  test(`--list-candidates rejects ${conflictingOption[0]}`, () => {
    assert.throws(
      () => parseArgs(['--list-candidates', ...conflictingOption]),
      new RegExp(`cannot be combined with ${conflictingOption[0]}`),
    )
  })
}

test('--list-candidates rejects a custom probe command', () => {
  assert.throws(
    () => parseArgs(['--list-candidates', '--', 'node', 'probe.js']),
    /cannot be combined with a command after --/,
  )
})
