> **Unofficial project, independently developed and maintained by a community
> member.**

Project URL: <https://github.com/ArmyWas/dsh-plugin-reducer>

## Introduction

`dsh-plugin-reducer` is an external diagnostic CLI for DeepSeek Harness. It
answers one narrow question: **which installed profile bundles are actually
required to reproduce this failure?**

The difficult case is an interaction: A starts alone, B starts alone, but A+B
breaks the profile. Disabling one plugin at a time can miss that. A diagnostic
plugin inside Harness can also disappear when the plugin tree itself cannot
load, so the reducer deliberately runs outside Harness.

It creates a fresh disposable shadow `DSH_HOME` for every probe, reuses the
profile's already-installed packages, tests subsets and complements with delta
debugging, and returns a 1-minimal failure-inducing set. It never installs
packages or rewrites the source profile. Optional JSON reports scrub common
secret forms and local absolute paths.

## Real Harness test

I tested the packaged CLI against `@deepseek-ai/dsh@0.1.0-rc.7`. Three bundles
were installed through the official profile flow: A and B registered the same
global tool, while C was a no-op. A and B each passed alone; A+B failed.

The reducer found `{A, B}` in six configurations, verified that removing either
member stopped the failure, and confirmed that the source profile fingerprint
was unchanged.

![Real rc.7 interaction reduction](https://raw.githubusercontent.com/ArmyWas/dsh-plugin-reducer/main/assets/demo.png)

## DSH integration

- Reads the documented `$DSH_HOME/profiles/<name>/package.json` profile model.
- Keeps installation-owned bundles fixed.
- Reduces only out-of-tree bundles present in both `dsh.profile.bundles` and
  `dependencies`.
- Invokes the installed `dsh` executable for config or Web-startup probes.
- Reuses the profile's installed `node_modules` without package installation.
- Runs outside the plugin tree, remaining available when that tree fails to
  load.

Install from the tagged GitHub source:

```sh
npm install --global github:ArmyWas/dsh-plugin-reducer#v0.1.0
dsh-plugin-reducer --profile web --probe web --report reducer-report.json
```

## Scope

This is deliberately not another startup guard, doctor, plugin manager, or
session repro exporter. Those tools recover, inspect, manage, or capture context;
this tool minimizes the active plugin set after a failure is reproducible.

The algorithm guarantees 1-minimality, not a globally smallest set. The shadow
home is configuration isolation, not a security sandbox; installed plugins run
with the user's normal permissions.

## Maintainer feedback requested

1. Is `dependencies ∩ dsh.profile.bundles` the intended stable definition of
   out-of-tree bundles?
2. Is there a preferred machine-readable profile inspection and readiness API?
3. Would a shared diagnostic report envelope be useful across ecosystem tools?
4. Should this stay external, eventually become `dsh plugin reduce`, or first be
   referenced by troubleshooting guidance while usage evidence accumulates?

The repository includes bilingual documentation, the ecosystem search, real
runtime evidence, a versioned report schema, safety boundaries, and an upstream
RFC. It is an early preview and is not affiliated with or endorsed by DeepSeek.

---

## 中文摘要

这是一个非官方的 Harness 外置诊断工具，用于自动找出能稳定复现故障的 1-最小
树外 bundle 集合。它能处理“A 单独正常、B 单独正常、A+B 才崩”的交互问题。
每次探针使用全新影子 `DSH_HOME`，不安装依赖、不修改真实 profile，并可生成经过
常见密钥与本机路径脱敏的 JSON 报告。

真实 rc.7 测试中，工具用 6 个组合找出 `{A, B}`，验证两者单独均通过，且真实
profile 前后指纹一致。希望官方维护者反馈树外 bundle 的稳定识别方式、机器可读
诊断接口，以及该能力更适合保持外置还是未来进入 `dsh plugin reduce`。
