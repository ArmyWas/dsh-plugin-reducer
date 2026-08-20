# Ecosystem review

Initial review: 2026-08-17. Refreshed: 2026-08-21 against Harness `next`
(`0.1.0-rc.8`) and current public ecosystem indexes.

## Question

Does the Harness ecosystem already have a tool that automatically finds a
1-minimal failure-inducing set of profile plugins, including interaction sets
where every member passes alone?

## Sources and method

The review covered:

- The official [DeepSeek Harness repository](https://github.com/deepseek-ai/deepseek-harness)
  and its current plugin packaging/profile documentation.
- The community [awesome-dsh-plugin catalog](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/README.md),
  searched for doctor, guard, repair, repro, conflict, bisect, delta debugging,
  minimal failing set, and Chinese equivalents.
- GitHub and npm exact-name searches for `dsh-plugin-reducer`, `dsh-plugin-bisect`,
  `dsh-ddmin`, and related terms.
- Public descriptions and source trees of the closest projects below.

No reviewed project matched the exact job, and the refreshed official source
still contains no ddmin/minimal-failing-plugin implementation. This remains a
time-bounded search result, not a claim that an unknown or later project cannot
exist.

The community catalog now indexes the repository but correctly excludes it from
its downstream installable-plugin market: this project intentionally remains an
external CLI so it can work when the plugin tree cannot load. The repository
therefore does not use the `dsh-plugin` GitHub topic and should be described as
Harness companion tooling rather than as a `dsh.bundle` package.

## Closest existing work

### dsh-startup-guard

[dsh-startup-guard](https://github.com/aokamoaki/dsh-startup-guard) focuses on
preflight checks, snapshots, repair, smoke tests, and quarantine. Its product
outcome is a recoverable/bootable profile. The reducer starts after there is a
stable failure and searches for the minimal reproducing bundle set.

### dsh-boot-guard

[dsh-boot-guard](https://github.com/SaiSenBox/dsh-boot-guard) provides a
loader-independent rescue route and manual plugin skipping. That is valuable
when the normal plugin system cannot start. It does not perform automated subset
or complement search.

### dsh-repro

[dsh-repro](https://github.com/EvilIrving/dsh-repro) exports secret-scrubbed
session context, failed commands, and git diff information. It reduces the cost
of communicating a coding/session reproduction; it does not minimize the
profile's active bundle set.

### dsh-builtin-toggles

[dsh-builtin-toggles](https://github.com/Starfie1d1272/dsh-builtin-toggles)
inspects and toggles built-in capabilities and exposes compatibility/provenance
information. The reducer instead treats installation bundles as fixed and
searches user-installed bundle interactions.

## Decision boundary

The project proceeds only within this gap:

- external even when the plugin tree is broken;
- automatic subset/complement search;
- explicit support for interaction failures;
- no repair, quarantine, marketplace, or plugin-management features;
- a shareable, scrubbed evidence report.

If an established project adds the same job with equivalent safety and
interaction handling, the preferred response is collaboration or upstreaming,
not parallel feature competition.
