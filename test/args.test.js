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
  const options = parseArgs(['--list-candidates', '--profile', 'work', '--json'])
  assert.equal(options.listCandidates, true)
  assert.equal(options.profile, 'work')
  assert.equal(options.json, true)
})

test('parses --json for a reduction run', () => {
  assert.equal(parseArgs(['--json']).json, true)
})

for (const informationalOption of ['--help', '--version']) {
  test(`--json rejects ${informationalOption}`, () => {
    assert.throws(
      () => parseArgs(['--json', informationalOption]),
      new RegExp(`cannot be combined with ${informationalOption}`),
    )
  })
}

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
