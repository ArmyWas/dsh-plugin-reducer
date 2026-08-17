# Real Harness interaction test

Test date: 2026-08-17.

## Environment

- DeepSeek Harness: `@deepseek-ai/dsh@0.1.0-rc.7` (`next` at test time)
- Node.js: `v24.14.1`
- OS: Windows x64
- Probe: Web startup on a random loopback port, 12-second timeout, 350-ms
  post-readiness settle window

## Fixture

Three local bundle packages were installed into an isolated `web` profile using
the official `dsh plugin --profile web add` flow:

- `dsh-reducer-fixture-a` registers a global tool with a fixed name.
- `dsh-reducer-fixture-b` registers a second global tool with the same name.
- `dsh-reducer-fixture-c` is a no-op.

A and B each start successfully alone. Together they trigger Harness's duplicate
tool registration error. C is irrelevant. This specifically tests a failure
that naive one-at-a-time diagnosis can miss.

## Result

```text
#1 FAIL       3 active: fixture-a, fixture-b, fixture-c
#2 PASS       0 active: (none)
#3 PASS       1 active: fixture-c
#4 FAIL       2 active: fixture-a, fixture-b
#5 PASS       1 active: fixture-b
#6 PASS       1 active: fixture-a

Minimal failing set (2):
  - dsh-reducer-fixture-a
  - dsh-reducer-fixture-b
Verified 1-minimal: yes; 6 configuration(s) tested.
```

The source profile fingerprint was identical before and after the run. The
generated report contained no drive letter, username, workspace path, or common
credential token; local roots in stack traces were replaced with stable labels.

The checked-in fixtures live under `test/real-fixtures/`. They are intentionally
not part of the normal CI profile installation because a full Harness install is
large; the algorithmic interaction case is covered by the network-free
integration test on every CI run.
