#!/usr/bin/env node

import { HELP, VERSION, parseArgs } from '../src/args.js'
import { ReducerError, listCandidates, reduceProfile, TrialLimitError } from '../src/index.js'
import {
  candidateListSuccess,
  jsonLine,
  machineError,
  reductionSuccess,
} from '../src/machine-output.js'
import { writeReport } from '../src/report.js'

function formatSet(items) {
  if (items.length === 0) return '(none)'
  if (items.length <= 4) return items.join(', ')
  return `${items.slice(0, 3).join(', ')}, … (+${items.length - 3})`
}
function printError(error) {
  if (error instanceof ReducerError) {
    process.stderr.write(`dsh-plugin-reducer: ${error.message} [${error.code}]\n`)
  } else if (error instanceof TrialLimitError) {
    process.stderr.write(`dsh-plugin-reducer: ${error.message}; raise --max-trials if the probe is stable\n`)
  } else {
    process.stderr.write(`dsh-plugin-reducer: ${error.message ?? String(error)}\n`)
  }
}

const rawArgs = process.argv.slice(2)
const wantsJson = rawArgs.includes('--json')
const requestedOperation = rawArgs.includes('--list-candidates') ? 'list-candidates' : 'reduce'
let options
try {
  options = parseArgs(rawArgs)
} catch (error) {
  if (wantsJson) process.stdout.write(jsonLine(machineError(requestedOperation, error, { invalidArguments: true })))
  else {
    printError(error)
    process.stderr.write('Run dsh-plugin-reducer --help for usage.\n')
  }
  process.exitCode = 2
}

if (options !== undefined) {
  if (options.help) process.stdout.write(HELP)
  else if (options.version) process.stdout.write(`${VERSION}\n`)
  else if (options.listCandidates) {
    try {
      const candidates = await listCandidates({ dshHome: options.dshHome, profile: options.profile })
      if (options.json) {
        process.stdout.write(jsonLine(candidateListSuccess(options.profile, candidates)))
      } else {
        for (const candidate of candidates) process.stdout.write(`${candidate}\n`)
      }
    } catch (error) {
      if (options.json) process.stdout.write(jsonLine(machineError('list-candidates', error)))
      else printError(error)
      process.exitCode = 1
    }
  } else {
    try {
      const result = await reduceProfile({ ...options, cwd: process.cwd() }, {
        onLab: event => {
          if (!options.quiet && !options.json) {
            process.stderr.write(`Shadow lab ready; reducing ${event.candidateCount} candidate bundle(s).\n`)
          }
        },
        onTrial: trial => {
          if (options.quiet || options.json) return
          const duration = trial.attempts.reduce((sum, attempt) => sum + attempt.durationMs, 0)
          process.stderr.write(
            `#${trial.id} ${trial.outcome.toUpperCase().padEnd(10)} `
            + `${trial.activeBundles.length} active, ${duration} ms: ${formatSet(trial.activeBundles)}\n`,
          )
        },
      })

      let reportPath
      if (options.report !== undefined) {
        reportPath = await writeReport(options.report, result.report, { overwrite: options.force })
      }
      if (options.json) {
        process.stdout.write(jsonLine(reductionSuccess(result.report)))
      } else {
        const minimal = result.report.result.minimalFailingSet
        process.stdout.write(`Minimal failing set (${minimal.length}):\n`)
        for (const bundle of minimal) process.stdout.write(`  - ${bundle}\n`)
        process.stdout.write(
          `Verified 1-minimal: ${result.report.result.oneMinimal ? 'yes' : 'no'}; `
          + `${result.report.result.distinctConfigurationsTested} configuration(s) tested.\n`,
        )
        if (!result.report.safety.sourceProfileUnchanged) {
          process.stdout.write('Warning: the source profile changed externally during the run.\n')
        }
        if (result.labPath !== null) process.stdout.write(`Shadow lab kept at: ${result.labPath}\n`)
        if (reportPath !== undefined) process.stdout.write(`Report: ${reportPath}\n`)
      }
    } catch (error) {
      if (options.json) process.stdout.write(jsonLine(machineError('reduce', error)))
      else printError(error)
      process.exitCode = 1
    }
  }
}
