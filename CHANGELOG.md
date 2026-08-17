# Changelog

## 0.1.0 - Unreleased

- Create a fresh disposable shadow profile per probe attempt without copying
  known credential stores or session data.
- Reduce reproducible failures to a 1-minimal set of out-of-tree profile bundles.
- Support config, Web boot, and arbitrary command probes.
- Cache trials, classify inconsistent repeated probes as unresolved, and cap trial count.
- Emit secret-scrubbed JSON reports while leaving the source profile untouched.
