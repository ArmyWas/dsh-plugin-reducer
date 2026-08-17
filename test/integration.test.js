import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { readFile, rm } from 'node:fs/promises'
import test from 'node:test'
import { createFixtureHome } from './helpers.js'
import { reduceProfile } from '../src/index.js'

const oracle = fileURLToPath(new URL('./fixtures/oracle.js', import.meta.url))

test('reduces a profile interaction without modifying the source profile', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const original = await readFile(`${fixture.profileDirectory}/package.json`, 'utf8')

  const { report, labPath } = await reduceProfile({
    dshHome: fixture.root,
    profile: 'web',
    probe: 'command',
    command: [
      'node',
      oracle,
      '--profile',
      'web',
      '--requires',
      'plugin-a,plugin-c',
      '--assert-fresh',
    ],
    dshCommand: process.execPath,
    timeoutMs: 5_000,
    settleMs: 0,
    repeat: 2,
    maxTrials: 64,
    keepLab: true,
    cwd: process.cwd(),
  })
  t.after(() => rm(labPath, { recursive: true, force: true }))

  assert.deepEqual(report.result.minimalFailingSet, ['plugin-a', 'plugin-c'])
  assert.equal(report.result.oneMinimal, true)
  assert.equal(report.safety.sourceProfileUnchanged, true)
  assert.equal(report.safety.credentialStoresCopied, false)
  assert.equal(report.safety.isolatedAttempts, true)
  assert.equal(report.safety.reportRedactionApplied, true)
  assert.equal(report.safety.shadowLabKept, true)
  const keptManifest = JSON.parse(await readFile(`${labPath}/profiles/web/package.json`, 'utf8'))
  assert.deepEqual(keptManifest.dsh.profile.bundles, [
    '@deepseek-ai/dsh-base',
    'plugin-a',
    'plugin-c',
  ])
  assert.equal(await readFile(`${fixture.profileDirectory}/package.json`, 'utf8'), original)
})
