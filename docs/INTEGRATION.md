# Integration contract

`dsh-plugin-reducer` supports two stable integration surfaces. Prefer the
library API from Node.js. Use the CLI JSON envelope from other runtimes.

## Install the pinned preview

Pin the exact npm version rather than calling an unversioned package name:

```sh
npm install --save-exact dsh-plugin-reducer@0.3.1
```

Consumers that vendor artifacts can instead use the matching GitHub Release
URL and verify its published `.sha256` file:

```text
https://github.com/ArmyWas/dsh-plugin-reducer/releases/download/v0.3.1/dsh-plugin-reducer-0.3.1.tgz
```

## Node library API

```js
import { reduceProfile } from 'dsh-plugin-reducer'

const { report } = await reduceProfile({
  dshHome: process.env.DSH_HOME,
  profile: 'web',
  dshCommand: 'dsh',
  probe: 'web',
  command: [],
  timeoutMs: 30_000,
  settleMs: 750,
  repeat: 1,
  maxTrials: 256,
  keepLab: false,
  cwd: process.cwd(),
})

const minimalSet = report.result.minimalFailingSet
```

The library returns the same secret- and path-scrubbed report described by
`schemas/dsh-plugin-reducer-report.schema.json`.

## CLI JSON envelope

```sh
dsh-plugin-reducer --json --dsh-home /path/to/.dsh \
  --profile web --probe web
```

Success:

```json
{
  "schemaVersion": 1,
  "tool": { "name": "dsh-plugin-reducer", "version": "0.3.1" },
  "operation": "reduce",
  "ok": true,
  "report": { "result": { "minimalFailingSet": ["plugin-a"] } }
}
```

Failure:

```json
{
  "schemaVersion": 1,
  "tool": { "name": "dsh-plugin-reducer", "version": "0.3.1" },
  "operation": "reduce",
  "ok": false,
  "error": { "code": "FULL_SET_PASSES", "message": "..." }
}
```

The real success envelope contains the complete report. JSON mode writes one
line to stdout and no progress to stderr. If `--report <path>` is also present,
the file contains exactly the object found at `envelope.report`.

| Exit | Meaning |
| --- | --- |
| `0` | Operation succeeded; `ok` is `true` |
| `1` | Profile, probe, or reduction failed; `ok` is `false` |
| `2` | Arguments were invalid; `error.code` is `INVALID_ARGUMENT` |

`--list-candidates --json` returns `operation: "list-candidates"`, the profile
name, and a `candidates` array. The common envelope is defined by
`schemas/dsh-plugin-reducer-machine-output.schema.json`.

## Cross-platform rules

- Pass arguments as an array with shell execution disabled. Never interpolate
  `profile`, `dshHome`, or report paths into a shell string.
- Use `node:os` `tmpdir()` plus `node:path` `join()` for report paths. Do not
  hard-code `/tmp`.
- Treat `--profile` as a profile **name**, such as `web`. Pass the containing
  Harness home through `--dsh-home` or `DSH_HOME`.
- Do not use `which` as an availability check. Depend on the package directly,
  import the library, or execute the dependency's package bin.
- Read `report.result.minimalFailingSet`; there is no top-level `minimalSet`.
- A failed external integration must remain a failed or skipped integration;
  it must not be reported as a successful security check.

These rules are covered by Windows, macOS, and Linux CI plus CLI contract tests.
