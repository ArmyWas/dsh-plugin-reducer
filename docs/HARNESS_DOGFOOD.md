# Harness dogfood report: candidate preview

Test date: 2026-08-18.

## Why this change exists

Using the reducer exposed a trust gap before the expensive part of its workflow:
there was no command that showed the exact out-of-tree bundle set without also
starting a reduction. A user had to infer the set from a profile manifest or
begin a run that creates shadow homes and invokes probes.

`--list-candidates` closes that gap. It reads the selected profile, prints the
same candidate set the reducer would use, and exits without creating a lab,
running a probe, or resolving a `dsh` executable.

## Real Harness development run

The first implementation was produced in an isolated detached worktree through
the official `@deepseek-ai/dsh@0.1.0-rc.7` Web app using DeepSeek V4-Pro with
High reasoning. The task asked Harness to add the read-only flag, tests, and
bilingual documentation while touching only that worktree.

Harness completed the task in 6 minutes 50 seconds across 19 model steps and 45
tool calls. The exported session recorded 38,898 uncached input tokens, 799,616
cache-read input tokens, and 28,186 output tokens; the UI rounded these to 839K
input and 28.2K output with a 95% cache hit rate. At the official V4-Pro rates
published on the test date, that run is estimated at about CNY 0.31. No API key
or credential value was read or included in the report.

Three validation commands required separate approval because confined Windows
processes cannot capture piped output from restricted grandchildren. After
approval, Harness reported 20 passing tests and a successful package dry run.

## Independent review

The generated implementation had the right execution boundary and passed its
tests. Independent review found one product-quality gap: probe-only flags such
as `--report`, `--keep-lab`, or a command after `--` would have been accepted and
silently ignored in listing mode. The released implementation rejects those
combinations explicitly and adds tests for every conflicting option.

Final verification covers:

- library output for ordinary and empty candidate sets;
- CLI output and exit codes;
- operation without a `dsh` executable;
- source-profile immutability;
- missing-profile errors;
- rejection of every probe-only option in listing mode;
- the complete syntax, test, and package checks.

This is a real dogfood result, not a claim that Harness found an unknown bug on
its own. Harness implemented the scoped feature effectively; hands-on use and a
separate review supplied the product decision and the final edge-case hardening.
