# dsh-plugin-reducer v0.2.0

This release adds a read-only scope preview before any reducer probes run.

## New

- `--list-candidates` prints the exact out-of-tree bundle names the reducer
  would consider, one per line.
- Listing mode creates no shadow `DSH_HOME`, runs no probe, and does not require
  a `dsh` executable.
- Probe-only options are rejected in listing mode instead of being ignored.

## Verification

- Full syntax and automated test suite.
- Package dry run.
- CLI checks for ordinary, empty, and missing profiles.
- Source-profile fingerprint and byte-for-byte manifest checks.
- Independent review of the implementation first produced by a real V4-Pro
  Harness session.

See [the dogfood report](HARNESS_DOGFOOD.md) for the measured run and the edge
case found during review.

## Install

```sh
npm install --global github:ArmyWas/dsh-plugin-reducer#v0.2.0
dsh-plugin-reducer --list-candidates --profile web
```
