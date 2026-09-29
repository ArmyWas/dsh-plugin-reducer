import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  initProfile,
  PROFILE_TEMPLATES,
} from '@deepseek-ai/dsh-app-boot'
import { normalizeWebProfileTemplate } from './profile-template-contract.mjs'

const dshHome = process.env.DSH_HOME
assert.ok(dshHome, 'DSH_HOME is required')

const { templateShape, bundles, patchReload } = normalizeWebProfileTemplate(
  PROFILE_TEMPLATES.web,
)

const profileDirectory = join(dshHome, 'profiles', 'web')
if (patchReload === undefined) {
  initProfile(profileDirectory, bundles)
} else {
  initProfile(profileDirectory, bundles, patchReload)
}

const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
assert.deepEqual(
  manifest.dsh?.profile?.bundles,
  bundles,
  'initialized manifest must preserve the official ordered bundle template',
)
if (patchReload === undefined) {
  assert.equal(
    manifest.dsh?.profile?.patchReload,
    undefined,
    'initialized manifest must not invent a patchReload policy',
  )
} else {
  assert.equal(
    manifest.dsh?.profile?.patchReload,
    patchReload,
    'initialized manifest must preserve the official patchReload policy',
  )
}

process.stdout.write(`${JSON.stringify({
  profile: 'web',
  templateShape,
  bundles,
  patchReload,
  manifest: join(profileDirectory, 'package.json'),
})}\n`)
