import assert from 'node:assert/strict'
import { access, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { createFixtureHome } from './helpers.js'
import { createShadowLab, inspectProfile, profileFingerprint } from '../src/profile-lab.js'

test('identifies dependency-managed bundles as candidates', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const info = await inspectProfile({ dshHome: fixture.root, profile: 'web' })
  assert.deepEqual(info.fixedBundles, ['@deepseek-ai/dsh-base'])
  assert.deepEqual(info.candidates, ['plugin-a', 'plugin-b', 'plugin-c'])
  assert.deepEqual(info.packages.map(item => item.version), ['1.0.0', '1.0.0', '1.0.0'])
})

test('shadow lab changes only its own manifest and skips known credential stores', async t => {
  const fixture = await createFixtureHome()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const info = await inspectProfile({ dshHome: fixture.root, profile: 'web' })
  const before = await profileFingerprint(info.profileDirectory, info.dshHome)
  const lab = await createShadowLab(info)
  t.after(() => lab.dispose())

  await lab.writeBundles(['plugin-b'])
  const shadowManifest = JSON.parse(await readFile(join(lab.profileDirectory, 'package.json'), 'utf8'))
  assert.deepEqual(shadowManifest.dsh.profile.bundles, ['@deepseek-ai/dsh-base', 'plugin-b'])
  assert.equal(await profileFingerprint(info.profileDirectory, info.dshHome), before)
  await assert.rejects(access(join(lab.root, '.env')))
  await access(join(lab.profileDirectory, 'node_modules', 'plugin-b', 'package.json'))
})
