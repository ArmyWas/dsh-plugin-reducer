import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'

const executableCache = new Map()

export function resolveExecutableOnPath(command) {
  if (process.platform !== 'win32' || extname(command) !== '' || basename(command) !== command) {
    return command
  }
  if (executableCache.has(command)) return executableCache.get(command)
  const result = spawnSync('where.exe', [command], {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  if (result.status !== 0) {
    executableCache.set(command, command)
    return command
  }
  const matches = result.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const resolved = matches.find(match => ['.exe', '.com'].includes(extname(match).toLowerCase()))
    ?? matches.find(match => ['.cmd', '.bat'].includes(extname(match).toLowerCase()))
    ?? matches[0]
    ?? command
  executableCache.set(command, resolved)
  return resolved
}

/**
 * Resolve an npm-generated dsh.cmd shim to its JavaScript entry point. This
 * avoids Node's shell=true argument concatenation warning and keeps every
 * launcher argument as a distinct process argument on Windows.
 */
export function resolveDshInvocation(command) {
  let resolved = command
  if (process.platform === 'win32' && extname(command) === '' && basename(command) === command) {
    resolved = resolveExecutableOnPath(command)
  }
  if (process.platform !== 'win32' || extname(resolved).toLowerCase() !== '.cmd') {
    return { command: resolved, prefixArgs: [] }
  }

  const binDirectory = dirname(resolve(resolved))
  const candidates = [
    join(binDirectory, '..', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    join(binDirectory, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  ]
  const entry = candidates.find(candidate => existsSync(candidate))
  if (entry === undefined) return { command: resolved, prefixArgs: [] }
  return { command: process.execPath, prefixArgs: [entry] }
}
