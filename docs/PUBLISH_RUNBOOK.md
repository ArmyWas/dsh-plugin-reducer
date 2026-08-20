# Release and publication runbook

This runbook covers releases after v0.3. Run it from the repository root on
Windows PowerShell. Stop on any failed gate; never publish npm or create a stable
GitHub release merely to increase a version number.

## 1. Verify identity and repository state

```powershell
gh auth status
gh api user --jq .login
git status --short
git fetch origin
git rev-list --left-right --count main...origin/main
```

The authenticated GitHub login must be `ArmyWas`, the worktree must be clean,
and local/remote `main` must agree.

## 2. Run release gates

```powershell
npm ci --ignore-scripts
npm run check
npm run pack:check
```

Confirm the six-job CI matrix and weekly upstream canary are green. For a stable
release, also verify every condition in
[`RELEASE_CRITERIA.md`](RELEASE_CRITERIA.md).

## 3. Build and hash the exact artifact

```powershell
$releaseRoot = Join-Path (Resolve-Path ..) 'release-smoke'
New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
npm pack --pack-destination $releaseRoot
$packagePath = Join-Path $releaseRoot 'dsh-plugin-reducer-<version>.tgz'
$packageHash = (Get-FileHash $packagePath -Algorithm SHA256).Hash.ToLowerInvariant()
"$packageHash  dsh-plugin-reducer-<version>.tgz" |
  Set-Content "$packagePath.sha256"
```

Review the dry-run file list and replace `<version>` explicitly. Do not select a
package with a wildcard.

## 4. Verify a disposable install

```powershell
$installRoot = Join-Path $releaseRoot 'install-check'
npm install --prefix $installRoot $packagePath
& (Join-Path $installRoot 'node_modules\.bin\dsh-plugin-reducer.cmd') --version
npm uninstall --prefix $installRoot dsh-plugin-reducer
```

## 5. Tag and create the GitHub release

Create an annotated tag from reviewed `main`, push that exact tag, then create a
GitHub release containing the tarball and SHA-256 file. Keep `--prerelease`
until the stable-release gates are met.

## 6. npm registry publication

The package declares public access and provenance. Before the first npm publish:

- authenticate the intended npm owner with two-factor authentication or a
  configured trusted publisher;
- confirm `npm whoami` and `npm view dsh-plugin-reducer` target the intended
  account/name;
- publish the exact reviewed commit/artifact with provenance;
- verify the registry integrity and run a disposable `npx --package` smoke test;
- only then replace README GitHub-tarball instructions with the npm command.

Until those checks succeed, the pinned GitHub Release is the supported install
source. Never claim an npm release before the registry returns it publicly.

## 7. Post-publication checks

- Repository, tag, release, checksum, and documentation links work signed out.
- Branch protection still requires the six CI contexts and resolved threads.
- Vulnerability alerts, Dependabot security updates, secret scanning, and push
  protection remain enabled.
- The official Harness discussion links the current release and evidence.
- The repository uses companion-tool topics, not the installable `dsh-plugin`
  topic.
