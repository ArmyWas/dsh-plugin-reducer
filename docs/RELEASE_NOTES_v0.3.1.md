# dsh-plugin-reducer v0.3.1

This prerelease completes the reducer's public distribution and maintenance
path without weakening its evidence gate.

## Highlights

- Install directly from the npm `next` channel or the matching pinned GitHub
  Release artifact.
- Publish from GitHub Actions through npm OIDC trusted publishing, with no
  long-lived registry token and with automatic provenance.
- Keep new previews on `next`; npm's initial 0.3.0 `latest` assignment is a
  bootstrap artifact, not a stability signal, and is advanced only after three
  independent, privacy-reviewed field reports satisfy the stable-release gate.
- Validate machine envelopes against the shipped schemas and provide a pinned
  Node consumer example.
- Run the supported cross-platform CI matrix plus a scheduled Harness `next`
  profile-layout canary.
- State the product boundary explicitly: this is an external diagnostic CLI,
  not a bundle installed into the profile it is diagnosing.

## Install

```sh
npm install --global dsh-plugin-reducer@next
dsh-plugin-reducer --profile web --probe web --report reducer-report.json
```

The pinned GitHub asset and its SHA-256 checksum are attached to this release.

## Verification

- Syntax checks and the complete automated test suite.
- Package dry run and disposable tarball install.
- CI on Windows, macOS, and Linux with Node.js 22.19 and 24.
- Registry install and CLI smoke test after trusted publication.
