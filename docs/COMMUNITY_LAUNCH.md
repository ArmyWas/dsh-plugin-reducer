# Community launch kit

Repository URL: <https://github.com/ArmyWas/dsh-plugin-reducer>

Submission rules verified against the official
[Plugin Category Guidelines](https://github.com/deepseek-ai/deepseek-harness/discussions/2004)
and [contribution policy](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md)
on 2026-08-17.

## Official Discussions post

Category: **Show Your Plugins!**

**Title:** DSH | dsh-plugin-reducer | Find the minimal plugin set that reproduces a failure

**Body:**

> **Unofficial project, independently developed and maintained by a community
> member.**

Project URL: <https://github.com/ArmyWas/dsh-plugin-reducer>

### Introduction

`dsh-plugin-reducer` is an external diagnostic CLI for DeepSeek Harness.

The specific problem is interaction failure: plugin A starts alone, plugin B
starts alone, but A+B breaks the profile. Disabling one plugin at a time can miss
this entirely, and a diagnostic plugin inside Harness may not load when the tree
is already broken.

The prototype creates a disposable shadow `DSH_HOME`, reuses the profile's
already-installed packages, tests subsets/complements, and returns a 1-minimal
failure-inducing set. Every probe gets a fresh shadow home. It never installs
packages or rewrites the source profile. Reports scrub common secrets and local
absolute paths.

I tested it against `@deepseek-ai/dsh@0.1.0-rc.7` with three bundles. A and B
registered the same global tool; C was irrelevant. The reducer found `{A, B}` in
six configurations, verified that each alone passed, and confirmed the source
profile fingerprint was unchanged.

This is deliberately not another startup guard, doctor, plugin manager, or repro
exporter. It complements those tools by answering one narrow question: "which
plugins are sufficient to reproduce this?"

### Screenshot

![Real rc.7 interaction reduction](https://raw.githubusercontent.com/ArmyWas/dsh-plugin-reducer/main/assets/demo.png)

### How it integrates with DSH

- Reads the documented `$DSH_HOME/profiles/<name>/package.json` profile model.
- Keeps Harness installation-owned bundles fixed and reduces only out-of-tree
  bundles recorded in both `dsh.profile.bundles` and `dependencies`.
- Invokes the installed `dsh` executable for config or Web-startup probes.
- Reuses the profile's installed `node_modules` without package installation.
- Runs outside the plugin tree, so it remains available when that tree fails to
  load.

Example:

```sh
npm install --global github:ArmyWas/dsh-plugin-reducer#v0.1.0
dsh-plugin-reducer --profile web --probe web --report reducer-report.json
```

### Feedback requested

I would value maintainer feedback on four points:

1. Is `dependencies ∩ dsh.profile.bundles` the intended stable definition of
   out-of-tree bundles?
2. Is there a preferred machine-readable profile inspection/readiness API?
3. Would a shared diagnostic report envelope be useful across ecosystem tools?
4. Should this remain external, become `dsh plugin reduce`, or first be linked
   from troubleshooting docs while usage evidence accumulates?

Design, real-runtime evidence, ecosystem comparison, and an upstream RFC are all
in the repository. This is an early preview; the tool is not affiliated with or
endorsed by DeepSeek.

## 中文社区帖

**标题：** DSH｜dsh-plugin-reducer｜自动找出可复现故障的最小插件集合

> **非官方项目，由社区成员独立开发和维护。**

项目地址：<https://github.com/ArmyWas/dsh-plugin-reducer>

项目介绍：这是一个 Harness 外置诊断工具。

它专门解决插件交互故障：A 单独能启动，B 单独也能启动，A+B 才导致 profile
崩溃。普通逐个禁用很容易漏掉这种情况；而把诊断器本身做成 Harness 内插件，
在插件树已经损坏时又可能根本加载不起来。

工具会建立一次性影子 `DSH_HOME`，复用已安装依赖，用 delta debugging 自动测试
子集与补集，最后返回 1-最小故障集合。每次探针都使用全新的影子目录；它不安装
包、不改真实 profile，并可生成经过常见密钥与本机路径脱敏的 JSON 报告。

我已经在 `@deepseek-ai/dsh@0.1.0-rc.7` 上做了真实启动测试：A、B 注册同名全局
工具，C 无关；工具用 6 种组合准确找出 `{A, B}`，验证 A/B 单独都通过，且真实
profile 前后指纹一致。

它不是新的启动保护器、医生、插件管理器或会话复现导出器，而是补充一个窄问题：
“究竟哪些插件足以复现这个故障？”

截图：

![真实 rc.7 交互故障缩减](https://raw.githubusercontent.com/ArmyWas/dsh-plugin-reducer/main/assets/demo.png)

与 DSH 的集成方式：读取官方 profile manifest，固定 Harness 内置 bundle，仅缩减
同时存在于 `dsh.profile.bundles` 与 `dependencies` 的树外 bundle；调用已安装的
`dsh` 完成配置或 Web 启动探针，并复用现有 `node_modules`。它故意运行在插件树
之外，因此插件树加载失败时仍然可用。

希望维护者重点反馈：树外 bundle 的稳定识别方式、机器可读的 profile/readiness
接口、跨诊断工具的报告格式，以及它更适合保持外置、进入 `dsh plugin reduce`，
还是先作为排障文档中的社区工具。

## Why there is no awesome-list pull request

The awesome-dsh-plugin catalog requires an installable package with a
`dsh.bundle` manifest, a repository at least one day old, ten or more commits,
and the `dsh-plugin` topic. An external rescue CLI does not meet the first and
most important requirement. Do not add a cosmetic bundle merely to qualify; the
external execution model is part of the product's reliability.

## Release checklist

- Run `npm run check` and `npm run pack:check` on the release commit.
- Confirm the repository is public and topics include `deepseek-harness`,
  `dsh-tooling`, `delta-debugging`, and `plugin-debugging`; do not use
  `dsh-plugin` while this is not a `dsh.bundle` package.
- Create a GitHub prerelease `v0.1.0` with the real Harness test summary.
- Open the official Discussion and ask for API and product direction. The
  official repository currently does not accept external pull requests.
- Publish to npm only after package ownership, provenance, and 2FA are ready.
- Recheck the generated JSON report manually before attaching it anywhere.
