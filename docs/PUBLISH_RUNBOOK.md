# GitHub publication runbook

This runbook is for the `ArmyWas/dsh-plugin-reducer` first public preview. Run
it from the repository root on Windows PowerShell. Stop on any failed command;
do not create a release or official Discussion until the pushed CI run is green.

## 1. Authenticate and confirm the target

```powershell
gh auth status
gh api user --jq .login
gh repo view ArmyWas/dsh-plugin-reducer
```

The last command is the one expected failure: it should report that the
repository does not exist before first publication. The authenticated login
must be `ArmyWas`.

## 2. Re-run local release gates

```powershell
git status --short
npm ci --ignore-scripts
npm run check
npm run pack:check
```

The worktree must be clean, all tests must pass, and the dry-run package must
contain `assets/demo.png`, the bilingual READMEs, schemas, and docs.

## 3. Create and push the public repository

```powershell
gh repo create ArmyWas/dsh-plugin-reducer `
  --public `
  --source . `
  --remote origin `
  --push `
  --description "Find a 1-minimal DeepSeek Harness plugin set that reproduces a profile failure."

gh repo edit ArmyWas/dsh-plugin-reducer `
  --add-topic deepseek-harness `
  --add-topic dsh-tooling `
  --add-topic delta-debugging `
  --add-topic plugin-debugging `
  --enable-issues
```

Do not add the `dsh-plugin` topic: the project is intentionally an external CLI,
not a package declaring `dsh.bundle`.

## 4. Verify remote state and CI

```powershell
git remote -v
git status --short
gh repo view ArmyWas/dsh-plugin-reducer --json url,visibility,defaultBranchRef,repositoryTopics
gh run list --repo ArmyWas/dsh-plugin-reducer --limit 5
$ciRunId = gh run list `
  --repo ArmyWas/dsh-plugin-reducer `
  --workflow CI `
  --limit 1 `
  --json databaseId `
  --jq '.[0].databaseId'
if (-not $ciRunId) { throw 'No CI run was found for the pushed commit' }
gh run watch $ciRunId --repo ArmyWas/dsh-plugin-reducer --exit-status
```

Required evidence: public visibility, `main` as the default branch, the four
topics above, a clean worktree, and a successful six-job OS/Node matrix.

## 5. Build the exact release asset

```powershell
New-Item -ItemType Directory -Force -Path ..\release-smoke | Out-Null
npm pack --pack-destination ..\release-smoke
$packagePath = Resolve-Path ..\release-smoke\dsh-plugin-reducer-0.1.0.tgz
$packageHash = (Get-FileHash $packagePath -Algorithm SHA256).Hash.ToLowerInvariant()
"$packageHash  dsh-plugin-reducer-0.1.0.tgz" |
  Set-Content ..\release-smoke\dsh-plugin-reducer-0.1.0.tgz.sha256
```

The package's `prepack` hook re-runs syntax and test gates. The checksum file is
uploaded beside the package so users can verify the exact asset.

## 6. Tag and create the prerelease

```powershell
git tag -a v0.1.0 -m "dsh-plugin-reducer v0.1.0"
git push origin v0.1.0

gh release create v0.1.0 `
  ..\release-smoke\dsh-plugin-reducer-0.1.0.tgz `
  ..\release-smoke\dsh-plugin-reducer-0.1.0.tgz.sha256 `
  --repo ArmyWas/dsh-plugin-reducer `
  --verify-tag `
  --prerelease `
  --title "dsh-plugin-reducer v0.1.0" `
  --notes-file docs/RELEASE_NOTES_v0.1.0.md
```

Verify the release and its asset:

```powershell
gh release view v0.1.0 --repo ArmyWas/dsh-plugin-reducer --json url,isPrerelease,assets,tagName
```

## 7. Verify installation from the public tag

Use a disposable prefix; do not install globally during verification.

```powershell
$installRoot = Join-Path (Resolve-Path ..\release-smoke) 'github-install'
npm install --prefix $installRoot github:ArmyWas/dsh-plugin-reducer#v0.1.0
& (Join-Path $installRoot 'node_modules\.bin\dsh-plugin-reducer.cmd') --version
npm uninstall --prefix $installRoot dsh-plugin-reducer
```

Required evidence: version `0.1.0`, then removal of the installed command.

## 8. Publish the official Discussion

The official project currently does not accept external pull requests. Publish
the prepared project post in its **Show Your Plugins!** category instead. Recent
GitHub CLI versions provide a first-party non-interactive Discussion command:

```powershell
gh discussion create `
  --repo deepseek-ai/deepseek-harness `
  --category 'Show Your Plugins!' `
  --title 'DSH | dsh-plugin-reducer | Find the minimal plugin set that reproduces a failure' `
  --body-file docs/OFFICIAL_DISCUSSION.md
```

If GitHub reports a missing permission, refresh the CLI token with the minimum
required Discussion scope and retry only `gh discussion create`:

```powershell
gh auth refresh -s write:discussion
```

Capture the returned Discussion URL. Open it once to verify that the screenshot,
code block, project URL, unofficial label, and bilingual summary render correctly.

## 9. Post-publication checks

- Repository and release URLs work in a signed-out browser.
- The release asset installs from the tag and reports version `0.1.0`.
- CI remains green on the released commit.
- The official Discussion contains exactly one project and follows the pinned
  category title format.
- No awesome-list PR exists; the external CLI is not eligible for that catalog.
- npm publication remains a separate decision requiring package ownership, 2FA,
  and provenance verification.
