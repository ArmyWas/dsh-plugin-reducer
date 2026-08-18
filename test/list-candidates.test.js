import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createFixtureHome } from './helpers.js'
import { listCandidates } from '../src/index.js'

const binPath = fileURLToPath(new URL('../bin/dsh-plugin-reducer.js', import.meta.url))

test('listCandidates returns the out-of-tree candidate names', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  assert.deepEqual(await listCandidates({ dshHome: fixture.root, profile: 'web' }), [
    'plugin-a',
    'plugin-b',
    'plugin-c',
  ])
})

test('listCandidates reports no candidates for an install-only profile', async t => {
  const fixture = await createFixtureHome({
    bundles: ['@deepseek-ai/dsh-base'],
    dependencies: {},
  })
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  assert.deepEqual(await listCandidates({ dshHome: fixture.root, profile: 'web' }), [])
})

test('listCandidates does not modify the source profile', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const manifestPath = `${fixture.profileDirectory}/package.json`
  const before = await readFile(manifestPath, 'utf8')
  await listCandidates({ dshHome: fixture.root, profile: 'web' })
  assert.equal(await readFile(manifestPath, 'utf8'), before)
})

test('--list-candidates prints one bundle per line and exits 0 without dsh', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const result = spawnSync(
    process.execPath,
    [binPath, '--list-candidates', '--profile', 'web', '--dsh-home', fixture.root],
    { encoding: 'utf8', windowsHide: true, env: { ...process.env, PATH: '' } },
  )
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, 'plugin-a\nplugin-b\nplugin-c\n')
  assert.equal(result.stderr, '')
})

test('--list-candidates surfaces profile errors and exits 1', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const result = spawnSync(
    process.execPath,
    [binPath, '--list-candidates', '--profile', 'missing', '--dsh-home', fixture.root],
    { encoding: 'utf8', windowsHide: true },
  )
  assert.equal(result.status, 1)
  assert.match(result.stderr, /cannot read profile missing/)
})
