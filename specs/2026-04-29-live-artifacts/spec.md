# Live Artifacts via Agent Skills

**Status:** Draft · 2026-04-29  
**Parent:** [`docs/spec.md`](../../docs/spec.md)  
**Siblings:** [`docs/skills-protocol.md`](../../docs/skills-protocol.md) · [`docs/agent-adapters.md`](../../docs/agent-adapters.md) · [`docs/modes.md`](../../docs/modes.md)  
**Reference implementation:** `~/Projects/monet` connectors + live artifacts

This spec defines how to bring Monet's **connectors** and **live artifacts** ideas into Open Design, but implement the agent-facing surface as **file-based agent skills plus daemon-owned local tools**, not as an in-process tool registry or MCP-first integration.

---

## 1. Product goal

Open Design should let an agent create previewable artifacts that are not just one-off generated files, but **live, refreshable, auditable views** backed by external or local data sources.

Examples:

- “Create a live GitHub release dashboard.”
- “Make a Notion project status page and let me refresh it tomorrow.”
- “Turn this folder of JSON files into a polished stakeholder report.”
- “Create a design-system coverage artifact that can be refreshed after code changes.”

The user experience should feel like the existing OD artifact flow:

1. User chats with the selected agent.
2. Agent uses a skill to plan and create a live artifact.
3. OD persists the artifact as project-scoped files and metadata.
4. UI previews the artifact in the existing iframe/file viewer model.
5. User can refresh the artifact later without asking the agent to redesign it from scratch.

## 2. Key decision

### 2.1 Use `skill + daemon tool endpoint`, not MCP-first

Monet exposes connectors and live artifacts through a controller-owned tool registry. OD should not copy that exact runtime shape because OD's core architecture is different: OD delegates to external CLI agents such as Claude Code, Codex, Cursor Agent, Gemini CLI, OpenCode, and Qwen.

The agent-facing interface should therefore be:

```text
skills/live-artifact/SKILL.md
  ↓ instructs the agent to call
daemon local HTTP endpoints or wrapper CLI commands
  ↓ backed by
daemon-owned connector + artifact services
  ↓ persisted as
project workspace files + metadata
```

MCP may be added later as a wrapper over the same daemon services, but it should not be the first or only interface.

Reasons:

- **Multi-agent compatibility:** every supported agent can read a skill and execute shell commands; MCP support varies by agent and CLI version.
- **Lower migration cost:** current daemon `/api/chat` does not support per-run MCP binding.
- **Centralized safety:** daemon endpoints can enforce project, path, connector, and output-size policies consistently.
- **Skill-native product model:** OD's extension point is already `skills/` + `SKILL.md`, so live artifacts should feel like another OD capability, not a separate agent protocol.

### 2.2 Keep live artifacts distinct, but project-native

Live artifacts are a distinct persisted model integrated into the existing project UI. They must not be represented as a new static `ArtifactKind` in the existing artifact model, because they require ID-based identity, directory-shaped runtime storage, refresh/provenance history, connector permissions, locking, and server-rendered preview behavior.

Product terms:

- **Design / project:** the workspace container.
- **Artifact:** a static generated file inside a design.
- **Live artifact:** a refreshable, data-backed artifact inside a design.
- **Connector:** an external or local data source available to live artifacts.

Implementation boundaries:

- Keep dedicated live-artifact storage under `.live-artifacts/`, dedicated `/api/live-artifacts/*` endpoints, and dedicated live-artifact DTOs in `packages/contracts`.
- Reuse the existing project scope, workspace tabs, file tree, viewer primitives, chat SSE stream, and API error envelope so live artifacts feel native without polluting the simple static artifact path.
- Do not expose `.live-artifacts/` through generic project file APIs; all mutation should go through live-artifact or tool endpoints.

## 3. What to migrate from Monet

### 3.1 Concepts to preserve

From `~/Projects/monet`:

- Static connector catalog plus dynamic connection status.
- Connector tool safety classification.
- Read-only-first connector policy.
- Live artifact / tile / source / provenance separation.
- HTML document template plus data-binding contract.
- Declarative output mapping from tool output to `data.json` / render models.
- Strict render JSON validation.
- Refresh source validation before re-execution.
- Refresh audit trail with step-level status.
- Failure fallback: invalid refresh output should not blank the artifact.

### 3.2 Concepts to adapt

Monet concept | OD adaptation
---|---
Controller `ToolRegistry` | Daemon service endpoints and optional CLI wrappers
Chat tools `create_live_artifact`, `update_live_artifact`, `list_live_artifacts` | Skill instructions that call `od-tools live-artifacts ...` or localhost daemon endpoints
Connector tools dynamically injected into tool registry | Connector catalog exposed through daemon endpoints; skill asks agent to query/use them explicitly
SQLite-first artifact storage | Project-scoped metadata files first; SQLite optional later if indexing becomes necessary
Controller-owned agent loop | External CLI agent loop; OD only injects skills and receives output/events

### 3.3 Monet files used as source material

- `apps/controller/src/connectors/catalog.ts`
- `apps/controller/src/connectors/service.ts`
- `apps/controller/src/routes/connectors.ts`
- `apps/controller/src/tools/connectors.ts`
- `apps/controller/src/live-artifacts/schema.ts`
- `apps/controller/src/live-artifacts/render.ts`
- `apps/controller/src/live-artifacts/refresh.ts`
- `apps/controller/src/routes/live-artifacts.ts`
- `apps/controller/src/tools/live-artifacts.ts`
- `apps/controller/src/chat-storage.ts`
- `specs/2026-04-27-live-artifacts/spec.md`

## 4. Target architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│ Web App                                                          │
│ chat · artifact tree · live artifact list · refresh button        │
│ iframe preview · source/provenance panels                         │
└───────────────┬──────────────────────────────────────────────────┘
                │ HTTP/SSE
┌───────────────▼──────────────────────────────────────────────────┐
│ Local Daemon                                                      │
│                                                                  │
│  Agent session broker                                             │
│  Skill registry                                                   │
│  Built-in tool endpoints                                          │
│    /api/tools/live-artifacts/*                                    │
│    /api/tools/connectors/*                                        │
│    /api/connectors/*                                              │
│  Artifact store                                                   │
│  Connector service                                                │
│  Refresh runner + audit log                                       │
└───────────────┬──────────────────────────────────────────────────┘
                │ spawn / stdio
┌───────────────▼──────────────────────────────────────────────────┐
│ External Agent CLI                                                │
│ Claude Code · Codex · Cursor Agent · Gemini CLI · OpenCode · Qwen │
│                                                                  │
│ Receives SKILL.md instructions and calls daemon tools via shell   │
└──────────────────────────────────────────────────────────────────┘
```

## 5. User-facing skill shape

Add a built-in skill:

```text
skills/live-artifact/
├── SKILL.md
├── references/
│   ├── artifact-schema.md
│   ├── connector-policy.md
│   └── refresh-contract.md
└── assets/
    └── templates/
        ├── dashboard.html
        └── report.html
```

### 5.1 `SKILL.md` frontmatter

```yaml
---
name: live-artifact
description: |
  Create refreshable, auditable Open Design artifacts backed by connector or local data.
  Trigger when the user asks for live dashboards, refreshable reports, synced views, or reusable data-backed artifacts.
triggers:
  - live artifact
  - refreshable dashboard
  - live report
  - synced view
  - 可刷新
  - 实时看板
od:
  mode: prototype
  preview:
    type: html
    entry: index.html
    reload: debounce-100
  design_system:
    requires: true
  outputs:
    primary: index.html
    secondary:
      - template.html
      - artifact.json
      - data.json
      - provenance.json
  capabilities_required:
    - shell
    - file_write
---
```

### 5.2 Skill body responsibilities

The skill should instruct the agent to:

1. Determine whether the user wants a live artifact or a normal static artifact.
2. Query available connectors and allowed read-only operations.
3. Fetch or ask the user for the required data source.
4. Create a safe render model, not raw provider output.
5. Write `template.html`, `data.json`, `artifact.json`, and `provenance.json` into the live artifact workspace directory; treat `index.html` as derived preview output.
6. Register the artifact through daemon tooling.
7. Include provenance and refresh source metadata.
8. Never store credentials, raw OAuth responses, headers, cookies, or tokens.

### 5.3 Agent-callable command surface

Prefer a small `od` wrapper command over raw `curl` in the skill body:

```bash
od tools live-artifacts create --input artifact.json
od tools live-artifacts list --format compact
od tools live-artifacts update --artifact-id "$ID" --input artifact.json
od tools live-artifacts refresh --artifact-id "$ID"
od tools connectors list --format compact
od tools connectors execute --connector github --tool list_releases --input input.json
```

The wrapper should be implemented as TypeScript source under `apps/daemon/src` and call daemon endpoints using injected runtime values:

- `OD_DAEMON_URL`
- `OD_TOOL_TOKEN`

The daemon injects these into the system prompt or skill preamble at runtime. The agent should not choose or override `projectId`; `/api/tools/*` derives project/run scope from `OD_TOOL_TOKEN`. If standalone JavaScript wrappers are later exposed, they must be generated build output from TypeScript source, not project-owned `.js` source files.

Raw HTTP is for developer debugging only and must include the run-scoped bearer token:

```bash
curl -s -X POST "$OD_DAEMON_URL/api/tools/live-artifacts/create" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $OD_TOOL_TOKEN" \
  -d @artifact.json
```

## 6. Daemon API design

### 6.1 Connector endpoints

```http
GET    /api/connectors
GET    /api/connectors/:connectorId
POST   /api/connectors/:connectorId/connect
DELETE /api/connectors/:connectorId/connection
```

MVP may stub OAuth-backed connectors and start with local/read-only connectors, but the API should preserve Monet's split between catalog and connection status. OAuth callback routes are deferred until OAuth-backed connectors are implemented.

Connector response shape:

```ts
type ConnectorDetail = {
  id: string;
  label: string;
  category: 'code' | 'docs' | 'files' | 'analytics' | 'custom';
  status: 'available' | 'connected' | 'error' | 'disabled';
  accountLabel?: string;
  featuredTools: ConnectorToolSummary[];
  allowedTools: ConnectorToolSummary[];
  minimumApprovalPolicy: 'read_only_auto' | 'confirm_write' | 'disabled';
  errorCode?: string;
};
```

### 6.2 Connector tool endpoints

Agent and refresh-runner connector execution must use the same daemon-owned execution path:

```http
GET  /api/tools/connectors/list
POST /api/tools/connectors/execute
```

`/api/tools/connectors/list` returns a compact list of connected, allowed, read-only-first tools for the current run token.

`/api/tools/connectors/execute` request:

```ts
type ConnectorExecuteRequest = {
  connectorId: string;
  toolName: string;
  input: BoundedJsonObject;
  purpose: 'agent_preview' | 'artifact_refresh';
};
```

Response:

```ts
type ConnectorExecuteResponse =
  | {
      ok: true;
      connectorId: string;
      accountLabel?: string;
      toolName: string;
      safety: ConnectorToolSafety;
      output: BoundedJsonValue;
      outputSummary?: string;
      providerExecutionId?: string;
      metadata?: BoundedJsonObject;
    }
  | ApiErrorResponse;
```

Execution rules:

- Require a valid `OD_TOOL_TOKEN` bound to the active run/project.
- Reject tools that are not in the connector catalog allowlist.
- Re-classify tool safety at execution time; catalog metadata alone is not authorization.
- Reject `write`, `destructive`, and `unknown` tools for `artifact_refresh`.
- Bound output size before it is returned to the agent.
- Redact credentials and raw provider envelope fields before returning or persisting anything.
- Record `providerExecutionId`, connector/account labels, and safety policy for provenance.

### 6.3 Live artifact endpoints

Agent/tool endpoints:

```http
POST /api/tools/live-artifacts/create
GET  /api/tools/live-artifacts/list
POST /api/tools/live-artifacts/update
POST /api/tools/live-artifacts/refresh
```

UI endpoints:

```http
GET   /api/live-artifacts?projectId=...
POST  /api/live-artifacts
GET   /api/live-artifacts/:artifactId
PATCH /api/live-artifacts/:artifactId
POST  /api/live-artifacts/:artifactId/refresh
GET   /api/live-artifacts/:artifactId/preview
```

The `/api/tools/*` endpoints are optimized for agent consumption: compact JSON, concise errors, and explicit machine-readable validation failures. They never accept an arbitrary `projectId`; project/run scope comes from `OD_TOOL_TOKEN`. The `/api/live-artifacts/*` endpoints are optimized for UI state and use the web app's normal project context.

Both endpoint families must call the same service-layer validation and storage code. Only authentication and response verbosity should differ; errors should share the `ApiErrorResponse` envelope from `packages/contracts`.

Agent-facing tool endpoints should reuse the shared API error envelope from `packages/contracts/src/errors.ts` instead of introducing a parallel error type:

```ts
type LiveArtifactToolResponse<TSuccess> = TSuccess | ApiErrorResponse;
```

Add live-artifact and connector-specific `ApiErrorCode` values such as `TOOL_TOKEN_INVALID`, `TOOL_TOKEN_EXPIRED`, `CONNECTOR_NOT_CONNECTED`, `CONNECTOR_SAFETY_DENIED`, `REFRESH_LOCKED`, `REFRESH_TIMED_OUT`, `OUTPUT_TOO_LARGE`, `TEMPLATE_BINDING_INVALID`, and `REDACTION_REQUIRED`. Validation details should live in the existing error `details` field so web, daemon, and tests share one error model.

## 7. Data model

### 7.1 Storage layout

Use project-scoped files under the daemon runtime data directory first. `OD_DATA_DIR` may override the default; otherwise `<RUNTIME_DATA_DIR>` is `<repo>/.od`:

```text
<RUNTIME_DATA_DIR>/projects/<projectId>/
└── .live-artifacts/
    └── <artifactId>/
        ├── artifact.json
        ├── template.html
        ├── index.html
        ├── data.json
        ├── provenance.json
        ├── refreshes.jsonl
        ├── tiles/
        │   └── <tileId>.json
        └── snapshots/
            └── <refreshId>/
                ├── data.json
                ├── render.json
                └── provenance.json
```

The dot-prefixed `.live-artifacts/` directory keeps implementation files out of the generic project file tree while preserving OD's file-first, inspectable-on-disk artifact philosophy. Add SQLite later only for cross-project indexing or high-volume refresh history.

`index.html` is a generated preview artifact, not the source of truth for refreshable data. The UI should load live artifacts through:

```http
GET /api/live-artifacts/:artifactId/preview
```

The preview route may serve the stored `index.html` for static cases, but for refreshable HTML it should render `template.html + data.json` and apply iframe sandbox/CSP headers. `snapshots/` should be hidden from the normal artifact tree unless the user explicitly opens refresh history.

### 7.2 Core types

```ts
type BoundedJsonValue =
  | null
  | boolean
  | number
  | string
  | BoundedJsonValue[]
  | { [key: string]: BoundedJsonValue };

type BoundedJsonObject = { [key: string]: BoundedJsonValue };

type LiveArtifact = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  sessionId?: string;
  createdByRunId?: string;
  title: string;
  slug: string;
  status: 'active' | 'archived' | 'error';
  pinned: boolean;
  preview: {
    type: 'html' | 'jsx' | 'markdown';
    entry: string;
  };
  refreshStatus: 'never' | 'idle' | 'running' | 'succeeded' | 'failed';
  createdAt: string;
  updatedAt: string;
  lastRefreshedAt?: string;
  tiles: LiveArtifactTile[];
  document?: LiveArtifactDocument;
};

type LiveArtifactDocument = {
  format: 'html_template_v1';
  templatePath: 'template.html';
  generatedPreviewPath: 'index.html';
  dataPath: 'data.json';
  dataJson: BoundedJsonObject;
  dataSchemaJson?: BoundedJsonObject;
  sourceJson?: LiveArtifactTileSource;
};

type LiveArtifactTile = {
  id: string;
  kind: 'metric' | 'table' | 'chart' | 'markdown' | 'link_card' | 'json' | 'html_document';
  title: string;
  renderJson: LiveArtifactRenderJson;
  sourceJson?: LiveArtifactTileSource;
  provenanceJson: LiveArtifactProvenance;
  refreshStatus: 'not_refreshable' | 'idle' | 'running' | 'succeeded' | 'failed';
  lastError?: string;
};

type LiveArtifactRenderJson =
  | { type: 'metric'; label: string; value: string | number; unit?: string; delta?: string; tone?: 'neutral' | 'good' | 'warning' | 'bad' }
  | { type: 'table'; columns: Array<{ key: string; label: string }>; rows: BoundedJsonObject[]; maxRows?: number }
  | { type: 'chart'; chartType: 'bar' | 'line' | 'area' | 'pie'; xKey: string; yKeys: string[]; rows: BoundedJsonObject[] }
  | { type: 'markdown'; markdown: string }
  | { type: 'link_card'; title: string; url: string; description?: string }
  | { type: 'json'; value: BoundedJsonValue }
  | { type: 'html_document'; documentPath: 'template.html' | 'index.html'; dataPath: 'data.json' };

type LiveArtifactTileSource = {
  type: 'local_file' | 'daemon_tool' | 'connector_tool';
  toolName?: string;
  input: BoundedJsonObject;
  connector?: {
    connectorId: string;
    accountLabel?: string;
    toolName: string;
    approvalPolicy: 'read_only_auto' | 'manual_refresh_granted_for_read_only';
  };
  outputMapping?: {
    dataPaths?: Array<{ from: string; to: string }>;
    transform?: 'identity' | 'compact_table' | 'metric_summary';
  };
  refreshPermission: 'none' | 'manual_refresh_granted_for_read_only';
};

type LiveArtifactProvenance = {
  generatedAt: string;
  generatedBy: 'agent' | 'refresh_runner';
  notes?: string;
  sources: Array<{
    label: string;
    type: 'connector' | 'local_file' | 'user_input' | 'derived';
    ref?: string;
  }>;
};
```

### 7.3 Validation rules

Port Monet's strict validation posture:

- Limit object depth, array length, string length, and total serialized size.
- Allow only `http:` and `https:` URLs in render metadata.
- Reject keys such as `raw`, `rawResponse`, `payload`, `body`, `headers`, `cookie`, `authorization`, `token`, `secret`, `credential`, `password`.
- Redact suspicious source inputs before persistence.
- Reject source inputs that still contain credential-like values after redaction.
- Disallow executable script in persisted render JSON.
- HTML preview files must be generated from the document contract; refresh updates `data.json` / render JSON, not arbitrary script.

### 7.4 HTML document model

MVP live HTML artifacts should use `html_template_v1`:

```text
template.html + data.json → daemon render step → index.html / preview response
```

Rules:

- `template.html` is authored by the agent during create/update.
- Refreshable values must come from `data.json`, not be hardcoded only in HTML.
- The template can use a small deterministic binding syntax such as `{{data.path.to.value}}` and repeated sections declared in comments or `data-od-repeat` attributes. The exact binding grammar must be specified in `skills/live-artifact/references/refresh-contract.md` before implementation.
- Refresh updates `data.json`, `tiles/*.json`, and snapshots. It does not let connector output rewrite arbitrary HTML.
- If a presentation redesign is needed, the user should ask the agent to update the artifact; refresh is for data changes.
- `index.html` may be regenerated after successful refresh, but it is derived output.
- The preview route must serve the document in a sandboxed iframe context with a restrictive CSP. External scripts are disallowed in MVP unless vendored and allowlisted.

## 8. Runtime flows

### 8.1 Create flow

```text
User asks for a live dashboard
  ↓
OD selects/injects live-artifact skill
  ↓
Agent queries connectors or local sources through daemon wrapper
  ↓
Agent writes template.html + artifact.json + data.json + provenance.json
  ↓
Agent calls live-artifacts create endpoint
  ↓
Daemon validates schemas, source metadata, file paths, and template binding
  ↓
Daemon stores artifact metadata and returns compact summary
  ↓
Web UI opens /api/live-artifacts/:artifactId/preview
```

### 8.2 Refresh flow

```text
User clicks Refresh
  ↓
UI POST /api/live-artifacts/:id/refresh
  ↓
Daemon loads artifact.json and refreshable tiles
  ↓
For each tile:
  - verify refreshPermission
  - verify connector still connected
  - verify tool is still read-only
  - verify accountLabel/connectorId did not drift
  - verify saved input matches current schema
  - execute source
  - map output through declarative outputMapping.dataPaths
  - update candidate dataJson/renderJson
  - validate sanitized render model
  ↓
Write refresh step to refreshes.jsonl
  ↓
If every refreshable tile succeeds, commit data.json, tiles, snapshot, and regenerated preview
If any tile fails, keep previous data/preview, write failed refresh record, and surface the error
```

MVP refresh is **artifact-level all-or-nothing**. Tile-level partial success can be added later, but v1 should avoid mixed stale/fresh dashboards.

Refresh runner requirements:

- Acquire a per-artifact refresh lock. Reject or queue concurrent refreshes.
- Assign a monotonic `refreshId`; stale refreshes cannot overwrite newer committed data.
- Enforce per-source and total refresh timeouts.
- Persist every step to `refreshes.jsonl` with status, duration, connector metadata, and compact error.
- On daemon restart, recover refreshes stuck in `running` past timeout as `failed` and keep the last valid preview.
- Write snapshots only after validation succeeds, or write failed attempts under a separate `snapshots/<refreshId>/failed/` directory that is not used for preview.

### 8.3 Update flow

Agent or UI can update title, pinned status, archive status, preview entry, or non-source presentation fields. Updating `sourceJson` requires the same validation as create.

## 9. Connector strategy

### 9.1 Read-only v1

MVP should only expose read-only connector tools to automatic or refresh execution.

Write actions can exist later, but they must require explicit user confirmation and should not be refreshable.

Safety classification:

```ts
type ConnectorToolSafety = {
  sideEffect: 'read' | 'write' | 'destructive' | 'unknown';
  approval: 'auto' | 'confirm' | 'disabled';
  reason: string;
};
```

Rules:

- OAuth scopes or names containing `write`, `create`, `update`, `delete`, `admin`, `send`, `post`, `manage` imply write/confirm.
- Destructive hints imply destructive/disabled for refresh.
- Explicit read-only hints can be read/auto.
- Unknown defaults to write/confirm, not read/auto.

### 9.2 Execute-time enforcement

Connector policy must be enforced at execution and refresh time, not only when the catalog is built:

- Catalog classification is metadata, not authorization.
- `/api/tools/connectors/execute` re-checks allowlist, current scopes, tool safety, and connector status.
- Saved artifact policy cannot grant new permission by itself.
- `unknown`, `write`, and `destructive` tools are never refreshable.
- If a previously read-only tool later appears write-capable because scopes or provider metadata changed, refresh must fail closed.
- A write action may be supported in the future with explicit confirmation, but it must not be stored as a refreshable source.
- Agent calls and refresh-runner calls must share the same connector execution service so audit and safety behavior cannot drift.

### 9.3 Credential storage

Default decision:

- OAuth connection state and credentials live outside project artifacts, under a daemon-controlled global store such as `~/.open-design/connectors/` or an app database.
- Project artifacts only store stable references: `connectorId`, `accountLabel`, provider tool id/name, minimized input, and provenance.
- Access tokens, refresh tokens, headers, cookies, OAuth state, and raw provider responses are never written under `<RUNTIME_DATA_DIR>/projects/<projectId>/.live-artifacts` or any other project artifact directory.
- Refresh resolves credentials through the daemon connector service at execution time.
- UI must show the connector/account label so users understand which global connection backs a project artifact.

### 9.4 Initial connector candidates

MVP can avoid OAuth complexity by shipping local daemon tools first:

- `project_files.search`
- `project_files.read_json`
- `git.summary`
- `github.public_repo_summary` using unauthenticated public API or user-provided token later

OAuth-backed providers can follow the Monet pattern after the artifact pipeline is stable:

- GitHub
- Notion
- Google Drive
- Linear

## 10. UI changes

### 10.1 Entry header connector tab

Add a `Connectors` tab to the entry-header navigation. When selected, it should show cards for available external and local connectors.

Connector cards should include, as data becomes available:

- connector name and provider/category
- connection status
- connected account label, when connected
- connect, disconnect, or configure action
- available read-only tools/capabilities, when useful

This tab is a workspace-level connector management surface, not a separate project type. Phase 1B may show stubbed or local-only connector card data; full external connector status, connect/disconnect actions, and OAuth-backed flows belong to the connector phase.

### 10.2 New project live artifact entry

Add `New live artifact` to the new project tabs. Selecting it should start the normal project creation flow with live-artifact intent and the `live-artifact` skill path preselected or strongly hinted.

This creates a normal project/design whose first output is expected to be a live artifact. It should not create a separate top-level project type unless the product model changes later.

Live artifacts should also be listed in the existing `Designs` tab. The `Designs` tab should continue to show normal designs/projects, and it should additionally surface live artifacts as first-class selectable entries associated with their parent project/design. Live artifact entries should be visually distinguishable with `Live` / `Refreshable` status and should open directly into the project workspace with the corresponding live artifact selected. Parent design cards may also show a small live-artifact count or status summary.

### 10.3 Artifact tree

Show live artifacts as a first-class virtual group in the existing artifact tree, not as raw nested files. The tree should show one node per live artifact and hide implementation files such as `snapshots/` by default.

`ProjectView.tsx` should fetch `GET /api/live-artifacts?projectId=...` alongside the existing project file fetch, then merge live artifacts into the workspace state as a discriminated item such as `kind: 'live-artifact'`. Use namespaced tab IDs such as `live:<artifactId>` so live artifacts cannot collide with file paths. `FileWorkspace.tsx` should render these items in a virtual group and route open/select actions to a live artifact viewer without treating artifact IDs as normal project file paths.

Badges:

- `Live`
- `Refreshable`
- `Refreshing...`
- `Refresh failed`
- `Archived`

### 10.4 Preview panel

Reuse existing iframe/file viewer where possible:

- Load `GET /api/live-artifacts/:artifactId/preview` in the iframe instead of opening nested files directly.
- Add read-only viewer toolbar tabs using the existing `FileViewer.tsx` / `HtmlViewer` tab pattern: `Preview`, `Source`, `Data`, `Provenance`, `Refresh history`. Do not require a new split-pane side panel in Phase 1B.
- Show refresh button only when at least one tile is refreshable. When `refreshStatus` is `running`, the button should be disabled and show a loading state to prevent duplicate refreshes.

Data sources for viewer tabs:

- `Source`: `artifact.json` `sourceJson` fields with credentials redacted.
- `Data`: current `data.json` and tile render summaries.
- `Provenance`: `provenance.json` and connector/account labels.
- `Refresh history`: parsed `refreshes.jsonl`, newest first.

### 10.5 Chat integration

When an agent creates or updates a live artifact, the daemon should emit an agent/UI event similar to produced files so the UI can open it automatically. For MVP, extend the existing chat SSE stream in `packages/contracts/src/sse/chat.ts` rather than creating a second live-artifact SSE connection. `apps/web/src/providers/daemon.ts` should translate the SSE payload into a UI `AgentEvent` such as `kind: 'live_artifact_update'`, and `ProjectView.tsx` should use that event to refresh the live artifact list and auto-open the artifact using the same open-request flow used for produced files.

Suggested event:

```ts
type LiveArtifactEvent = {
  type: 'live_artifact_created' | 'live_artifact_updated' | 'live_artifact_refresh_completed';
  artifactId: string;
  title: string;
  previewUrl?: string;
  status: string;
};
```

## 11. Implementation plan

### Phase 0 — Contracts first

- Add this spec.
- Add shared TypeScript DTOs under `packages/contracts`, keeping the package pure TypeScript and free of Next.js, Express, filesystem/process APIs, browser APIs, SQLite, daemon internals, and sidecar control-plane dependencies.
- Add shared contract DTOs for `LiveArtifact`, `LiveArtifactTile`, `LiveArtifactTileSource`, and connector catalog entries. Runtime validation schemas belong under daemon source, especially `apps/daemon/src/live-artifacts/schema.ts`, and should consume or mirror the shared contract types without adding daemon internals to `packages/contracts`.
- Add or update contract files such as:
  - `packages/contracts/src/api/live-artifacts.ts`
  - `packages/contracts/src/api/connectors.ts`
  - `packages/contracts/src/sse/chat.ts`
  - `packages/contracts/src/examples.ts`
  - `packages/contracts/src/index.ts`
- Add fixture artifacts under `specs/2026-04-29-live-artifacts/examples/`.
- Extend `packages/contracts/src/errors.ts` with live artifact / connector error codes instead of defining a second error envelope.
- Define `html_template_v1` binding grammar and example `template.html + data.json`.

Exit criteria:

- Schemas reject raw provider response fields and credential-like values.
- Example artifact can be rendered from `template.html + data.json` through the preview contract.

### Phase 1A — Register static local live artifacts

- Implement daemon live artifact service.
- Implement project-scoped file storage under `<RUNTIME_DATA_DIR>/projects/<projectId>/.live-artifacts`.
- Add `/api/tools/live-artifacts/create` and `list`.
- Add `GET /api/live-artifacts?projectId=...` and `GET /api/live-artifacts/:artifactId`.
- Add run-scoped `OD_TOOL_TOKEN` for tool endpoints.

Exit criteria:

- A static `html_template_v1` artifact can be registered without connectors or refresh.
- The daemon rejects invalid paths, raw provider fields, and credential-like values.

### Phase 1B — UI preview integration

- Add `GET /api/live-artifacts/:artifactId/preview`.
- Render `template.html + data.json` into a sandboxed iframe response.
- Fetch live artifacts alongside project files and show them as virtual nodes in the artifact tree.
- Add a `LiveArtifactViewer` path in `FileViewer.tsx` that reuses the existing HTML viewer toolbar/iframe patterns.
- Add read-only `Preview`, `Source`, `Data`, `Provenance`, and `Refresh history` viewer tabs.

Exit criteria:

- UI can list and preview a registered live artifact.
- Preview does not require exposing `snapshots/` or implementation files as normal project files.

### Phase 1C — Built-in skill and wrapper command

- Add built-in `skills/live-artifact/SKILL.md`.
- Add `od tools live-artifacts ...` and connector command handlers from TypeScript source under `apps/daemon/src`.
- Inject daemon URL and short-lived tool token into skill preamble.

Exit criteria:

- Agent can create a live artifact using local data.
- UI can list and preview it.
- No MCP configuration is required.

### Phase 2 — Refresh runner

- Add `refreshes.jsonl` audit log.
- Implement manual refresh for local daemon tools.
- Implement per-artifact refresh lock, timeout, stale-write protection, and crash recovery.
- Preserve previous render on validation failure.
- Emit chat-stream UI refresh events and update viewer refresh loading/failure state.

Exit criteria:

- User can click Refresh and see updated data.
- Failed refresh leaves old preview intact and shows actionable error.

### Phase 3 — Connector catalog and read-only connector tools

- Port Monet connector catalog/service shape.
- Add connector endpoints.
- Add `/api/tools/connectors/list` and `/api/tools/connectors/execute`.
- Add read-only tool classification.
- Add first real read-only connector.
- Extend `live-artifact` skill references with connector usage instructions.

Exit criteria:

- Agent can query available connectors.
- Agent can create a refreshable artifact from a read-only connector.
- Refresh revalidates connector, account, tool, and approval policy.

### Phase 4 — Optional MCP wrapper

- Wrap the daemon's existing live artifact and connector services as an MCP server for agents that support MCP well.
- Do not make MCP required.
- Do not mutate global user MCP config automatically.

Exit criteria:

- Claude Code or another MCP-capable agent can discover equivalent tools through MCP.
- Skill + CLI path still works unchanged.

## 12. File-level landing plan

Likely new files:

```text
packages/contracts/src/api/live-artifacts.ts
packages/contracts/src/api/connectors.ts
packages/contracts/src/examples.ts
apps/daemon/src/live-artifacts/schema.ts
apps/daemon/src/live-artifacts/store.ts
apps/daemon/src/live-artifacts/render.ts
apps/daemon/src/live-artifacts/refresh.ts
apps/daemon/src/live-artifacts/routes.ts
apps/daemon/src/connectors/catalog.ts
apps/daemon/src/connectors/service.ts
apps/daemon/src/connectors/routes.ts
apps/daemon/src/tools/live-artifacts.ts
apps/daemon/src/tools/connectors.ts
skills/live-artifact/SKILL.md
skills/live-artifact/references/artifact-schema.md
skills/live-artifact/references/connector-policy.md
skills/live-artifact/references/refresh-contract.md
```

Likely touched files:

```text
packages/contracts/src/errors.ts
packages/contracts/src/index.ts
packages/contracts/src/sse/chat.ts
apps/daemon/src/server.ts
apps/daemon/src/skills.ts
apps/daemon/src/cli.ts
apps/web/src/providers/daemon.ts
apps/web/src/providers/registry.ts
apps/web/src/components/EntryView.tsx
apps/web/src/components/NewProjectPanel.tsx
apps/web/src/components/ProjectView.tsx
apps/web/src/components/DesignsTab.tsx
apps/web/src/components/FileWorkspace.tsx
apps/web/src/components/FileViewer.tsx
apps/web/src/components/PreviewModal.tsx
apps/web/src/types.ts
apps/web/src/prompts/system.ts
```

Keep the first implementation small: current daemon route handlers live in `apps/daemon/src/server.ts`, so either mount live artifact routes there first or add small TypeScript route modules that are imported by `server.ts`. Do not add project-owned `.js` source files; JavaScript should only be generated build output or an explicitly documented compatibility artifact.

## 13. Security and trust model

### 13.1 Daemon must enforce

- `/api/tools/*` requires a short-lived bearer `OD_TOOL_TOKEN`.
- Tool tokens are minted per agent run and bind `runId`, `projectId`, allowed endpoints, allowed operations, and expiry.
- `/api/tools/*` derives project/run scope from the token and rejects request-supplied project overrides.
- CORS for local daemon tool endpoints is closed by default; UI endpoints use the web app's normal origin/session checks.
- Defend against CSRF and DNS rebinding on localhost endpoints.
- Project ID exists and maps to the active workspace.
- All file paths stay inside the project workspace.
- Tool output size is bounded.
- Snapshot/history size and retention are bounded.
- Refresh execution has timeout and cancellation.
- Connector credentials never reach agent output or artifact files.
- Source input is minimized and redacted.
- Read-only refreshes cannot drift into write-capable tools.
- Preview responses use iframe sandboxing and restrictive CSP.

### 13.2 Skill must instruct

- Do not paste raw connector responses into `artifact.json`.
- Do not store tokens, headers, cookies, or credentials.
- Prefer summaries, normalized rows, and derived metrics.
- Keep `data.json` compact and preview-oriented.
- Use daemon tool endpoints for registration and refresh metadata.
- Use wrapper commands rather than constructing raw HTTP unless debugging.

### 13.3 UI must communicate

- Which connector/account backs the artifact.
- When it was last refreshed.
- Whether refresh is manual only.
- Why a refresh failed.

## 14. Non-goals

- No MCP-first implementation in MVP.
- No arbitrary write-capable connector refresh.
- No raw provider response storage.
- No multi-user auth model.
- No cloud-hosted connector broker in v1.
- No new canvas abstraction separate from OD's existing artifact/preview model.

## 15. Open questions

1. Should `od tools ...` be the only wrapper surface, or should generated per-project wrappers also be provided for easier agent access?
2. How should agent adapters advertise `shell` availability for skill gating?
3. What exact binding grammar should `html_template_v1` support in MVP: Mustache-style only, `data-od-*` attributes, or both?
4. How much refresh history should be retained before compaction?
5. Should failed refresh attempt payloads be retained in a hidden failed snapshot directory, or only summarized in `refreshes.jsonl`?

## 16. Acceptance criteria

- A built-in `live-artifact` skill can be discovered by the existing skill registry.
- An agent can create a live artifact without MCP.
- The daemon validates and persists live artifact metadata.
- The UI can list and preview the artifact.
- Manual refresh works for at least one local read-only source.
- Refresh failures are audited and do not destroy the last valid preview.
- Connector-backed refresh is read-only and revalidated before every run.
- `/api/tools/*` calls require run-scoped auth and cannot override project scope.
- No persisted artifact fixture contains raw credentials, headers, cookies, or full provider payloads.

## 17. Recommended first slice

Implement the smallest useful vertical slice:

1. `skills/live-artifact/SKILL.md`
2. `packages/contracts/src/api/live-artifacts.ts`
3. `apps/daemon/src/live-artifacts/schema.ts`
4. `apps/daemon/src/live-artifacts/store.ts`
5. `POST /api/tools/live-artifacts/create`
6. `GET /api/live-artifacts?projectId=...`
7. `GET /api/live-artifacts/:artifactId/preview`
8. UI list + virtual live-artifact node + sandboxed preview

This proves the skill-based interface and storage model before adding connectors, OAuth, refresh runner complexity, or MCP wrappers.
