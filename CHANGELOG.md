# Changelog

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
