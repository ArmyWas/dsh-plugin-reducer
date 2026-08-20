# Changelog

## Unreleased

## 0.3.1 - 2026-08-21

- Put the verified GitHub release installation path in the primary quick start.
- Add a pinned, copyable Node consumer example for downstream integrations.
- Validate every tested machine envelope against the published JSON Schemas.
- Add weekly dependency maintenance and a scheduled
  `@deepseek-ai/dsh-app-boot@next` profile-layout canary.
- Add repository contribution and conduct templates.
- Clarify that the reducer is an external companion CLI rather than an
  installable Harness bundle, and publish the official maintainer discussion.
- Add an OIDC trusted-publishing workflow. New prereleases are published to the
  npm `next` channel with automatically generated provenance; a future stable
  release advances `latest` only after the independent field-evidence gate.

## 0.3.0 - 2026-08-19

- Add a stable `--json` envelope for reduction, candidate listing, and failures.
- Keep JSON stdout parseable by suppressing human progress in machine mode.
- Redact local paths from machine-readable error messages.
- Publish a JSON Schema and cross-platform library/CLI integration contract.
- Add end-to-end tests for success, argument errors, execution errors, report
  parity, and operation without `dsh` on `PATH`.

## 0.2.0 - 2026-08-18

- Add `--list-candidates` to preview the exact out-of-tree bundle set without
  creating a shadow home, running probes, or resolving the `dsh` executable.
- Reject probe-only options in listing mode so an ignored safety or output flag
  cannot mislead the caller.
- Add library and CLI coverage for empty profiles, source immutability, missing
  profiles, and operation without `dsh` on `PATH`.

## 0.1.0 - 2026-08-17

- Create a fresh disposable shadow profile per probe attempt without copying
  known credential stores or session data.
- Reduce reproducible failures to a 1-minimal set of out-of-tree profile bundles.
- Support config, Web boot, and arbitrary command probes.
- Cache trials, classify inconsistent repeated probes as unresolved, and cap trial count.
- Emit secret-scrubbed JSON reports while leaving the source profile untouched.
