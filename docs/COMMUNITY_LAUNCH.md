# Community launch kit

Repository URL: <https://github.com/ArmyWas/dsh-plugin-reducer>

## Official Discussions post

**Title:** Proposal + working prototype: automatically reduce a broken profile
to the minimal interacting plugin set

**Body:**

I built <https://github.com/ArmyWas/dsh-plugin-reducer>, an external diagnostic
CLI for DeepSeek Harness.

The specific problem is interaction failure: plugin A starts alone, plugin B
starts alone, but A+B breaks the profile. Disabling one plugin at a time can miss
this entirely, and a diagnostic plugin inside Harness may not load when the tree
is already broken.

The prototype creates a disposable shadow `DSH_HOME`, reuses the profile's
already-installed packages, tests subsets/complements, and returns a 1-minimal
failure-inducing set. It never installs packages or rewrites the source profile.
Reports scrub common secrets and local absolute paths.

I tested it against `@deepseek-ai/dsh@0.1.0-rc.7` with three bundles. A and B
registered the same global tool; C was irrelevant. The reducer found `{A, B}` in
six configurations, verified that each alone passed, and confirmed the source
profile fingerprint was unchanged.

This is deliberately not another startup guard, doctor, plugin manager, or repro
exporter. It complements those tools by answering one narrow question: "which
plugins are sufficient to reproduce this?"

I would value maintainer feedback on four points:

1. Is `dependencies ∩ dsh.profile.bundles` the intended stable definition of
   out-of-tree bundles?
2. Is there a preferred machine-readable profile inspection/readiness API?
3. Would a shared diagnostic report envelope be useful across ecosystem tools?
4. Should this remain external, become `dsh plugin reduce`, or first be linked
   from troubleshooting docs while usage evidence accumulates?

Design, real-runtime evidence, ecosystem comparison, and an upstream RFC are all
in the repository. The project is an early preview and explicitly unofficial.

## 中文社区帖

**标题：** 提案 + 可运行原型：自动把损坏的 profile 缩减为最小插件交互集合

我做了一个 Harness 外置诊断工具：
<https://github.com/ArmyWas/dsh-plugin-reducer>。

它专门解决插件交互故障：A 单独能启动，B 单独也能启动，A+B 才导致 profile
崩溃。普通逐个禁用很容易漏掉这种情况；而把诊断器本身做成 Harness 内插件，
在插件树已经损坏时又可能根本加载不起来。

工具会建立一次性影子 `DSH_HOME`，复用已安装依赖，用 delta debugging 自动测试
子集与补集，最后返回 1-最小故障集合。它不安装包、不改真实 profile，并可生成
经过常见密钥与本机路径脱敏的 JSON 报告。

我已经在 `@deepseek-ai/dsh@0.1.0-rc.7` 上做了真实启动测试：A、B 注册同名全局
工具，C 无关；工具用 6 种组合准确找出 `{A, B}`，验证 A/B 单独都通过，且真实
profile 前后指纹一致。

它不是新的启动保护器、医生、插件管理器或会话复现导出器，而是补充一个窄问题：
“究竟哪些插件足以复现这个故障？”

希望维护者重点反馈：树外 bundle 的稳定识别方式、机器可读的 profile/readiness
接口、跨诊断工具的报告格式，以及它更适合保持外置、进入 `dsh plugin reduce`，
还是先作为排障文档中的社区工具。

## awesome-dsh-plugin pull request

**Entry:**

```md
- [dsh-plugin-reducer](https://github.com/ArmyWas/dsh-plugin-reducer) - External delta-debugging CLI that
  finds a 1-minimal failure-inducing set of profile bundles, including plugin
  interaction failures, without rewriting the source profile.
```

**PR title:** Add dsh-plugin-reducer for minimal plugin failure sets

**PR body:**

Adds a narrowly scoped diagnostic tool for automatically reducing reproducible
profile failures. I searched the current catalog for guards, doctors, repro
tools, bisect, delta debugging, and minimal failing sets. The closest projects
recover startup or export session context; this one searches plugin subsets and
interaction sets. The repository includes the ecosystem comparison, tests, a
real rc.7 interaction run, safety boundaries, and bilingual documentation.

## Release checklist

- Run `npm run check` and `npm run pack:check` on the release commit.
- Confirm the repository is public and topics include `dsh-plugin`,
  `deepseek-harness`, `delta-debugging`, and `plugin-debugging`.
- Create a GitHub prerelease `v0.1.0` with the real Harness test summary.
- Open the official Discussion before proposing a core PR; ask for API and
  product direction instead of assuming upstream ownership.
- Submit the awesome-list PR after the public URL and release are stable.
- Publish to npm only after package ownership, provenance, and 2FA are ready.
- Recheck the generated JSON report manually before attaching it anywhere.
