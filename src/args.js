export const VERSION = '0.1.0'

export const HELP = `dsh-plugin-reducer ${VERSION}

Find a 1-minimal failure-inducing set of out-of-tree DeepSeek Harness
profile bundles without modifying the real profile.

Usage:
  dsh-plugin-reducer [options]
  dsh-plugin-reducer [options] -- <probe-command> [args...]

Options:
  --profile <name>       DSH profile to reduce (default: web)
  --dsh-home <path>      Source DSH_HOME (default: env DSH_HOME or ~/.dsh)
  --dsh <command>        dsh executable for config/web probes (default: dsh)
  --probe <kind>         config, web, or command (default: config)
  --timeout <ms>         Timeout for one probe attempt (default: 30000)
  --settle <ms>          Web-ready stability window (default: 750)
  --repeat <n>           Repeat each configuration; mixed results are unresolved
                         (default: 1)
  --max-trials <n>       Maximum distinct plugin configurations (default: 256)
  --report <path>        Write a secret-scrubbed JSON report
  --force                Allow --report to overwrite an existing file
  --keep-lab             Keep a final shadow DSH_HOME with the minimal set
  --quiet                Hide per-trial progress
  -h, --help             Show this help
  -V, --version          Show the version

Probe semantics:
  Exit code 0 means PASS; a non-zero exit or timeout means FAIL. The built-in
  web probe starts the profile on a random loopback port and requires an HTTP
  response plus the settle window. A custom command receives the shadow
  DSH_HOME through its environment.

Examples:
  dsh-plugin-reducer --profile web --probe web
  dsh-plugin-reducer --profile web --report reducer-report.json
  dsh-plugin-reducer --profile web -- node reproduce.mjs
`

function integer(value, option, minimum = 1) {
  if (!/^\d+$/.test(value)) throw new Error(`${option} must be an integer`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${option} must be at least ${minimum}`)
  }
  return parsed
}

export function parseArgs(argv) {
  const separator = argv.indexOf('--')
  const optionArgs = separator === -1 ? argv : argv.slice(0, separator)
  const command = separator === -1 ? [] : argv.slice(separator + 1)
  const options = {
    profile: 'web',
    dshHome: undefined,
    dshCommand: 'dsh',
    probe: 'config',
    timeoutMs: 30_000,
    settleMs: 750,
    repeat: 1,
    maxTrials: 256,
    report: undefined,
    force: false,
    keepLab: false,
    quiet: false,
    help: false,
    version: false,
    command,
  }
  let probeWasExplicit = false

  const takeValue = (index, option, inline) => {
    if (inline !== undefined) return { value: inline, next: index }
    if (index + 1 >= optionArgs.length) throw new Error(`${option} requires a value`)
    return { value: optionArgs[index + 1], next: index + 1 }
  }

  for (let index = 0; index < optionArgs.length; index += 1) {
    const raw = optionArgs[index]
    const equals = raw.indexOf('=')
    const option = equals === -1 ? raw : raw.slice(0, equals)
    const inline = equals === -1 ? undefined : raw.slice(equals + 1)

    if (option === '-h' || option === '--help') options.help = true
    else if (option === '-V' || option === '--version') options.version = true
    else if (option === '--force') options.force = true
    else if (option === '--keep-lab') options.keepLab = true
    else if (option === '--quiet') options.quiet = true
    else if (['--profile', '--dsh-home', '--dsh', '--probe', '--timeout', '--settle', '--repeat', '--max-trials', '--report'].includes(option)) {
      const taken = takeValue(index, option, inline)
      index = taken.next
      if (option === '--profile') options.profile = taken.value
      else if (option === '--dsh-home') options.dshHome = taken.value
      else if (option === '--dsh') options.dshCommand = taken.value
      else if (option === '--probe') {
        options.probe = taken.value
        probeWasExplicit = true
      } else if (option === '--timeout') options.timeoutMs = integer(taken.value, option)
      else if (option === '--settle') options.settleMs = integer(taken.value, option, 0)
      else if (option === '--repeat') options.repeat = integer(taken.value, option)
      else if (option === '--max-trials') options.maxTrials = integer(taken.value, option, 3)
      else if (option === '--report') options.report = taken.value
    } else {
      throw new Error(`unknown option: ${raw}`)
    }
  }

  if (command.length > 0) {
    if (probeWasExplicit && options.probe !== 'command') {
      throw new Error('a command after -- cannot be combined with --probe config or --probe web')
    }
    options.probe = 'command'
  }
  if (!['config', 'web', 'command'].includes(options.probe)) {
    throw new Error('--probe must be config, web, or command')
  }
  if (options.probe === 'command' && command.length === 0 && !options.help && !options.version) {
    throw new Error('--probe command requires a command after --')
  }
  return options
}
