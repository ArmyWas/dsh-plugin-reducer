# Contributing

Thanks for helping make Harness failures smaller and easier to act on.

## Development

Requirements: Node.js 22.19+ or 24+, plus a local DeepSeek Harness installation
for the optional real-runtime test.

```sh
npm install
npm run check
npm run pack:check
```

The unit and integration suite has no network dependency. It includes an oracle
where two fixtures pass independently and fail only together.

## Change rules

- Preserve the source-profile invariant: reducer-owned writes belong only in a
  temporary shadow home.
- Do not add automatic package installation or run lifecycle scripts.
- Treat `unresolved` probe results conservatively; they must never justify
  removing a candidate.
- Add a regression test for every parser, reducer, redaction, or process-control
  bug.
- Keep reports backward compatible within a schema version. Add a new schema
  version for breaking changes.

## Reporting a bug

Run with `--report reducer-report.json`, inspect the file, and attach it to the
issue only after confirming it contains no private data. Include the probe type,
Harness version, operating system, and expected versus actual failure.

For security issues, follow [SECURITY.md](SECURITY.md).
