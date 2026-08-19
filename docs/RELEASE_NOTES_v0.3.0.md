# dsh-plugin-reducer v0.3.0

This release turns the reducer's proven diagnostic core into a stable ecosystem
integration surface.

## New

- `--json` returns one versioned, schema-backed envelope on stdout.
- Success, invalid arguments, and execution failures are all machine-readable.
- `--list-candidates --json` exposes the read-only scope preview through the
  same contract.
- JSON mode suppresses human progress output and redacts local paths in errors.
- The Node library API and CLI now have a cross-platform integration guide.

## Why

The first external integration attempt correctly identified the reducer as a
useful ecosystem primitive, but assumed an npm package, `which`, `/tmp`, a
`--json` flag, and a result shape that did not exist. The core algorithm was not
the problem; the missing integration contract was. This release closes that
gap without changing the reducer's safety boundary or human CLI output.

## Verification

- 38 automated tests, including four machine-contract end-to-end tests.
- Windows, macOS, and Linux CI on Node.js 22.19 and 24.
- Package dry run and GitHub release install smoke test.
- Source profile remains byte-for-byte unchanged during JSON-mode reduction.

## Install

```sh
npm install --save-exact \
  https://github.com/ArmyWas/dsh-plugin-reducer/releases/download/v0.3.0/dsh-plugin-reducer-0.3.0.tgz
```

Then run:

```sh
dsh-plugin-reducer --json --profile web --probe web
```
