import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export async function createFixtureHome({
  profile = 'web',
  bundles = ['@deepseek-ai/dsh-base', 'plugin-a', 'plugin-b', 'plugin-c'],
  dependencies = {
    'plugin-a': '1.0.0',
    'plugin-b': '1.0.0',
    'plugin-c': '1.0.0',
  },
} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-plugin-reducer-test-'))
  const profileDirectory = join(root, 'profiles', profile)
  await mkdir(profileDirectory, { recursive: true })
  await writeFile(join(profileDirectory, 'package.json'), `${JSON.stringify({
    name: `dsh-profile-${profile}`,
    private: true,
    dependencies,
    dsh: { profile: { bundles } },
  }, null, 2)}\n`)
  await writeFile(join(profileDirectory, 'cordis.patch.yml'), '[]\n')
  await writeFile(join(profileDirectory, 'pnpm-workspace.yaml'), 'packages:\n  - .\n')
  await writeFile(join(root, 'settings.yaml'), 'locale: en\n')
  const fakeToken = ['sk', 'this-must-not-be-copied'].join('-')
  await writeFile(join(root, '.env'), `DEEPSEEK_API_KEY=${fakeToken}\n`)

  for (const [name, version] of Object.entries(dependencies)) {
    const directory = join(profileDirectory, 'node_modules', name)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'package.json'), `${JSON.stringify({ name, version })}\n`)
  }
  return { root, profileDirectory }
}
