import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createFixtureHome } from './helpers.js'

const binPath = fileURLToPath(new URL('../bin/dsh-plugin-reducer.js', import.meta.url))
const oracle = fileURLToPath(new URL('./fixtures/oracle.js', import.meta.url))

function run(args, options = {}) {
  return spawnSync(process.execPath, [binPath, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    ...options,
  })
}

function parseOnlyLine(result) {
  assert.equal(result.stderr, '')
  assert.equal(result.stdout.trim().split(/\r?\n/).length, 1)
  return JSON.parse(result.stdout)
}

test('--list-candidates --json emits a stable envelope without dsh', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const result = run([
    '--list-candidates',
    '--json',
    '--profile',
    'web',
    '--dsh-home',
    fixture.root,
  ], { env: { ...process.env, PATH: '' } })

  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(parseOnlyLine(result), {
    schemaVersion: 1,
    tool: { name: 'dsh-plugin-reducer', version: '0.3.0' },
    operation: 'list-candidates',
    ok: true,
    profile: 'web',
    candidates: ['plugin-a', 'plugin-b', 'plugin-c'],
  })
})

test('--json returns a parseable INVALID_ARGUMENT envelope', () => {
  const result = run(['--json', '--not-a-real-option'])
  assert.equal(result.status, 2)
  const output = parseOnlyLine(result)
  assert.equal(output.ok, false)
  assert.equal(output.operation, 'reduce')
  assert.equal(output.error.code, 'INVALID_ARGUMENT')
  assert.match(output.error.message, /unknown option/)
})

test('--json redacts local paths from execution errors', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const result = run(['--json', '--profile', 'missing', '--dsh-home', fixture.root])
  assert.equal(result.status, 1)
  const output = parseOnlyLine(result)
  assert.equal(output.ok, false)
  assert.equal(output.error.code, 'EXECUTION_ERROR')
  assert.doesNotMatch(result.stdout, new RegExp(fixture.root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(output.error.message, /<local-path>/)
})

test('--json emits the scrubbed report and can write the same report to disk', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const reportPath = join(fixture.root, 'output', 'reducer-report.json')
  const result = run([
    '--json',
    '--profile',
    'web',
    '--dsh-home',
    fixture.root,
    '--report',
    reportPath,
    '--max-trials',
    '64',
    '--',
    process.execPath,
    oracle,
    '--profile',
    'web',
    '--requires',
    'plugin-a,plugin-c',
    '--assert-fresh',
  ])

  assert.equal(result.status, 0, result.stderr)
  const output = parseOnlyLine(result)
  assert.equal(output.ok, true)
  assert.equal(output.operation, 'reduce')
  assert.deepEqual(output.report.result.minimalFailingSet, ['plugin-a', 'plugin-c'])
  assert.equal(output.report.result.oneMinimal, true)
  assert.equal(output.report.safety.sourceProfileUnchanged, true)
  assert.deepEqual(JSON.parse(await readFile(reportPath, 'utf8')), output.report)
})
