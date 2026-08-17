import { spawn, spawnSync } from 'node:child_process'
import { extname } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { resolveDshInvocation, resolveExecutableOnPath } from './dsh-command.js'

const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024

function appendTail(current, chunk, limit) {
  const next = current + chunk.toString('utf8')
  return next.length <= limit ? next : next.slice(next.length - limit)
}

function needsWindowsShell(command) {
  if (process.platform !== 'win32') return false
  const extension = extname(command).toLowerCase()
  return extension === '' || extension === '.cmd' || extension === '.bat'
}

async function terminateProcessTree(child) {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    try { child.kill('SIGTERM') } catch {}
  }
  await delay(250)
  if (child.exitCode === null && child.signalCode === null) {
    try { process.kill(-child.pid, 'SIGKILL') } catch {
      try { child.kill('SIGKILL') } catch {}
    }
  }
}

function startManaged(command, args, options = {}) {
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  let stdout = ''
  let stderr = ''
  let combined = ''
  let closed = false
  let closeResult

  const executable = resolveExecutableOnPath(command)
  const child = spawn(executable, args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    detached: process.platform !== 'win32',
    shell: needsWindowsShell(executable),
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', chunk => {
    stdout = appendTail(stdout, chunk, maxOutputBytes)
    combined = appendTail(combined, chunk, maxOutputBytes)
    options.onOutput?.(combined)
  })
  child.stderr.on('data', chunk => {
    stderr = appendTail(stderr, chunk, maxOutputBytes)
    combined = appendTail(combined, chunk, maxOutputBytes)
    options.onOutput?.(combined)
  })

  const done = new Promise(resolve => {
    child.once('error', error => {
      closed = true
      closeResult = { code: null, signal: null, error }
      resolve(closeResult)
    })
    child.once('close', (code, signal) => {
      closed = true
      closeResult = { code, signal, error: null }
      resolve(closeResult)
    })
  })

  return {
    child,
    done,
    isClosed: () => closed,
    closeResult: () => closeResult,
    output: () => ({ stdout, stderr, combined }),
    terminate: () => terminateProcessTree(child),
  }
}

function resultFromManaged(managed, result, durationMs, timedOut = false) {
  const output = managed.output()
  const pass = !timedOut && result?.error == null && result?.code === 0
  return {
    pass,
    reason: timedOut
      ? 'timeout'
      : result?.error != null
        ? `spawn-error: ${result.error.message}`
        : `exit-${String(result?.code)}`,
    exitCode: result?.code ?? null,
    signal: result?.signal ?? null,
    durationMs,
    stdout: output.stdout,
    stderr: output.stderr,
  }
}

async function runToExit(command, args, options) {
  const startedAt = Date.now()
  const managed = startManaged(command, args, options)
  let timeoutHandle
  const timedOut = new Promise(resolve => {
    timeoutHandle = setTimeout(() => resolve(true), options.timeoutMs)
  })
  const winner = await Promise.race([
    managed.done.then(result => ({ kind: 'closed', result })),
    timedOut.then(() => ({ kind: 'timeout' })),
  ])
  clearTimeout(timeoutHandle)
  if (winner.kind === 'timeout') {
    await managed.terminate()
    return resultFromManaged(managed, managed.closeResult(), Date.now() - startedAt, true)
  }
  return resultFromManaged(managed, winner.result, Date.now() - startedAt)
}

function loopbackUrlFrom(text) {
  const matches = text.matchAll(/https?:\/\/[^\s\u001b]+/g)
  for (const match of matches) {
    try {
      const url = new URL(match[0])
      if (url.protocol !== 'http:') continue
      if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname)) continue
      return url.href
    } catch {
      // Continue scanning later URL-shaped output.
    }
  }
  return undefined
}

async function runWebBoot(command, args, options) {
  const startedAt = Date.now()
  let detectedUrl
  const managed = startManaged(command, args, {
    ...options,
    onOutput: combined => { detectedUrl ??= loopbackUrlFrom(combined) },
  })
  const deadline = startedAt + options.timeoutMs
  let responseStatus = null

  while (Date.now() < deadline) {
    if (managed.isClosed()) {
      const closed = await managed.done
      return {
        ...resultFromManaged(managed, closed, Date.now() - startedAt),
        pass: false,
        reason: 'exited-before-ready',
        url: detectedUrl ?? null,
        httpStatus: responseStatus,
      }
    }
    if (detectedUrl !== undefined) {
      try {
        const remaining = Math.max(100, Math.min(1000, deadline - Date.now()))
        const response = await fetch(detectedUrl, { signal: AbortSignal.timeout(remaining) })
        responseStatus = response.status
        if (response.ok) {
          await delay(options.settleMs)
          if (managed.isClosed()) {
            const closed = await managed.done
            return {
              ...resultFromManaged(managed, closed, Date.now() - startedAt),
              pass: false,
              reason: 'crashed-during-settle',
              url: detectedUrl,
              httpStatus: responseStatus,
            }
          }
          await managed.terminate()
          const output = managed.output()
          return {
            pass: true,
            reason: 'web-ready',
            exitCode: null,
            signal: null,
            durationMs: Date.now() - startedAt,
            stdout: output.stdout,
            stderr: output.stderr,
            url: detectedUrl,
            httpStatus: responseStatus,
          }
        }
      } catch {
        // The server may have printed its URL slightly before accepting HTTP.
      }
    }
    await delay(50)
  }

  await managed.terminate()
  const output = managed.output()
  return {
    pass: false,
    reason: detectedUrl === undefined ? 'startup-timeout' : 'http-timeout',
    exitCode: managed.closeResult()?.code ?? null,
    signal: managed.closeResult()?.signal ?? null,
    durationMs: Date.now() - startedAt,
    stdout: output.stdout,
    stderr: output.stderr,
    url: detectedUrl ?? null,
    httpStatus: responseStatus,
  }
}

export function createProbeRunner(options) {
  const baseEnvironment = {
    ...process.env,
    ...options.environment,
    DSH_TELEMETRY_DISABLED: '1',
    DSH_PLUGIN_REDUCER: '1',
  }

  return async shadowHome => {
    const environment = { ...baseEnvironment, DSH_HOME: shadowHome }
    if (options.kind === 'web') {
      const dsh = resolveDshInvocation(options.dshCommand)
      return runWebBoot(
        dsh.command,
        [...dsh.prefixArgs, '--profile', options.profile, '--host', '127.0.0.1', '--port', '0'],
        {
          cwd: options.cwd,
          env: environment,
          timeoutMs: options.timeoutMs,
          settleMs: options.settleMs,
        },
      )
    }
    if (options.kind === 'command') {
      return runToExit(options.command[0], options.command.slice(1), {
        cwd: options.cwd,
        env: environment,
        timeoutMs: options.timeoutMs,
      })
    }
    const dsh = resolveDshInvocation(options.dshCommand)
    return runToExit(
      dsh.command,
      [...dsh.prefixArgs, '--profile', options.profile, '--dump-config'],
      {
        cwd: options.cwd,
        env: environment,
        timeoutMs: options.timeoutMs,
      },
    )
  }
}
