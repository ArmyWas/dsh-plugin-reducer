# Security

`dsh-plugin-reducer` is an external diagnostic CLI. It does not run inside the
Harness process and never edits the source profile.

## Data boundary

- A temporary shadow `DSH_HOME` contains the profile manifest, profile patch,
  optional home patch, and settings file needed to reproduce composition.
- Known credential stores (`$DSH_HOME/.env`), sessions, storage, and workspace
  files are not copied. Configuration YAML is copied and may itself contain
  values a user entered inline.
- The shadow profile links to the source profile's already-installed
  `node_modules`; it does not install packages or execute package install scripts.
- Reports redact common credential forms and replace source/lab absolute paths
  with stable placeholders.

## Probe boundary

Custom probes are commands supplied explicitly by the person running the CLI.
They execute with the current user's permissions and with `DSH_HOME` pointed at
the shadow lab. Harness plugins also execute normally from the linked source
`node_modules`; the lab is not a filesystem, process, environment, or network
sandbox. Do not run a probe or installed plugin you do not trust.

## Reporting a vulnerability

Please open a GitHub security advisory rather than a public issue. Include a
minimal reproduction that contains no real credentials or personal data.
