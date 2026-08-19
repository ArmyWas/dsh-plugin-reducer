import { reduceProfile } from 'dsh-plugin-reducer'

const dshHome = process.env.DSH_HOME
const profile = process.env.DSH_PROFILE ?? 'web'

if (!dshHome) {
  console.error('Set DSH_HOME to the Harness home you want to diagnose.')
  process.exitCode = 2
} else {
  const { report } = await reduceProfile({
    dshHome,
    profile,
    dshCommand: process.env.DSH_COMMAND ?? 'dsh',
    probe: 'web',
    command: [],
    timeoutMs: 30_000,
    settleMs: 750,
    repeat: 1,
    maxTrials: 256,
    keepLab: false,
    cwd: process.cwd(),
  })

  process.stdout.write(`${JSON.stringify({
    profile,
    minimalFailingSet: report.result.minimalFailingSet,
    oneMinimal: report.result.oneMinimal,
    report,
  })}\n`)
}
