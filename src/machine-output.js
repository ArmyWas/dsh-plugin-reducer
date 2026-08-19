import { VERSION } from './args.js'
import { TrialLimitError } from './ddmin.js'
import { ReducerError } from './index.js'
import { redactText } from './redact.js'

function base(operation, ok) {
  return {
    schemaVersion: 1,
    tool: {
      name: 'dsh-plugin-reducer',
      version: VERSION,
    },
    operation,
    ok,
  }
}

export function reductionSuccess(report) {
  return { ...base('reduce', true), report }
}

export function candidateListSuccess(profile, candidates) {
  return {
    ...base('list-candidates', true),
    profile,
    candidates: [...candidates],
  }
}

export function machineError(operation, error, { invalidArguments = false } = {}) {
  let code = invalidArguments ? 'INVALID_ARGUMENT' : 'EXECUTION_ERROR'
  if (error instanceof ReducerError) code = error.code
  else if (error instanceof TrialLimitError) code = 'TRIAL_LIMIT'

  return {
    ...base(operation, false),
    error: {
      code,
      message: redactText(error?.message ?? String(error)),
    },
  }
}

export function jsonLine(value) {
  return `${JSON.stringify(value)}\n`
}
