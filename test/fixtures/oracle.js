import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const args = process.argv.slice(2)
const value = option => {
  const index = args.indexOf(option)
  if (index === -1 || index + 1 >= args.length) throw new Error(`missing ${option}`)
  return args[index + 1]
}

const profile = value('--profile')
const required = value('--requires').split(',').filter(Boolean)
if (args.includes('--assert-fresh')) {
  const marker = join(process.env.DSH_HOME, 'probe-state-marker')
  try {
    await access(marker)
    process.stderr.write('probe state leaked from a previous attempt\n')
    process.exit(91)
  } catch {
    await writeFile(marker, 'created by oracle\n')
  }
}
const manifest = JSON.parse(await readFile(
  join(process.env.DSH_HOME, 'profiles', profile, 'package.json'),
  'utf8',
))
const active = manifest.dsh.profile.bundles
const failed = required.every(bundle => active.includes(bundle))

process.stdout.write(`active=${active.join(',')}\n`)
process.exitCode = failed ? 17 : 0
