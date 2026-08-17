# RFC: reproducible plugin-set reduction for DeepSeek Harness

Status: proposal for community and maintainer discussion.

The official repository's current
[contribution policy](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md)
states that external pull requests are not accepted. This document is therefore
discussion material, not a prewritten core PR. Any upstream implementation
should begin only after maintainer direction.

## Summary

Add an official diagnostic path that can reduce a failing Harness profile to a
1-minimal set of out-of-tree bundles. The current external prototype demonstrates
the workflow without changing Harness core. This RFC asks first for stable,
machine-readable seams and documentation; adopting the whole implementation is
optional.

## Problem

Harness profiles compose ordered bundle layers. With many community bundles, a
failure report often says only "it works after I disable some plugins." Manual
one-by-one checks are slow and miss pair/trio interactions. Running the
diagnostic inside the normal plugin tree is unreliable when that tree cannot
load.

## Demonstrated behavior

The prototype creates a shadow `DSH_HOME`, keeps installation-owned bundles
fixed, and reduces only names present in both the profile bundle list and
dependency map. A real rc.7 test found an A+B duplicate-tool interaction in six
configurations while A and B each passed alone. The source profile fingerprint
did not change.

## Proposed user experience

One possible first-party surface:

```sh
dsh plugin --profile web reduce --probe web --report reducer-report.json
```

Expected guarantees:

- full set must fail and empty out-of-tree baseline must pass;
- inconsistent probes are unresolved, never removal evidence;
- output is 1-minimal and says explicitly that this is not global minimality;
- no package installation or source-profile rewrite, and a fresh shadow home for
  every probe attempt;
- report is local by default and scrubbed before sharing.

## Small upstream seams

The external tool currently reads the documented profile manifest directly.
The most useful low-risk upstream changes would be:

1. A machine-readable profile inspection command that reports ordered bundles,
   which bundles are installation-owned, and dependency/package metadata.
2. A documented way to launch a profile against an alternate `DSH_HOME` with a
   random loopback port and machine-readable readiness output.
3. A versioned diagnostic report envelope shared by doctors, repro exporters,
   and reducers: Harness version, profile, platform, redaction declaration,
   source-unchanged evidence, and tool-specific results.
4. A documentation link from troubleshooting to external reducers while usage
   evidence accumulates.

These seams reduce coupling even if `dsh-plugin-reducer` remains a community
tool.

## Why not automatic repair?

A minimal failure set establishes evidence and ownership; it does not prove
which member is wrong or whether removing one is semantically safe. Repair and
quarantine should stay separate, explicit actions handled by existing guard
tools or by the user.

## Privacy and execution model

The report is never uploaded automatically. Known credential forms and absolute
paths are scrubbed, but users must still review it. Plugins and probes execute
with normal user permissions; the shadow home is configuration isolation, not a
security sandbox.

## Open questions for maintainers

1. Is `dependencies ∩ dsh.profile.bundles` the intended stable definition of an
   out-of-tree reducible bundle?
2. Should ordered layer failures eventually support prefix/order reduction in
   addition to set reduction?
3. Which readiness signal can be considered stable and machine-readable?
4. Would maintainers prefer an official subcommand, a supported library API, or
   a documented external-tool contract?
5. Is a shared diagnostic report envelope useful across the existing doctor,
   guard, and repro ecosystem?
