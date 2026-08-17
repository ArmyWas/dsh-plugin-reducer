# dsh-plugin-reducer v0.1.0

First public preview of an external DeepSeek Harness profile-plugin reducer.

## Highlights

- Finds a 1-minimal failure-inducing set of out-of-tree profile bundles.
- Detects interaction failures where each remaining bundle passes alone.
- Uses a fresh disposable shadow `DSH_HOME` for every probe attempt.
- Never installs packages or rewrites the source profile.
- Supports config, Web-startup, and custom-command probes.
- Treats inconsistent repeated probes as unresolved rather than removal
  evidence.
- Produces a versioned JSON report with common-secret and absolute-path
  redaction.
- Ships with zero runtime dependencies and bilingual documentation.

## Verified environment

The packaged CLI was installed from its tarball and tested against
`@deepseek-ai/dsh@0.1.0-rc.7` on Windows x64 with Node.js `v24.14.1`.

The real-runtime fixture contained three bundles. A and B each started alone but
failed together because they registered the same global tool; C was irrelevant.
The reducer found `{A, B}` in six configurations and verified the source profile
was unchanged.

## Install

```sh
npm install --global github:ArmyWas/dsh-plugin-reducer#v0.1.0
dsh-plugin-reducer --profile web --probe web --report reducer-report.json
```

Node.js 22.19+ or 24+ is required. This is an unofficial early preview and not
affiliated with or endorsed by DeepSeek. Read `SECURITY.md` before running
untrusted installed plugins or custom probes.
