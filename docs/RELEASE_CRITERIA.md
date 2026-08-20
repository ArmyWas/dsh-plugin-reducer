# Stable-release and adoption gates

GitHub prereleases are intentional while the reducer has strong controlled
evidence but little independent field evidence. A non-prerelease should not be
used as a substitute for real adoption.

## Required before the first stable GitHub release

- CI passes on Windows, macOS, and Linux with every supported Node.js line.
- The weekly Harness `next` profile canary is green.
- At least three independent, privacy-reviewed field reports exercise real
  profiles. Useful outcomes include isolating one or more community bundles or
  correctly returning a baseline/scope failure.
- No report shows source-profile mutation or an unredacted secret/path leak.
- The public install asset, checksum, clean install, and uninstall are verified.
- The official Harness maintainer discussion has been posted and linked, even
  if maintainers have not yet selected an upstream direction.

## Evidence, not vanity metrics

Stars, clone counts, release downloads, and catalog inclusion are discovery
signals. They are not field reports: CI, release smoke tests, and maintainer
dogfooding can generate the same events. Only a report from an independent real
profile counts toward the three-report gate.

## Feature gates

- Do not add broader order/prefix reduction until a real report demonstrates
  that set reduction loses the failure.
- Do not add automatic repair or quarantine; a minimal set is evidence, not a
  safe-removal decision.
- Prefer an upstream profile-inspection/reporting seam over additional private
  manifest assumptions.

Field reports use the repository's **Real Harness field report** issue form and
must be manually reviewed for privacy before submission.
