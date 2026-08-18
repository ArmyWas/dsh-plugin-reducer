# Product brief: dsh-plugin-reducer

## One-line promise

Turn “my Harness profile breaks with many plugins installed” into “these one or
two plugins are sufficient to reproduce it,” without trial-and-error edits to
the real profile.

## User and job

Primary users are Harness plugin users, plugin authors, and maintainers handling
bug reports. Their job is not merely to make Harness boot again; it is to reduce
a reproducible failure until ownership and next action become obvious.

The painful case is interaction failure. Sequentially disabling one plugin at a
time can conclude that every plugin is healthy even though a pair or trio is
incompatible.

## Product decision

The first release is an external CLI, not an in-process Harness plugin. A
diagnostic component that depends on the failing plugin tree may disappear at
the moment it is needed most. External execution also allows every trial to use
a fresh Harness process and a disposable home.

The unit of reduction is an out-of-tree profile bundle: a name present in both
the profile's ordered bundle list and its dependency map. Built-in bundles stay
fixed because they belong to the Harness installation, not the user's plugin
selection.

## Core loop

1. Prove the full candidate set fails.
2. Prove the empty candidate baseline passes.
3. Test complements and subsets with delta debugging, using a fresh shadow home
   for every probe attempt.
4. Treat inconsistent repeated probes as unresolved.
5. Verify that removing any one final item stops the failure.
6. Emit a reviewable report and verify the source-profile fingerprint.

## Non-goals for 0.1

- Repairing or quarantining plugins.
- Replacing startup guards, plugin managers, doctors, or repro exporters.
- Reducing built-in Harness components or arbitrary individual Cordis rows.
- Claiming a globally minimum set.
- Sandboxing untrusted plugin code.
- Automatically uploading diagnostics.

## Success measures

For the first public milestone:

- Detect the known A+B interaction fixture on all three desktop operating
  systems.
- Never mutate source profile configuration in reducer-owned code paths.
- Produce a report with no known absolute local paths or common token forms.
- Receive at least three real-world reports that either isolate a plugin or
  correctly prove the failure is outside the out-of-tree candidate set.
- Convert one maintainer conversation into an agreed machine-readable profile
  inspection/reporting seam, whether or not the whole CLI moves upstream.

## Roadmap, gated by evidence

1. **0.1:** config/Web/custom probes, 1-minimal sets, scrubbed reports.
2. **0.2:** a zero-probe candidate preview, added after hands-on use showed that
   users need to verify scope before starting a reduction.
3. **0.3:** ordered-prefix reduction for order-sensitive layer bugs and a report
   viewer, only after real reports show demand.
4. **0.4:** optional session-level oracle adapter and CI reproduction action.
4. **Upstream:** standardize profile inspection and diagnostic report metadata;
   consider an official `dsh plugin reduce` command after cross-platform usage.

The roadmap intentionally avoids building a marketplace, manager, or generic
doctor: those areas already have active projects.
