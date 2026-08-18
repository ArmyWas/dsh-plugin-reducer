# dsh-plugin-reducer

[简体中文](README.zh-CN.md)

**Your DeepSeek Harness profile is broken. Which plugins are actually required
to reproduce it?**

`dsh-plugin-reducer` is an unofficial, external diagnostic CLI that finds a
**1-minimal failure-inducing set** of out-of-tree bundles in a DeepSeek Harness
profile. It tests disposable shadow profiles, so it does not rewrite the real
profile while searching.

![A real rc.7 run reducing three candidate bundles to an interacting pair](assets/demo.png)

It catches interaction failures that "disable plugins one by one" misses. If A
works, B works, and A+B fails, the result is `{A, B}`.

> Early preview: tested against `@deepseek-ai/dsh@0.1.0-rc.7` on Windows with
> Node.js 24. The repository CI also targets Windows, macOS, and Linux on the
> Node.js versions supported by Harness.

Found a real profile failure? [Open a redacted field report](https://github.com/ArmyWas/dsh-plugin-reducer/issues/new?template=field-report.yml).

## Why this exists

A profile can contain dozens of bundles. Startup guards can recover a broken
profile, doctors can identify common problems, and repro tools can collect a
session. None of those answers the narrower question:

> What is the smallest plugin set I must give an author so this exact failure
> still happens?

The reducer turns a large, private profile into a small, evidence-backed plugin
set and a scrubbed JSON report suitable for an issue.

## Quick start

From a source checkout:

```sh
git clone https://github.com/ArmyWas/dsh-plugin-reducer.git
cd dsh-plugin-reducer
npm install
npm test
npm link
dsh-plugin-reducer --profile web --probe web --report reducer-report.json
```

After an npm release, the same run can use `npx`:

```sh
npx dsh-plugin-reducer@latest --profile web --probe web \
  --report reducer-report.json
```

If Harness lives outside `PATH`, point to it explicitly:

```sh
dsh-plugin-reducer --dsh /path/to/dsh --profile web --probe web
```

The tool reads `DSH_HOME` from the environment, or accepts `--dsh-home`.

## List candidates

Before spending probe runs, see exactly which out-of-tree bundles the reducer
would consider. `--list-candidates` reads the profile manifest, prints one
bundle name per line, and exits 0:

```sh
dsh-plugin-reducer --list-candidates --profile web
```

```text
plugin-a
plugin-b
plugin-c
```

This is a read-only listing: it does not create a shadow `DSH_HOME`, does not
run any probe, and does not require the `dsh` executable to be installed or on
`PATH`. Probe-only options and a command after `--` are rejected instead of
being silently ignored.

## What a run does

1. Reads `$DSH_HOME/profiles/<name>/package.json`.
2. Treats names present in both `dsh.profile.bundles` and `dependencies` as
   reducible, out-of-tree candidates. Installation-owned bundles stay fixed.
3. Creates a fresh temporary shadow `DSH_HOME` for every probe attempt and links
   its profile to the existing `node_modules` tree. It installs nothing.
4. Runs the selected probe against subsets and complements using delta
   debugging.
5. Verifies the result by removing each remaining bundle once.
6. Optionally writes a secret- and path-scrubbed JSON report.

Example result:

```text
Minimal failing set (2):
  - plugin-a
  - plugin-b
Verified 1-minimal: yes; 6 configuration(s) tested.
```

"1-minimal" means removing any one reported bundle stops reproducing the
failure. It does not claim the set is the globally smallest possible set.

## Probes

| Probe | Pass condition | Best for |
| --- | --- | --- |
| `config` (default) | `dsh --dump-config` exits 0 | Manifest and layer-composition failures |
| `web` | A random loopback URL answers HTTP and survives the settle window | Plugin loading and startup crashes |
| custom command | The supplied command exits 0 | A precise regression, test, or workflow |

For a custom probe, put the command after `--`. The child receives the shadow
home in `DSH_HOME`:

```sh
dsh-plugin-reducer --profile web --timeout 60000 -- node reproduce.mjs
```

The oracle should exit non-zero only when the target failure is reproduced;
unrelated command errors are also classified as failures, so keep it specific.

For flaky failures, repeat every configuration. Mixed outcomes are marked
`unresolved` and are never used as evidence to remove a plugin:

```sh
dsh-plugin-reducer --profile web --probe web --repeat 3 --max-trials 512
```

Run `dsh-plugin-reducer --help` for all options.

Add `--keep-lab` to retain a clean shadow home configured with the final minimal
set for manual inspection. Probe-attempt labs are still removed.

## Safety boundary

- The CLI writes candidate changes only inside a temporary shadow home.
- Every probe attempt receives a fresh shadow home, preventing state written by
  one tested configuration from contaminating the next.
- It fingerprints the source profile manifest and patch files before and after
  the run and records whether they changed externally.
- It reuses installed packages and never invokes a package manager or install
  script.
- It does not copy `.env`, sessions, storage, or workspace data into the lab.
- Reports replace known local roots and fallback absolute paths, and redact
  common token forms and secret-shaped fields.

This is a diagnostic isolation mechanism, **not a security sandbox**. Installed
plugins and custom probes execute with the current user's permissions and may
access the network, inherited environment variables, or files they could access
in a normal Harness run. Review [SECURITY.md](SECURITY.md) before running
untrusted code.

## Scope and limits

- The failure must reproduce consistently in the shadow profile.
- Built-in bundles and profile/home patches remain fixed; if the empty
  out-of-tree baseline fails, the reducer stops with `BASELINE_FAILS`.
- Packages installed only as libraries, not listed as bundle layers, are not
  candidates.
- The Web probe tests startup readiness, not a complete interactive agent flow.
- The algorithm optimizes diagnostic effort and 1-minimality, not proof of a
  globally minimum set.

## How this differs from existing projects

| Project | Primary job | Relationship to this project |
| --- | --- | --- |
| [dsh-startup-guard](https://github.com/aokamoaki/dsh-startup-guard) | Preflight, recovery, snapshots, quarantine | Recover first; reduce a stable reproduction afterward |
| [dsh-boot-guard](https://github.com/SaiSenBox/dsh-boot-guard) | Loader-independent manual rescue and plugin skipping | Restore control; it does not search interaction sets |
| [dsh-repro](https://github.com/EvilIrving/dsh-repro) | Export a scrubbed session/command/git-diff reproduction | Capture session context; reducer minimizes profile bundles |
| [dsh-builtin-toggles](https://github.com/Starfie1d1272/dsh-builtin-toggles) | Inspect and toggle built-in capabilities | Runtime inspection rather than failure-set reduction |

The [ecosystem review](docs/ECOSYSTEM_REVIEW.md) records the search and the
decision boundary. This tool is designed to complement those projects, not
replace them.

## Project evidence and design

- [Real Harness interaction test](docs/REAL_HARNESS_TEST.md)
- [Real Harness dogfood report for `--list-candidates`](docs/HARNESS_DOGFOOD.md)
- [Product brief](docs/PRODUCT.md)
- [Report JSON Schema](schemas/dsh-plugin-reducer-report.schema.json)
- [Upstream RFC](docs/UPSTREAM_RFC.md)
- [Community launch kit](docs/COMMUNITY_LAUNCH.md)
- [GitHub publication runbook](docs/PUBLISH_RUNBOOK.md)
- [Official Discussion draft](docs/OFFICIAL_DISCUSSION.md)
- [v0.1.0 release notes](docs/RELEASE_NOTES_v0.1.0.md)
- [v0.2.0 release notes](docs/RELEASE_NOTES_v0.2.0.md)
- [Contributing](CONTRIBUTING.md)

DeepSeek Harness is a trademark of its respective owner. This project is not
affiliated with or endorsed by DeepSeek.
