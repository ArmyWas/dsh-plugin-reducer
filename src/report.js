import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { VERSION } from './args.js'
import { redactValue } from './redact.js'

export function buildReport(data, redactionOptions) {
  return redactValue({
    schemaVersion: 1,
    tool: {
      name: 'dsh-plugin-reducer',
      version: VERSION,
      algorithm: 'ddmin-plus-one-minimality-check',
    },
    generatedAt: new Date().toISOString(),
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    ...data,
  }, redactionOptions)
}
export async function writeReport(path, report, { overwrite = false } = {}) {
  const absolutePath = resolve(path)
  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(
    absolutePath,
    `${JSON.stringify(report, null, 2)}\n`,
    { encoding: 'utf8', flag: overwrite ? 'w' : 'wx' },
  )
  return absolutePath
}
