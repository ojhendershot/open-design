---
id: "20260509-server-ts-refactor"
name: "Daemon Server Route Refactor"
status: new
created: "2026-05-09"
---

## 概览

### 问题说明

`apps/daemon/src/server.ts` 是当前合并冲突样本中冲突频率最高的文件。它同时承担 daemon 启动、全局 middleware、路由注册、route handler、功能胶水代码、大量 domain import，以及若干跨切面 runtime helper。多个互不相关的 daemon 功能 PR 会反复在同一个 import 区和路由注册区域产生冲突。

### 目标

- 通过把 domain 路由注册和 HTTP handler 胶水代码迁移到 daemon 内部的 route 文件，降低 `apps/daemon/src/server.ts` 的反复合并冲突。
- 保留 `server.ts` 作为 daemon bootstrap 和 route composition 入口，并使用稳定的语义分区组织路由注册。
- 第一阶段采用“每个 domain 一个 route 文件”的浅层拆分，暂不引入更深的 `domain/routes.ts`、`handlers.ts`、`service.ts` 层级。
- route 分区保持通用稳定，新 route 优先复用已有分区，避免为单个功能新增分区。
- 保持行为等价，包括 API path、路由顺序、错误响应形状、SSE 语义和 middleware 顺序。
- 把 route 归属和分区规则写入 `AGENTS.md`，避免后续改动重新把 route handler 集中回 `server.ts`。

### 非目标

- 完整重写 daemon 业务 service 层。
- 重新设计 API contract。
- 重新设计 runtime validation。
- 借这次重构改动 chat、MCP、media、deploy 或 live artifact 的业务行为。
- 新增独立的根级 `routes.ts`；本阶段 route composition 继续留在 `server.ts`。
- 抽取 origin、CORS 或 local-daemon request validation middleware；本阶段不做 middleware 抽取。

### 成功标准

- 现有 daemon domain 内新增 endpoint 时，通常无需修改 `apps/daemon/src/server.ts`。
- `server.ts` 主要 import route registrar 和 bootstrap 依赖，而不是直接 import 大量 domain service 函数。
- `server.ts` 的路由注册使用稳定语义分区，分区注释不使用数字编号。
- domain route 文件拥有本 domain 的 `app.get`、`app.post`、`app.delete`、`app.put`、`app.patch` 注册。
- `AGENTS.md` 记录 daemon route 和分区维护规则。
- 实现后 daemon tests、guard、typecheck 通过。

## 调研

### 现有冲突证据

- `merge-conflicts-analysis.md` 显示 `apps/daemon/src/server.ts` 是冲突最多的文件：13 个冲突 PR、61 个 conflict hunk。来源：`merge-conflicts-analysis.md:14-17`
- 冲突集中在 import 区、API route 注册、CORS/origin validation、media task handling、MCP config、agent streaming、import/export behavior 和 runtime startup logic。来源：`merge-conflicts-analysis.md:35-39`
- PR #884 的 import-section 示例显示：MCP config import 扩展和 media task import 在同一 import 区冲突。两个功能域彼此独立，但中心化 import block 形成了共享文本热点。来源：`merge-conflicts-analysis.md:41-74`

### 当前 server 形态

- `server.ts` import 了大部分 daemon domain 的依赖，包括 agents、skills、design systems、ACP/RPC、streams、project watchers、design previews、runs、connection tests、import/export、prompt templates、documents、artifact linting、media、research、MCP、app config、Orbit、projects、DB、live artifacts、connectors、deployment 和 origin validation。来源：`apps/daemon/src/server.ts:2-201`
- 路由注册和启动逻辑集中在同一个 server entrypoint。来源：`apps/daemon/src/server.ts`
- 当前已有 `registerConnectorRoutes(app, ...)` 模式，说明 domain route registration 已经可以从 `server.ts` 移出。来源：`apps/daemon/src/server.ts:173-176` 以及 connector route 注册位置。

### 约束

- `apps/daemon` 拥有 REST/SSE APIs、agent CLI spawning、skills、design systems、artifacts 和 static serving。来源：`AGENTS.md:17-19`
- app business logic 不应 import 另一个 app 的私有源码；web/daemon 集成应通过 HTTP APIs 和 `packages/contracts`。来源：`AGENTS.md:55-59`
- app business logic 不应感知 sidecar/control-plane 概念；sidecar 相关逻辑应留在 app sidecar wrapper。来源：`AGENTS.md:62`
- app tests 应放在 app 级 `tests/` 目录。来源：`AGENTS.md:55`
- 常规工作完成前需要运行 `pnpm guard`、`pnpm typecheck`，以及匹配变更范围的 package-scoped tests/builds。来源：`AGENTS.md:91-98`

## 设计

### 架构

采用浅层 route module 形态：

```txt
apps/daemon/src/server.ts
apps/daemon/src/server-context.ts
apps/daemon/src/static-resource-routes.ts
apps/daemon/src/project-routes.ts
apps/daemon/src/chat-routes.ts
apps/daemon/src/live-artifact-routes.ts
apps/daemon/src/media-routes.ts
apps/daemon/src/mcp-routes.ts
apps/daemon/src/deploy-routes.ts
apps/daemon/src/import-export-routes.ts
```

每个 domain route 文件导出一个 registrar：

```ts
export function registerProjectRoutes(app: Express, ctx: ServerContext): void {
  app.get('/api/projects', ...);
  app.post('/api/projects', ...);
}
```

`server.ts` 负责 bootstrap 和 composition。分区保持宽粒度，尽量让未来新增 route 复用现有分区：

```ts
// Core daemon
registerHealthRoutes(app, ctx);
registerStatusRoutes(app, ctx);
registerConfigRoutes(app, ctx);

// Resource catalog
registerStaticResourceRoutes(app, ctx);
registerDiscoveryRoutes(app, ctx);

// Project workspace
registerProjectRoutes(app, ctx);
registerLiveArtifactRoutes(app, ctx);

// Runtime workflows
registerChatRoutes(app, ctx);
registerMediaRoutes(app, ctx);
registerResearchRoutes(app, ctx);

// External services
registerMcpRoutes(app, ctx);
registerConnectorRoutes(app, ctx);
registerProxyRoutes(app, ctx);
registerDeployRoutes(app, ctx);
registerImportExportRoutes(app, ctx);

// Web app static serving
installStaticWebRoutes(app, ctx);
```

分区注释使用稳定的语义标签，不使用数字编号。数字编号会在插入新分区时带来重编号噪音，并形成新的合并冲突源。

分区规则应保持通用。新增 route 优先归入这几个宽粒度分区；只有出现无法归入现有分区的长期 daemon domain 时，才讨论新增分区。

分区含义：

- `Core daemon`：health、version、active state、app config、dialog/status 等 daemon 自身状态与配置。
- `Resource catalog`：agents、skills、design systems、prompt templates、codex pets、frames、preview/showcase 等资源和能力发现。
- `Project workspace`：projects、files、tabs、conversations、comments、templates、artifacts、live artifacts 等项目工作区数据与产物。
- `Runtime workflows`：chat、runs、SSE、agent streaming、media generation、research、critique interrupt 等运行态工作流。
- `External services`：MCP、connectors、OAuth、proxy、deploy、import/export、finalize 等外部集成和出入站能力。
- `Web app static serving`：静态 web app serving 和 fallback。

### route 文件命名

本阶段每个 daemon domain 使用一个 daemon-local route 文件。若较短名称已被 domain module 占用，例如 `projects.ts`、`media.ts`、`deploy.ts`，则优先使用 `*-routes.ts`。

示例：

- `project-routes.ts` 注册 project、file、tab、conversation 和 template 相关 endpoint。
- `media-routes.ts` 注册 media generation 和 media config 相关 endpoint。
- `mcp-routes.ts` 注册 MCP config、install info、token 和 OAuth endpoint。
- `live-artifact-routes.ts` 注册 live artifact、refresh、preview、code 和 preview comment endpoint。
- `static-resource-routes.ts` 注册 skills、design systems、prompt templates、codex pets、frames 等只读资源 endpoint。

route 文件不需要和 `server.ts` 分区一一对应。一个宽粒度分区可以挂载多个 route 文件，例如 `Runtime workflows` 可以挂载 `chat-routes.ts`、`media-routes.ts` 和 research 相关 registrar；`External services` 可以挂载 `mcp-routes.ts`、connector routes、proxy routes、deploy routes 和 import/export routes。

本次变更不创建嵌套的 `projects/routes.ts`。未来某个 domain 的单文件 route 过大时，再单独引入更深层结构。

### ServerContext

新增 daemon-only 的 `ServerContext` 类型，用于承载 route registrar 需要的共享基础设施依赖。它可以包含：

- database handle
- project root 和 runtime data directories
- artifacts 和 projects directories
- skills、design systems、craft、frames、prompt templates、bundled pets 等资源目录
- Orbit service、event bus 等共享服务
- API error creation/sending 等通用响应 helper
- 为保持现有行为所需的 route-local configuration

`ServerContext` 应保持基础设施导向。domain-specific helper 应留在对应 route 文件或已有 domain module 中。

### 冲突减少机制

该设计能减少当前观察到的主要冲突类型：

- import 冲突从一个全局 import block 分散到各 domain route 文件。
- 现有 domain 内新增 endpoint 时不再修改 `server.ts`。
- route registration 冲突被限制在相关 domain 内。
- 冲突文件更准确地表达受影响功能域，解决冲突时上下文更小。
- `server.ts` 的变化集中在 bootstrap、稳定分区下的 registrar wiring，以及少量真正跨域的启动逻辑。

该设计不会消除多个 PR 同时修改同一 domain 行为时的真实冲突。它会让这类冲突范围更小、语义更准确。

### AGENTS.md 规则更新

在 `AGENTS.md` 中加入 daemon route ownership 规则：

- 现有 domain 的 endpoint 应加入匹配的 daemon route 文件。
- 新 route 和新 route registrar 应优先接入 `server.ts` 中匹配语义的已有分区，避免为单个功能新增分区。
- 分区注释使用稳定、通用的语义名称，不使用数字编号。
- 避免直接在 `server.ts` 添加 route handler，除非该路由确实属于 bootstrap-wide 行为，或当前没有明确 domain owner。

## 计划

- [ ] 记录 route ownership 规则
  - [ ] 实现：把 route 和分区规则加入 `AGENTS.md`。
  - [ ] 验证：确认新规则符合 root/app 边界，分区保持通用，并且不使用数字分区标签。
- [ ] 抽取共享 server context
  - [ ] 实现：新增 `server-context.ts`，承载 route registrar 需要的基础设施依赖。
  - [ ] 实现：在 `server.ts` 中创建 context，保持现有 runtime value 不变。
  - [ ] 验证：运行覆盖 startup-adjacent helper 的 daemon tests。
- [ ] 抽取低风险 static resource routes
  - [ ] 实现：把 skills、design systems、prompt templates、codex pets、frames 等只读 route registration 移到 `static-resource-routes.ts`。
  - [ ] 验证：运行覆盖 resource route helper 的 daemon tests，然后运行 `pnpm --filter @open-design/daemon test`。
- [ ] 抽取 project 相关 routes
  - [ ] 实现：把 project、file、tab、conversation 和 template endpoint registration 移到 `project-routes.ts`，保持 route order。
  - [ ] 验证：运行 projects/files/conversations/templates 相关 daemon tests。
- [ ] 抽取 live artifact routes
  - [ ] 实现：把 live artifact、preview、refresh、code 和 preview-comment endpoints 移到 `live-artifact-routes.ts`。
  - [ ] 验证：运行 live artifact 和 preview-comment daemon tests。
- [ ] 抽取 media routes
  - [ ] 实现：把 media generation、media task 和 media config endpoints 移到 `media-routes.ts`。
  - [ ] 验证：运行 media config/tasks 相关 daemon tests。
- [ ] 抽取 MCP 和 integration routes
  - [ ] 实现：把 MCP config、install info、token 和 OAuth endpoints 移到 `mcp-routes.ts`。
  - [ ] 实现：保留现有 connector route registration 模式，并把它放在 Integrations 分区。
  - [ ] 验证：运行 MCP config/OAuth/token 相关 daemon tests。
- [ ] 抽取 deploy 和 import/export routes
  - [ ] 实现：把 deploy endpoints 移到 `deploy-routes.ts`。
  - [ ] 实现：把 import/export/finalize endpoints 移到 `import-export-routes.ts`。
  - [ ] 验证：运行 deployment/import/export 相关 daemon tests。
- [ ] 最后抽取 runtime、agents 和 chat routes
  - [ ] 实现：在低风险 route groups 稳定后，把 chat、agent streaming、run lifecycle 和 runtime endpoints 移到 `chat-routes.ts`。
  - [ ] 验证：运行覆盖 chat、agent spawning helpers、SSE events、stop behavior 和 run status 的 daemon tests。
- [ ] 最终验证
  - [ ] 验证：运行 `pnpm guard`。
  - [ ] 验证：运行 `pnpm typecheck`。
  - [ ] 验证：运行 `pnpm --filter @open-design/daemon test`。
  - [ ] 验证：如果 route extraction 改动 package build inputs，运行 `pnpm --filter @open-design/daemon build`。

## 备注

### 实现指导

- 用行为保持的方式移动代码。route extraction 期间避免顺手清理和业务重写。
- 保持现有 endpoint path、HTTP method、middleware order、response shape 和 SSE event ordering。
- route 文件保持足够薄，为未来更深拆分保留空间。
- 仅 route glue 使用的 helper 可以留在对应 route 文件中。
- 可复用业务逻辑继续留在已有 domain module，例如 `projects.ts`、`media.ts`、`mcp-config.ts`、`deploy.ts` 和 live-artifact store/service modules。
- 优先通过显式 context dependency 传递共享依赖，避免 route 文件从 `server.ts` import mutable state。

### 验证

实现后的预期验证命令：

```bash
pnpm guard
pnpm typecheck
pnpm --filter @open-design/daemon test
pnpm --filter @open-design/daemon build
```
