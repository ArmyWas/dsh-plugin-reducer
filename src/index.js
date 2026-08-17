import { spawnSync } from 'node:child_process'
import { resolve, sep } from 'node:path'
import { ddmin, Outcome, TrialLimitError } from './ddmin.js'
import { resolveDshInvocation } from './dsh-command.js'
import { createProbeRunner } from './probe.js'
import { createShadowLab, inspectProfile, profileFingerprint } from './profile-lab.js'
import { buildReport } from './report.js'

export class ReducerError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'ReducerError'
    this.code = code
    this.details = details
  }
}

function detectDshVersion(command) {
  const dsh = resolveDshInvocation(command)
  const result = spawnSync(dsh.command, [...dsh.prefixArgs, '--version'], {
    encoding: 'utf8',
    timeout: 10_000,
    windowsHide: true,
  })
  if (result.status !== 0) return null
  const version = result.stdout.trim().split(/\s+/)[0]
  return version || null
}

function dshNodeModulesRoot(command) {
  const invocation = resolveDshInvocation(command)
  const entry = invocation.prefixArgs.find(argument => argument.includes(`${sep}node_modules${sep}`))
  if (entry === undefined) return null
  const marker = `${sep}node_modules${sep}`
  return entry.slice(0, entry.indexOf(marker) + marker.length - 1)
}

function classifyAttempts(attempts) {
  if (attempts.every(attempt => attempt.pass)) return Outcome.PASS
  if (attempts.every(attempt => !attempt.pass)) return Outcome.FAIL
  return Outcome.UNRESOLVED
}

function trialSummary(trial) {
  return {
    id: trial.id,
    activeBundles: trial.activeBundles,
    outcome: trial.outcome,
    attempts: trial.attempts.map(attempt => ({
      pass: attempt.pass,
      reason: attempt.reason,
      exitCode: attempt.exitCode,
      signal: attempt.signal,
      durationMs: attempt.durationMs,
      stdout: attempt.stdout,
      stderr: attempt.stderr,
      ...(attempt.url !== undefined ? { url: attempt.url, httpStatus: attempt.httpStatus } : {}),
    })),
  }
}

export async function reduceProfile(options, hooks = {}) {
  const profileInfo = await inspectProfile({ dshHome: options.dshHome, profile: options.profile })
  if (profileInfo.candidates.length === 0) {
    throw new ReducerError(
      'NO_CANDIDATES',
      `profile ${options.profile} has no out-of-tree bundle dependencies to reduce`,
    )
  }

  const runner = createProbeRunner({
    kind: options.probe,
    profile: options.profile,
    dshCommand: options.dshCommand,
    command: options.command,
    timeoutMs: options.timeoutMs,
    settleMs: options.settleMs,
    cwd: options.cwd ?? process.cwd(),
  })
  const trials = []
  const cache = new Map()
  const labRoots = []
  let labAnnounced = false

  const evaluate = async activeBundles => {
    const ordered = profileInfo.candidates.filter(bundle => activeBundles.includes(bundle))
    const key = JSON.stringify(ordered)
    if (cache.has(key)) return cache.get(key)
    if (trials.length >= options.maxTrials) throw new TrialLimitError(options.maxTrials)

    const attempts = []
    for (let run = 0; run < options.repeat; run += 1) {
      const attemptLab = await createShadowLab(profileInfo)
      labRoots.push(attemptLab.root)
      if (!labAnnounced) {
        labAnnounced = true
        hooks.onLab?.({ path: attemptLab.root, candidateCount: profileInfo.candidates.length })
      }
      try {
        await attemptLab.writeBundles(ordered)
        attempts.push(await runner(attemptLab.root))
      } finally {
        await attemptLab.dispose()
      }
    }
    const outcome = classifyAttempts(attempts)
    const trial = {
      id: trials.length + 1,
      activeBundles: ordered,
      outcome,
      attempts,
    }
    trials.push(trial)
    cache.set(key, outcome)
    hooks.onTrial?.(trial)
    return outcome
  }

  const fullOutcome = await evaluate(profileInfo.candidates)
  if (fullOutcome === Outcome.PASS) {
    throw new ReducerError(
      'FULL_SET_PASSES',
      'the full plugin set did not reproduce the failure; check the probe command or choose --probe web',
    )
  }
  if (fullOutcome === Outcome.UNRESOLVED) {
    throw new ReducerError(
      'FULL_SET_UNRESOLVED',
      'the full plugin set produced inconsistent results; increase --repeat or stabilize the probe',
    )
  }

  const baselineOutcome = await evaluate([])
  if (baselineOutcome === Outcome.FAIL) {
    throw new ReducerError(
      'BASELINE_FAILS',
      'the failure still occurs with every candidate removed, so it is not isolated to out-of-tree bundles',
    )
  }
  if (baselineOutcome === Outcome.UNRESOLVED) {
    throw new ReducerError(
      'BASELINE_UNRESOLVED',
      'the no-plugin baseline produced inconsistent results; increase --repeat or stabilize the probe',
    )
  }

  const reduced = await ddmin(profileInfo.candidates, evaluate, {
    maxOracleCalls: options.maxTrials,
  })
  const finalOutcome = await evaluate(reduced.minimal)
  if (finalOutcome !== Outcome.FAIL) {
    throw new ReducerError('FINAL_NOT_REPRODUCIBLE', 'the reduced set no longer reproduces consistently')
  }

  const removalChecks = []
  for (const bundle of reduced.minimal) {
    const withoutBundle = reduced.minimal.filter(value => value !== bundle)
    removalChecks.push({
      removed: bundle,
      outcome: await evaluate(withoutBundle),
    })
  }
  const oneMinimal = removalChecks.every(check => check.outcome !== Outcome.FAIL)
  let keptLab = null
  if (options.keepLab) {
    keptLab = await createShadowLab(profileInfo, { keep: true })
    await keptLab.writeBundles(reduced.minimal)
    labRoots.push(keptLab.root)
  }
  const endingFingerprint = await profileFingerprint(profileInfo.profileDirectory, profileInfo.dshHome)
  const report = buildReport({
    dsh: {
      version: detectDshVersion(options.dshCommand),
      profile: options.profile,
      candidateCount: profileInfo.candidates.length,
      fixedBundles: profileInfo.fixedBundles,
      candidates: profileInfo.packages,
    },
    probe: {
      kind: options.probe,
      command: options.probe === 'command' ? options.command : [options.dshCommand],
      timeoutMs: options.timeoutMs,
      settleMs: options.probe === 'web' ? options.settleMs : null,
      repeat: options.repeat,
    },
    result: {
      status: 'minimal-failure-set-found',
      minimalFailingSet: reduced.minimal,
      oneMinimal,
      removalChecks,
      distinctConfigurationsTested: trials.length,
      unresolvedConfigurations: trials.filter(trial => trial.outcome === Outcome.UNRESOLVED).length,
    },
    safety: {
      sourceFingerprintBefore: profileInfo.fingerprint,
      sourceFingerprintAfter: endingFingerprint,
      sourceProfileUnchanged: profileInfo.fingerprint === endingFingerprint,
      credentialStoresCopied: false,
      sessionsCopied: false,
      packagesInstalled: false,
      isolatedAttempts: true,
      reportRedactionApplied: true,
      shadowLabKept: options.keepLab,
      shadowLab: keptLab?.root ?? null,
    },
    trials: trials.map(trialSummary),
  }, {
    sourceHome: profileInfo.dshHome,
    labHome: labRoots[0],
    paths: [
      ...labRoots.slice(1).map(path => [path, '$REDUCER_LAB']),
      [resolve(options.cwd ?? process.cwd()), '$WORKING_DIRECTORY'],
      [dshNodeModulesRoot(options.dshCommand), '$DSH_NODE_MODULES'],
    ],
  })

  return { report, labPath: keptLab?.root ?? null }
}

export { Outcome, TrialLimitError } from './ddmin.js'
export { inspectProfile, resolveDshHome } from './profile-lab.js'
