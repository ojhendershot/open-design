# agents.ts / agents.test.ts Merge Conflict Report

## Scope

分析对象：

- `apps/daemon/src/agents.ts`
- `apps/daemon/tests/agents.test.ts`

背景来自 `merge-conflicts-analysis.md`：在最近 PR 样本中，`apps/daemon/src/agents.ts` 出现 6 个冲突 PR、16 个冲突 hunk；`apps/daemon/tests/agents.test.ts` 出现 4 个冲突 PR、12 个冲突 hunk。它们是 daemon agent adapter 相关变更的主要冲突面。

## 主要冲突 pattern

### 1. Agent registry 集中冲突

`apps/daemon/src/agents.ts` 里的 `AGENT_DEFS` 是一个线性大 registry。它同时包含：

- agent id/name/bin 定义
- fallback binary 配置
- model fallback 列表
- reasoning options
- CLI argv 构造逻辑 `buildArgs`
- prompt stdin/argv 策略
- stream format / event parser
- MCP discovery 能力
- agent 静态环境变量

多个 PR 新增或调整 agent adapter 时，都会编辑这个数组。新增 Qoder、Pi、Kiro、Kilo、DeepSeek、Hermes、Kimi，或调整 Codex、Claude、Gemini 的参数和模型时，Git 很容易在相邻 hunk 上冲突。

典型冲突形态：一个分支只给 Codex 加 executable override，主线已经把 override 扩展成多 adapter map。

```ts
const AGENT_BIN_ENV_KEYS = new Map([
  ['claude', 'CLAUDE_BIN'],
  ['codex', 'CODEX_BIN'],
  ['copilot', 'COPILOT_BIN'],
  ['cursor-agent', 'CURSOR_AGENT_BIN'],
]);
```

### 2. Executable resolution 共享底座冲突

冲突集中在：

- `AGENT_BIN_ENV_KEYS`
- `userToolchainDirs`
- `resolveOnPath`
- `configuredExecutableOverride`
- `resolveAgentExecutable`

这些逻辑服务所有 agent。任何 CLI 可执行文件相关变更都会碰同一块区域：

- 新增 `*_BIN` override
- 支持 fallback binary，例如 `openclaude`
- 支持 GUI-launched minimal PATH
- 支持 npm global prefix、mise、Vite+ 等工具链路径
- Windows `PATHEXT` / `.cmd` / `.exe` 行为
- 测试隔离用 `OD_AGENT_HOME`

这类 PR 的功能目标可能完全不同，代码落点却高度重叠。

### 3. Spawn environment 和 secret handling 冲突

冲突集中在：

- `spawnEnvForAgent`
- `expandConfiguredEnv`
- per-agent `env`
- test 文件顶部的 `originalX` env snapshot
- `afterEach` 里的 env restore

常见变更包括：

- Gemini 注入 `GEMINI_CLI_TRUST_WORKSPACE`
- Qoder 继承 `QODER_PERSONAL_ACCESS_TOKEN`
- Claude 过滤 `ANTHROPIC_API_KEY`
- configured env 支持 `~` 展开
- 测试新增 `PATH`、`HOME`、`OD_AGENT_HOME`、`OD_DAEMON_URL`、`OD_TOOL_TOKEN`、`PATHEXT` 等变量恢复

测试文件的 env setup 是文件级共享结构，新环境变量测试通常要同时编辑顶部常量和 `afterEach`，造成相邻冲突。

### 4. MCP live artifacts 能力冲突

冲突集中在：

- agent 定义里的 `mcpDiscovery`
- `buildLiveArtifactsMcpServersForAgent`
- `agents.test.ts` 里 MCP discovery / live artifact tools 测试

常见变更包括：

- 给某些 ACP agent 开启 live artifacts MCP discovery
- 调整 MCP server command / args / env shape
- 增加 connector tools
- 调整 daemon-resolved CLI command

测试常使用 `for (const agent of AGENT_DEFS)` 断言支持列表。新增 MCP-capable agent 会修改 source registry 和同一个测试断言区域。

### 5. CLI argv / stdin 协议回归测试冲突

每个 adapter 都有细粒度 CLI 参数协议：

- Codex：`exec --json --sandbox workspace-write`、model、reasoning、plugin toggle
- Claude：`-p`、stream-json、capability probe、`--add-dir`
- Copilot：stdin prompt、`--allow-all-tools`、JSON output
- Pi：RPC mode、model/thinking、extra context
- Qoder：print mode、workspace、attachments、add-dir
- DeepSeek：argv prompt、Windows prompt budget

冲突原因是各 adapter 的协议实现全部嵌在 `AGENT_DEFS` 内，回归测试也堆在同一个 `agents.test.ts` 中。多个 PR 同时修 stdin/argv、Windows `ENAMETOOLONG`、model 参数、extra dirs 时，会在同一区域插入或修改测试。

### 6. 测试文件顶部共享 fixture 冲突

`apps/daemon/tests/agents.test.ts` 顶部集中声明：

- `const codex = AGENT_DEFS.find(...)`
- `const hermes = ...`
- `const qoder = ...`
- `const originalPath = process.env.PATH`
- `const originalFetch = globalThis.fetch`
- `afterEach` 全量恢复逻辑

新增 agent 测试、env 测试、platform mock 测试都会修改这个共享 fixture 区。该区域位于文件开头，很多 PR 都会触碰。

## 原因分析

### 1. 单文件承担多个职责

`agents.ts` 同时是：

- agent registry
- adapter implementation collection
- executable resolver
- model detector
- MCP capability provider
- spawn env builder
- Windows command-line budget checker
- public API facade

职责过多导致无关 PR 共享同一个编辑面。

### 2. 线性结构放大相邻插入冲突

`Map`、数组、长测试文件、顶部 fixture 都是线性结构。两个分支向相邻位置插入内容时，Git 经常无法自动合并，即使业务逻辑彼此独立。

### 3. Source 和 test 高度成对修改

agent adapter 变更通常必须同步改 `agents.test.ts`。因此冲突经常成对出现：source registry 一处冲突，test assertion 一处冲突。

### 4. Agent adapter 是高并发开发热点

近期 PR 大量围绕 CLI adapter 能力扩展：新增 adapter、更新模型、修参数协议、修 Windows、修 PATH、修 MCP、修 secret/env。它们都经过 `agents.ts` 和 `agents.test.ts`。

### 5. 共享底座变更和 adapter 变更混在一起

`resolveAgentExecutable`、`spawnEnvForAgent`、MCP discovery 这类底座逻辑服务所有 agents。底座修复 PR 和具体 adapter PR 同时进行时，会在同一个文件发生交叉编辑。

## 解决思路

### 总体策略

把当前两个高冲突线性文件拆成稳定边界。第一阶段以纯搬迁为主，保持行为和 public export 兼容，降低重构风险。

推荐保留 `apps/daemon/src/agents.ts` 作为 facade，继续导出既有 API：

- `AGENT_DEFS`
- `detectAgents`
- `getAgentDef`
- `resolveAgentExecutable`
- `resolveAgentBin`
- `spawnEnvForAgent`
- `buildLiveArtifactsMcpServersForAgent`
- prompt / Windows budget helpers

内部实现拆到更细模块。

### 推荐拆分结构

```txt
apps/daemon/src/agents.ts                 # facade，兼容旧 import
apps/daemon/src/agents/
  registry.ts                             # 汇总 AGENT_DEFS
  types.ts                                # AgentDef / shared shape，如需要
  models.ts                               # DEFAULT_MODEL_OPTION、model parsers
  executables.ts                          # PATH / executable override / bin resolve
  env.ts                                  # spawnEnvForAgent / env expansion / secret policy
  mcp.ts                                  # buildLiveArtifactsMcpServersForAgent
  prompt-budget.ts                        # prompt argv and Windows budget helpers
  defs/
    claude.ts
    codex.ts
    copilot.ts
    cursor-agent.ts
    deepseek.ts
    devin.ts
    gemini.ts
    hermes.ts
    kimi.ts
    kiro.ts
    kilo.ts
    opencode.ts
    pi.ts
    qoder.ts
    qwen.ts
    vibe.ts
```

### 测试拆分结构

```txt
apps/daemon/tests/agents/
  defs.test.ts                 # id uniqueness, registry metadata
  args-codex.test.ts
  args-claude.test.ts
  args-copilot.test.ts
  args-pi.test.ts
  args-qoder.test.ts
  args-deepseek.test.ts
  executables.test.ts          # PATH, fallbackBins, *_BIN override, OD_AGENT_HOME
  env.test.ts                  # spawnEnvForAgent and secret behavior
  mcp.test.ts                  # live artifacts MCP discovery and tool shape
  prompt-budget.test.ts        # argv byte and Windows command-line budget
```

这样新增一个 adapter 的 PR 主要新增或修改 `defs/<agent>.ts` 和 `args-<agent>.test.ts`。共享 resolver 或 env PR 会落到独立模块，减少和 adapter PR 的冲突。

### 分阶段执行

#### 阶段一：纯搬迁

目标：降低冲突面，控制行为风险。

动作：

1. 保留 `agents.ts` facade。
2. 搬迁 executable resolver 到 `agents/executables.ts`。
3. 搬迁 env 逻辑到 `agents/env.ts`。
4. 搬迁 MCP helper 到 `agents/mcp.ts`。
5. 搬迁 prompt budget helper 到 `agents/prompt-budget.ts`。
6. 搬迁每个 adapter def 到 `agents/defs/*.ts`。
7. `agents/registry.ts` 汇总并导出 `AGENT_DEFS`。
8. 现有测试 import 继续从 `../src/agents.js` 读取，减少测试改动。

验证：

```bash
pnpm --filter @open-design/daemon typecheck
pnpm --filter @open-design/daemon test
```

#### 阶段二：测试拆分

目标：降低 `agents.test.ts` 文件级冲突。

动作：

1. 按领域拆分测试文件。
2. 提取 env restore helper。
3. 提取 tmp executable fixture helper。
4. 保持测试断言语义不变。

验证：

```bash
pnpm --filter @open-design/daemon test
```

#### 阶段三：registry 稳定化

目标：进一步减少 registry 汇总冲突。

动作：

1. `defs/index.ts` 明确按 agent id 排序导出。
2. `registry.ts` 只做数组汇总和 id uniqueness 约束。
3. 新 agent PR 只新增 `defs/<id>.ts` 并在 index 增加一行。

### 风险评估

整体风险：中低。

主要原因：推荐方案以代码搬迁为主，保持 public API 不变，避免逻辑重写。

需要重点控制的风险：

1. **模块初始化顺序**  
   `agentCapabilities`、toolchain dir cache 等 module-level cache 要保持单例语义。

2. **循环依赖**  
   推荐依赖方向：`defs/* -> shared helpers`，`registry -> defs/*`，`facade -> registry/helpers`。避免 helper import registry。

3. **ESM import 后缀**  
   TypeScript source 当前使用 `.js` import specifier，拆文件时保持一致。

4. **测试隔离**  
   `process.env`、`process.platform`、`globalThis.fetch` 的 restore 行为要保持原样。

5. **导出兼容性**  
   其他 daemon 模块可能从 `src/agents.js` import。facade 应覆盖原导出，避免连锁修改。

## 预期收益

- 新增 agent adapter 从修改大 registry 变为新增独立文件。
- Codex/Qoder/Pi/DeepSeek 等 adapter 参数调整互相隔离。
- PATH/executable resolver PR 与具体 adapter PR 解耦。
- env/secret policy PR 与 model list / buildArgs PR 解耦。
- MCP discovery PR 与普通 argv 协议 PR 解耦。
- 测试冲突从一个 2000 行文件分散到多个领域测试文件。

最直接的收益是减少相邻 hunk 冲突；长期收益是让 agent adapter 开发形成清晰所有权边界。
