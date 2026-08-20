# Node consumer example

This is a deliberately small downstream project that installs the pinned,
verified v0.3.1 release and consumes the public library API. It never modifies
the source Harness profile; the reducer creates disposable shadow profiles for
its probes.

```sh
cd examples/node-consumer
npm install
DSH_HOME=/path/to/.dsh npm start
```

PowerShell:

```powershell
cd examples/node-consumer
npm install
$env:DSH_HOME = "$HOME\.dsh"
npm start
```

Set `DSH_PROFILE` when the failing profile is not `web`, or `DSH_COMMAND` when
the `dsh` executable is not on `PATH`. Successful output is one JSON line with
the minimal set plus the complete redacted report.

The example intentionally pins a release URL. Change the dependency only after
reviewing the target release notes and checksum.
