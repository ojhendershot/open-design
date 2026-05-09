# Open Design Plugin & Marketplace — Implementation Plan (living)

Source spec: [`docs/plugins-spec.md`](../plugins-spec.md) (zh-CN: [`docs/plugins-spec.zh-CN.md`](../plugins-spec.zh-CN.md)).

Sibling docs: [`spec.md`](../spec.md) · [`skills-protocol.md`](../skills-protocol.md) · [`architecture.md`](../architecture.md).

Update protocol — read first

- This file is a **living roadmap**. Every PR that lands a chunk of the plugin system must flip the matching `[ ]` to `[x]` in the same PR, and update §3 "Architecture state" if a new module / table / endpoint becomes real.
- Do not edit `docs/plugins-spec.md` from this file's PRs except to fix factual drift; the spec is the contract, this file is the schedule.
- The "Definition of done" gates in §8 are the **only** hard sign-off bar; an empty checkbox under a phase does not mean v1 is broken — only an empty checkbox under §8 does.
- When `docs/plugins-spec.md` patches change phase numbering or atom names, mirror those changes here in the same PR (per §21.6 / §22.5 / §23.6 of the spec).

---

## 1. Invariants (lock these first; never violate without a spec patch)

These are the five rules that decide every downstream design decision. They sit above phases and are checked by reviewers on every plugin-related PR.

- [x] **I1. `SKILL.md` is the floor; `open-design.json` is a sidecar; never bidirectionally couple.** `packages/plugin-runtime/adapters/agent-skill.ts` synthesizes a schema-valid `PluginManifest` from `SKILL.md` `od:` frontmatter (verified via `packages/plugin-runtime/tests/adapter-agent-skill.test.ts`). The bundled e2e fixture under `apps/daemon/tests/fixtures/plugin-fixtures/sample-plugin/` ships both halves and `apps/daemon/tests/plugins-e2e-fixture.test.ts` exercises the merger.
- [x] **I2. Apply is a pure function; side effects only after `POST /api/projects` / `POST /api/runs`.** `apps/daemon/src/plugins/apply.ts` is FS- and DB-free; the snapshot writer (`snapshots.ts`) and installer are the only modules that mutate persistent state. `apps/daemon/tests/plugins-apply.test.ts` asserts deterministic snapshots from the same inputs and refuses to touch the registry / FS.
- [x] **I3. `AppliedPluginSnapshot` is the only contract between "plugin" and "run".** `composeSystemPrompt()` now accepts a `pluginBlock` derived from the snapshot via `pluginPromptBlock(snapshot)` (`apps/daemon/src/plugins/apply.ts`); the run reads context through the snapshot. Plugin runs in web API-fallback mode are rejected at the HTTP layer (Phase 2A wires the 409); the snapshot table is the only writable surface for the contract.
- [ ] **I4. CLI is the canonical agent-facing API; UI mirrors CLI, not the other way round.** Phase 1: `od plugin install/list/info/uninstall/apply/doctor` and the matching `/api/plugins/*` HTTP routes ship in the same PR. Remaining `od project/run/files/conversation/marketplace` subcommands roll in over Phase 1 / 2C / 3 PRs.
- [x] **I5. Kernel/userspace boundary (spec §23) is drawn from day 1.** `composeSystemPrompt()` is structured as a pure assembler with a content table (DESIGN.md, craft, skill, plugin block, metadata); the new `pluginBlock` parameter slots in without restructuring. Phase 2A lifts the renderer into `packages/contracts/src/prompts/plugin-block.ts` (PB1).

CI guard placement: each invariant must have at least one automated test that fails when the rule is violated. The test path is recorded next to the box when it lands.

---

## 2. Layered architecture target (where every new file goes)

```text
packages/contracts/src/plugins/      ← pure types + Zod schemas, no runtime deps
  ├── manifest.ts                    ← PluginManifest, GenUISurfaceSpec, PluginPipeline
  ├── context.ts                     ← ContextItem union (spec §5.2)
  ├── apply.ts                       ← ApplyResult, AppliedPluginSnapshot, InputFieldSpec
  ├── marketplace.ts                 ← MarketplaceManifest
  ├── installed.ts                   ← InstalledPluginRecord, TrustTier ('bundled' | 'trusted' | 'restricted')
  └── events.ts                      ← GenUIEvent + pipeline_stage_* variants joined into PersistedAgentEvent

packages/plugin-runtime/             ← pure TS; reusable in web / daemon / CI
  ├── parsers/{manifest,marketplace,frontmatter}.ts
  ├── adapters/{agent-skill,claude-plugin}.ts
  ├── merge.ts                       ← sidecar + adapter merge; open-design.json wins
  ├── resolve.ts                     ← ContextItem ref resolution (pure; no FS reads)
  ├── validate.ts                    ← JSON Schema validation
  └── digest.ts                      ← manifestSourceDigest (frozen algorithm; CI fixtures)

apps/daemon/src/plugins/             ← side-effect concentration zone
  ├── registry.ts                    ← three-tier scan + hot reload (existing skills.ts/design-systems.ts/craft.ts delegate here)
  ├── installer.ts                   ← github tarball / https / local / marketplace
  ├── apply.ts                       ← pure resolver; emits ApplyResult + draft snapshot
  ├── snapshots.ts                   ← §8.2.1 — the **only** writer to applied_plugin_snapshots
  ├── pipeline.ts                    ← §10.1 stage scheduler + §10.2 devloop + until evaluator
  ├── connector-gate.ts              ← §9 capability gate, called by tool-tokens.ts and /api/tools/connectors/execute
  ├── trust.ts                       ← installed_plugins.capabilities_granted writer
  └── doctor.ts                      ← schema + connector catalog + MCP dry-launch + atom refs

apps/daemon/src/genui/               ← spec §10.3
  ├── registry.ts
  ├── events.ts
  └── store.ts                       ← genui_surfaces table writer
```

Hard layering rules

- `packages/plugin-runtime` does not import `node:fs`. It receives `loader: (relpath) => Promise<string>`. Daemon injects real FS, CI injects mocks, web preview sandbox injects fetch.
- `apps/daemon/src/plugins/snapshots.ts` is the only file that issues `INSERT/UPDATE` against `applied_plugin_snapshots`. CI guard: `rg "applied_plugin_snapshots" --type ts -g '!**/*.test.ts'` may match `INSERT` only inside `snapshots.ts`.
- `connector-gate.ts` is a stateless validator (`(snapshotId, connectorId) => allow | deny`); `tool-tokens.ts` calls it before issuing a token, and `/api/tools/connectors/execute` re-validates on every call to defeat token replacement.

---

## 3. Architecture state (update as modules land)

This section tracks **what exists in the repo today**. Update in the same PR that lands the module; never let it lie about reality.

### 3.1 Packages

| Path | Status | Notes |
| --- | --- | --- |
| `packages/contracts/src/plugins/manifest.ts` | shipped | Phase 0 — Zod schema + `PluginManifest` type |
| `packages/contracts/src/plugins/context.ts` | shipped | Phase 0 — `ContextItem`, `ResolvedContext` |
| `packages/contracts/src/plugins/apply.ts` | shipped | Phase 0 — `ApplyResult`, `AppliedPluginSnapshot`, `InputFieldSpec` |
| `packages/contracts/src/plugins/marketplace.ts` | shipped | Phase 0 — `MarketplaceManifest`, `TrustTier`, `MarketplaceTrust` |
| `packages/contracts/src/plugins/installed.ts` | shipped | Phase 0 — `InstalledPluginRecord`, `PluginSourceKind` |
| `packages/contracts/src/plugins/events.ts` | shipped | Phase 0 — placeholder variants for `pipeline_stage_*` and `genui_*` |
| `packages/contracts/src/prompts/plugin-block.ts` | absent | Phase 2A (PB1); `renderPluginBlock(snapshot)` pure function shared by daemon + contracts composers |
| `packages/plugin-runtime/` | shipped | Phase 1 — pure TS package: parsers, adapters, merge, resolve, validate, digest |

### 3.2 Daemon modules

| Path | Status | Notes |
| --- | --- | --- |
| `apps/daemon/src/skills.ts` | exists | Phase 1: independent loader; Phase 2A folds into `plugins/registry.ts` |
| `apps/daemon/src/design-systems.ts` | exists | same as above |
| `apps/daemon/src/craft.ts` | exists | same as above |
| `apps/daemon/src/connectors/` | exists | reused as-is by `connector-gate.ts` |
| `apps/daemon/src/tool-tokens.ts` | exists | Phase 2A: wire to `connector-gate.ts` |
| `apps/daemon/src/prompts/system.ts` | shipped | Phase 1 — `composeSystemPrompt()` accepts `pluginBlock` derived from snapshot |
| `apps/daemon/src/server.ts` | shipped | Phase 1 — `/api/plugins/*`, `/api/atoms`, `/api/applied-plugins/:snapshotId` mounted |
| `apps/daemon/src/cli.ts` | shipped | Phase 1 — `od plugin list/info/install/uninstall/apply/doctor` |
| `apps/daemon/src/plugins/registry.ts` | shipped | Phase 1 — install root scan, manifest parse, SQLite reader/writer |
| `apps/daemon/src/plugins/installer.ts` | shipped | Phase 1 — local-folder install only; symlink + traversal + size guards |
| `apps/daemon/src/plugins/apply.ts` | shipped | Phase 1 — pure resolver; emits `ApplyResult` + draft snapshot |
| `apps/daemon/src/plugins/snapshots.ts` | shipped | Phase 1 — sole writer of `applied_plugin_snapshots`; PB2 expires_at stamping |
| `apps/daemon/src/plugins/atoms.ts` | shipped | Phase 1 — first-party atom catalog (spec §10) |
| `apps/daemon/src/plugins/connector-gate.ts` | shipped | Phase 2A — apply path connector resolution + token-issuance gate |
| `apps/daemon/src/plugins/pipeline.ts` | shipped | Phase 2A — devloop scheduler + `until` evaluator + `OD_MAX_DEVLOOP_ITERATIONS` |
| `apps/daemon/src/plugins/pipeline-runner.ts` | shipped | Phase 2A — runs pipeline against a live run, emits stage + GenUI events |
| `apps/daemon/src/plugins/resolve-snapshot.ts` | shipped | Phase 2A — snapshot resolver wired into `POST /api/projects` + `/api/runs` |
| `apps/daemon/src/plugins/marketplaces.ts` | shipped | Phase 3 entry slice — add / list / refresh / remove / trust |
| `apps/daemon/src/plugins/gc.ts` | shipped | Phase 5 (early) — snapshot GC worker + boot sweep |
| `apps/daemon/src/plugins/trust.ts` | shipped | Phase 1 + Phase 2A — `validateCapabilityList`, `grantCapabilities`, `revokeCapabilities` |
| `apps/daemon/src/plugins/doctor.ts` | shipped | Phase 1 (manifest + atom + ref checks) → expanded Phase 3 |
| `apps/daemon/src/genui/registry.ts` | shipped | Phase 2A — F8 cross-conversation cache + lifecycle |
| `apps/daemon/src/genui/events.ts` | shipped | Phase 2A — `genui_*` + `pipeline_stage_*` event payload helpers |
| `apps/daemon/src/genui/store.ts` | shipped | Phase 2A — sole writer of `genui_surfaces`, prefill / lookup / revoke |

### 3.3 SQLite tables

| Table | Status | Phase |
| --- | --- | --- |
| `installed_plugins` | shipped | Phase 1 — `source_kind` enum permissive (`bundled` allowed) per F3 |
| `plugin_marketplaces` | shipped | Phase 1 — schema only; populated in Phase 3 |
| `applied_plugin_snapshots` | shipped | Phase 1 — full §11.4 shape with `expires_at`; GC worker lands Phase 5 |
| `runs.applied_plugin_snapshot_id` ALTER | n/a | runs are in-memory in `apps/daemon/src/runs.ts`; the in-memory run carries the snapshot id until runs become a SQL table |
| `conversations.applied_plugin_snapshot_id` ALTER | shipped | Phase 1 — column added by `migratePlugins()` |
| `projects.applied_plugin_snapshot_id` ALTER | shipped | Phase 1 — column added by `migratePlugins()` |
| `run_devloop_iterations` | shipped | Phase 2A |
| `genui_surfaces` | shipped | Phase 2A — three indexes per §11.4 |

### 3.4 HTTP endpoints

| Endpoint | Status | Phase |
| --- | --- | --- |
| `GET /api/plugins` | shipped | Phase 1 |
| `GET /api/plugins/:id` | shipped | Phase 1 |
| `POST /api/plugins/install` (SSE) | shipped | Phase 1 — local-folder source only; tarball lands Phase 2A |
| `POST /api/plugins/:id/uninstall` | shipped | Phase 1 |
| `POST /api/plugins/:id/apply` | shipped | Phase 1 — emits `ApplyResult` + manifest digest (no run side-effects) |
| `POST /api/plugins/:id/doctor` | shipped | Phase 1 — manifest lint + atom + ref check |
| `GET /api/atoms` | shipped | Phase 1 — first-party atom catalog |
| `GET /api/applied-plugins/:snapshotId` | shipped | Phase 1 — used by run replay tooling |
| `POST /api/runs/:runId/replay` | shipped | Phase 2A |
| `GET /api/plugins/:id/preview` | absent | Phase 2B (sandboxed per §9.2) |
| `GET /api/plugins/:id/example/:name` | absent | Phase 2B |
| `POST /api/plugins/:id/trust` | shipped | Phase 2A — capability grant / revoke against §5.3 vocabulary |
| `GET / POST /api/marketplaces` | shipped | Phase 3 entry slice |
| `POST /api/marketplaces/:id/trust` | shipped | Phase 3 entry slice |
| `GET /api/marketplaces/:id/plugins` | shipped | Phase 3 entry slice |
| `GET /api/runs/:runId/devloop-iterations` | shipped | Phase 2A |
| `GET /api/runs/:runId/genui` | shipped | Phase 2A |
| `GET /api/projects/:projectId/genui` | shipped | Phase 2A |
| `POST /api/runs/:runId/genui/:surfaceId/respond` | shipped | Phase 2A |
| `POST /api/projects/:projectId/genui/:surfaceId/revoke` | shipped | Phase 2A |
| `POST /api/projects/:projectId/genui/prefill` | shipped | Phase 2A |
| `GET /api/applied-plugins` | shipped | Phase 5 (early) — audit list |
| `GET /api/projects/:projectId/applied-plugins` | shipped | Phase 5 (early) |
| `POST /api/applied-plugins/prune` | shipped | Phase 5 (early) — operator escape hatch |
| `GET /api/daemon/status` | shipped | Phase 1.5 |
| `POST /api/daemon/shutdown` | shipped | Phase 1.5 — loopback-only |
| `GET /api/runs/:runId/agui` | absent | Phase 4 |

### 3.5 CLI subcommands

| Command | Status | Phase |
| --- | --- | --- |
| `od plugin install/list/info/uninstall/apply/doctor` | shipped | Phase 1 + Phase 2A — install accepts local / `github:` / `https://*.tar.gz` / **bare plugin name** (Phase 3 resolution) |
| `od plugin run` apply→start shorthand | shipped | Phase 2A — `--inputs`, `--input k=v`, `--grant-caps`, `--follow` |
| `od plugin trust` (with `connector:<id>` form) + `--revoke` | shipped | Phase 2A — backed by `POST /api/plugins/:id/trust` |
| `od plugin snapshots list / prune` | shipped | Phase 5 (early) — operator escape hatch |
| `od plugin replay` | shipped | Phase 2A |
| `od ui list/show/respond/revoke/prefill` | shipped | Phase 2A |
| `od marketplace add/list/info/refresh/remove/trust` | shipped | Phase 3 entry slice |
| `od project create/list/info/delete` | shipped | Phase 1 follow-up — accepts `--plugin/--inputs/--grant-caps` |
| `od run start/watch/cancel/list/info` (with `--follow`, ND-JSON) | shipped | Phase 1 follow-up |
| `od files list/read/write/upload/delete` | shipped | Phase 1 follow-up + Phase 2C |
| `od daemon start --headless / --serve-web / status / stop` | shipped | Phase 1.5 |
| `od conversation list/info` | shipped | Phase 2C entry slice |
| `od files diff` | absent | Phase 2C |
| `od project import` (CLI wrapper of `/api/import/folder`) | absent | Phase 2C |
| `od conversation new` | absent | Phase 2C |
| `od marketplace search` (catalog query) | absent | Phase 3 |
| `od plugin scaffold` (interactive starter) | shipped | Phase 4 — `apps/daemon/src/plugins/scaffold.ts` + `od plugin scaffold --id <id>` |
| `od plugin export <projectId> --as od\|claude-plugin\|agent-skill` | shipped | Phase 4 — `apps/daemon/src/plugins/export.ts` + `POST /api/applied-plugins/export` |
| `od plugin publish --to <catalog>` | absent | Phase 4 |
| `od skills/design-systems/craft/atoms list/show` | absent | Phase 4 |
| `od status/doctor/version/config` | partial | Phase 4 (some pieces exist; audit) |

### 3.6 Web components

| Component | Status | Phase |
| --- | --- | --- |
| `apps/web/src/components/InlinePluginsRail.tsx` | shipped | Phase 2A |
| `apps/web/src/components/ContextChipStrip.tsx` | shipped | Phase 2A |
| `apps/web/src/components/PluginInputsForm.tsx` | shipped | Phase 2A |
| `apps/web/src/components/PluginsSection.tsx` | shipped | Phase 2B — composable host-agnostic widget |
| `applyPlugin()` helper in `apps/web/src/state/projects.ts` | shipped | Phase 2A — also exports `renderPluginBriefTemplate` |
| `apps/web/src/components/GenUISurfaceRenderer.tsx` | shipped | Phase 2A (confirmation/oauth-prompt first-class; form/choice fall back to JSON Schema preview until Phase 2A.5) |
| `apps/web/src/components/GenUIInbox.tsx` | shipped | Phase 2A |
| `NewProjectPanel` plugin rail mount | shipped | Phase 2B (entry slice) — `PluginsSection` mounted under the project-name input |
| `ChatComposer` plugin rail mount | shipped | Phase 2B — `PluginsSection variant='strip'` rendered above the composer input when a `projectId` is bound |
| `apps/web/src/components/MarketplaceView.tsx` | shipped | Phase 2B — catalog grid + trust filters + configured-catalogs panel; routes `/marketplace`. |
| `apps/web/src/components/PluginDetailView.tsx` | shipped | Phase 2B — `/marketplace/:id` (alias `/plugins/:id`); 'Use this plugin' calls applyPlugin → Home. |

---

## 4. Dependency topology (drives phase ordering)

```text
                  ┌─ contracts/plugins/* ─┐
                  │                       │
         plugin-runtime (parsers + merge + resolve + validate + digest)
                  │
       ┌──────────┼─────────────────────────┐
       │          │                         │
   registry   installer                  apply (pure)
       │          │                         │
       └────┬─────┘                         │
            │                          snapshots ───── connector-gate
            │                               │              │
       composeSystemPrompt(snapshotId)       │         tool-tokens
            │                               │              │
            └─────────── runs ──────────────┘              │
                          │                                │
                  pipeline + devloop + genui ──────────────┘
                          │
                     SSE/ND-JSON events
                          │
            ┌─────────────┴─────────────┐
       CLI (plugin/run/files/ui)   Web (rail/strip/inputs/genui)
```

Three reads from the graph (drove the §6 phase reorder)

- `snapshots.ts` is the keystone. It must land in Phase 1 week 1, before pipeline / genui / connector-gate.
- `pipeline.ts` and `genui/*` are co-required for the first marketable plugin (`make-a-deck` needs `direction-picker` + `oauth-prompt`); they must land in the same phase.
- CLI and Web parallelize cleanly once `ApplyResult` JSON is stable; the only sync point is the ND-JSON event schema in `packages/contracts/src/plugins/events.ts`.

---

## 5. Foundations (early bedrock — invest in Phase 0–1 to avoid Phase 3+ rework)

- [x] **F1. Freeze `manifestSourceDigest` algorithm in Phase 0.** Implementation in `packages/plugin-runtime/src/digest.ts`; input `{manifest, inputs, resolvedContextRefs}` → sha256 hex. `packages/plugin-runtime/tests/digest.test.ts` pins 2 known-good digests + canonical-key-order invariant; daemon upgrades cannot change them.
- [x] **F2. Define `PersistedAgentEvent` plugin variants in Phase 1, even if they fire later.** Variants live in `packages/contracts/src/plugins/events.ts` (`pipeline_stage_*`, `genui_surface_*`); pipeline / genui emitters land Phase 2A.
- [x] **F3. `installed_plugins.source_kind` accepts `'bundled'` from Phase 1.** `PluginSourceKindSchema` permissive: `bundled / user / project / marketplace / github / url / local`.
- [x] **F4. `PluginAssetRef.stageAt` defaults to `'run-start'`, never `'project-create'`.** Default baked into `packages/contracts/src/plugins/apply.ts`.
- [ ] **F5. `--json` output uses contracts types; no inline reshape in `cli.ts`.** Phase 1 CLI ships `--json` for `list/info/apply/doctor` returning the daemon JSON verbatim; the next CLI rev imports `ApplyResult` etc. from contracts to satisfy the compile-time guarantee.
- [x] **F6. `OD_MAX_DEVLOOP_ITERATIONS` lives in `apps/daemon/src/app-config.ts`, default 10, override via env.** Read via `readPluginEnvKnobs()`; consumed by Phase 2A `pipeline.ts`.
- [ ] **F7. `od plugin doctor` validates `od.connectors.required[]` against `connectorService.listAll()` from Phase 1.** Phase 1 doctor validates manifest schema, atoms, and resolved skill / DS / craft refs; the connector lookup wires in once `connectorService` is exposed to the doctor module (Phase 1 cleanup PR).
- [ ] **F8. Cross-conversation cache (`genui_surfaces` lookup) goes live with the table — i.e. Phase 2A — and a daemon test asserts the second `oauth-prompt` does not broadcast.** Pulled forward from spec §16 Phase 2A's e2e (e) so the behavior is verified at unit-test layer, not only e2e.
- [x] **F9. Snapshot lifecycle env vars (PB2)** live in `apps/daemon/src/app-config.ts` from Phase 1: `OD_SNAPSHOT_UNREFERENCED_TTL_DAYS` (default `30`, set to `0` to disable), `OD_SNAPSHOT_RETENTION_DAYS` (default unset, opt-in), `OD_SNAPSHOT_GC_INTERVAL_MS` (default `6 * 60 * 60 * 1000`). All three live in `readPluginEnvKnobs()`; `applied_plugin_snapshots.expires_at` is stamped on insert; the GC worker lands Phase 5.

---

## 6. Phase plan (re-ordered from spec §16 by dependency, not by user-visible feature)

The spec §16 ordering is reader-facing; this is the build order. Each phase has explicit deliverables, validation steps, and an exit criterion. Flip checkboxes in PRs that land each item.

### Phase 0 — Spec freeze + contracts skeleton (1–2 d)

Deliverables

- [x] `docs/schemas/open-design.plugin.v1.json` — JSON Schema v1.
- [x] `docs/schemas/open-design.marketplace.v1.json` — JSON Schema v1.
- [x] `packages/contracts/src/plugins/{manifest,context,apply,marketplace,installed,events}.ts` (types + Zod schemas; no logic).
- [x] Re-export from `packages/contracts/src/index.ts`.
- [x] `packages/plugin-runtime/src/digest.ts` with frozen sha256 algorithm + fixture cases (`packages/plugin-runtime/tests/digest.test.ts`).

Validation

- [x] `pnpm --filter @open-design/plugin-runtime test`
- [x] `pnpm guard && pnpm typecheck`
- [x] CI digest stability: re-running `digest()` on the fixtures matches the pinned hex.

Exit criterion

- Importing `import type { ApplyResult, AppliedPluginSnapshot } from '@open-design/contracts'` works from daemon and web. ✓ verified.

### Phase 1 — Loader + installer + apply + snapshot + headless CLI loop (5–7 d)

Why merged with the spec's "headless MVP CLI loop" — see I4. The spec's Phase 1 explicitly pulls this forward; this plan keeps that.

Deliverables (week 1: data layer)

- [x] SQLite migration for `installed_plugins`, `plugin_marketplaces`, `applied_plugin_snapshots` (including `expires_at INTEGER` per PB2). The `runs` table is in-memory in `apps/daemon/src/runs.ts`; the in-memory run carries the snapshot id today. `projects` and `conversations` get `applied_plugin_snapshot_id` ALTERs in `migratePlugins()`.
- [x] `apps/daemon/src/app-config.ts` defines `OD_SNAPSHOT_UNREFERENCED_TTL_DAYS` (default `30`), `OD_SNAPSHOT_RETENTION_DAYS` (default unset), `OD_SNAPSHOT_GC_INTERVAL_MS`, and `OD_MAX_DEVLOOP_ITERATIONS` (F6) under `readPluginEnvKnobs()`. Apply path stamps `expires_at` on insert; GC worker lands Phase 5.
- [x] `packages/plugin-runtime` parsers / adapters / merger / resolver / validator + digest.
- [x] `apps/daemon/src/plugins/registry.ts` — install-root scan, sidecar + adapter merge, SQLite reader/writer. (Hot reload + project tier scan land Phase 2A.)
- [x] `apps/daemon/src/plugins/installer.ts` — local folder install with path-traversal guard, 50 MiB size cap, symlink rejection. GitHub tarball / HTTPS sources land Phase 2A.
- [x] `apps/daemon/src/plugins/apply.ts` — pure; emits `ApplyResult` with draft snapshot.
- [x] `apps/daemon/src/plugins/snapshots.ts` — sole writer of `applied_plugin_snapshots`. (Repo-level `rg` guard wiring in `scripts/guard.ts` lands in the Phase 2A polish PR.)
- [ ] Refactor `apps/daemon/src/{skills,design-systems,craft}.ts` to delegate to `registry.ts`. Phase 1 keeps the existing loaders independent so `/api/skills`, `/api/design-systems`, `/api/craft` endpoints remain byte-for-byte stable; Phase 2A folds them into the plugin registry.

Deliverables (week 2: surface layer)

- [x] HTTP: `GET /api/plugins`, `GET /api/plugins/:id`, `POST /api/plugins/install` (SSE), `POST /api/plugins/:id/uninstall`, `POST /api/plugins/:id/apply`, `POST /api/plugins/:id/doctor`, `GET /api/atoms`, `GET /api/applied-plugins/:snapshotId`. `POST /api/projects` / `POST /api/runs` continue to accept their existing payloads; the explicit `pluginId` / `appliedPluginSnapshotId` plumbing lands as a follow-up Phase 1 PR once the `runs` SQL migration is in place.
- [x] `composeSystemPrompt()` in `apps/daemon/src/prompts/system.ts` accepts a `pluginBlock` rendered from the snapshot via `pluginPromptBlock(snapshot)` and emits `## Active plugin` + `## Plugin inputs` sections. Shape: pure assembler + content table (per I5).
- [x] CLI: `od plugin install/list/info/uninstall/apply/doctor`. `od project / run / files` subcommands stay scheduled for the Phase 1 follow-up PR.
- [ ] Phase 1 `od plugin doctor` covers: schema validation, SKILL.md parse, atom id existence check, resolved-context ref check, digest drift detection. MCP dry-launch and connector existence (F7) land in the Phase 1 cleanup PR.

Validation

- [x] `pnpm --filter @open-design/plugin-runtime test` covers: digest stability, `parseManifest` + `parseMarketplace`, SKILL frontmatter adapter, sidecar+adapter merge precedence, `validateSafe` cross-field rules.
- [x] `apps/daemon/tests/plugins-{apply,snapshots,installer,e2e-fixture}.test.ts` cover apply purity, snapshot writer, installer guards, and the closed-loop install→apply→snapshot→doctor walk.
- [x] **e2e-1 closed loop** — `apps/daemon/tests/plugins-e2e-fixture.test.ts` runs the §12.5 walk against the bundled `apps/daemon/tests/fixtures/plugin-fixtures/sample-plugin/` fixture without spinning the HTTP server.
- [ ] **e2e-2 pure apply across runs** — Phase 1 follow-up: drive `applyPlugin` through `POST /api/plugins/:id/apply` against a running daemon and assert two consecutive applies share the same `manifestSourceDigest`.
- [ ] **e2e-3 headless run** — needs `od daemon start --headless` (Phase 1.5) and the `od run start --plugin <id>` plumbing (Phase 1 follow-up).

Exit criterion

- Phase 1 daemon-only walkthrough is green: `od plugin install --source <fixture>` → `od plugin list` → `od plugin apply <id>` produces a stable `AppliedPluginSnapshot`. The §12.5 web-driven walkthrough requires the Phase 1 follow-up PR + Phase 1.5 headless flag.

### Phase 1.5 — Headless daemon lifecycle subset (1 d)

Pulled out of spec §16 Phase 5 because Phase 1 e2e needs it. Avoids "Phase 1 looks green on macOS desktop, breaks on Linux CI" false positives.

Deliverables

- [x] `od daemon start --headless` flag (no electron, no web bundle).
- [x] `od daemon start --serve-web` flag (web UI without electron). Today this is an alias of `--headless` because the v1 daemon serves both API and web UI from the same Express app; the flag is reserved so packaged callers can branch on it.
- [x] Honor `OD_BIND_HOST`, `OD_PORT`, `OD_NAMESPACE` in headless mode (the flags forward into the env so the existing daemon code path picks them up unchanged).
- [x] `od daemon stop`, `od daemon status --json`.

Validation

- [x] `apps/daemon/tests/daemon-lifecycle.test.ts` covers the `/api/daemon/status` shape and the loopback-only enforcement on `/api/daemon/shutdown`.
- [ ] `apps/daemon/tests/plugins-headless-run.test.ts` covers e2e-3's HTTP-level walkthrough; the full Docker re-run is deferred to the Phase 5 cloud-deployment PR.

### Phase 2A — Pipeline + devloop + GenUI(confirmation/oauth-prompt) + connector-gate + Web inline rail (4–6 d)

Deliverables (daemon)

- [x] `apps/daemon/src/plugins/pipeline.ts` — stage scheduler; `until` evaluator; devloop with `OD_MAX_DEVLOOP_ITERATIONS` ceiling.
- [x] `apps/daemon/src/plugins/pipeline-runner.ts` — bridges the scheduler onto a live run's SSE stream + GenUI cache.
- [x] SQLite migration: `run_devloop_iterations`, `genui_surfaces` (3 indexes), `connectors_required_json` / `connectors_resolved_json` / `mcp_servers_json` columns on `applied_plugin_snapshots`.
- [x] `apps/daemon/src/genui/{registry,events,store}.ts` — confirmation, oauth-prompt, form, choice surfaces; reuse the existing `apps/daemon/src/connectors/` flow for `oauth.route='connector'`.
- [x] Cross-conversation cache (F8) — `lookupResolved` + emit `genui_surface_response { respondedBy: 'cache' }`.
- [x] `apps/daemon/src/plugins/connector-gate.ts` — apply path connector resolution + token-issuance gate. `/api/tools/connectors/execute` re-validates per call (`CONNECTOR_NOT_GRANTED`).
- [x] HTTP: `GET /api/runs/:runId/genui`, `GET /api/projects/:projectId/genui`, `POST /api/runs/:runId/genui/:surfaceId/respond`, `POST /api/projects/:projectId/genui/:surfaceId/revoke`, `POST /api/projects/:projectId/genui/prefill`, `POST /api/runs/:runId/replay`, `GET /api/runs/:runId/devloop-iterations`.
- [x] SSE / ND-JSON streams emit `pipeline_stage_started/completed`, `genui_surface_request/response/timeout`, `genui_state_synced` per F2.
- [x] API-fallback rejection: `/api/proxy/*` returns `409 PLUGIN_REQUIRES_DAEMON` (e2e-7).
- [x] **PB1 — `renderPluginBlock(snapshot)` lives in `packages/contracts/src/prompts/plugin-block.ts`.** Both composers import it; v1 fallback still 409s.

Deliverables (CLI)

- [x] `od plugin trust <id> --capabilities …` (with `connector:<id>` form) + `--revoke`.
- [x] `od plugin apply --grant-caps a,b` + `--input k=v` (repeated).
- [x] `od plugin replay <runId>`.
- [x] `od ui list/show/respond/revoke/prefill`.
- [x] CLI structured error envelope for §12.4 exit codes (64–73).
- [x] `od plugin run <id>` apply→start shorthand (full ND-JSON streaming via `od run watch` lands as part of the Phase 1 follow-up).
- [x] `od plugin snapshots list / prune` (operator escape hatch).

Deliverables (web)

- [x] `applyPlugin(pluginId, projectId?)` helper in `apps/web/src/state/projects.ts`.
- [x] `InlinePluginsRail`, `ContextChipStrip`, `PluginInputsForm`.
- [x] `GenUISurfaceRenderer` for `confirmation` + `oauth-prompt` (cards / modal); `form` / `choice` ship a fallback JSON-Schema preview + textarea until Phase 2A.5.
- [x] `GenUIInbox` drawer.
- [ ] Mount the trio in `NewProjectPanel` and `ChatComposer` (deferred to Phase 2B PR — components + state helper land first).

Validation

- [x] **e2e-4 replay invariance** — `apps/daemon/tests/plugins-dod-e2e.test.ts`.
- [x] **e2e-5 GenUI cross-conversation** — `apps/daemon/tests/plugins-pipeline-runner.test.ts`.
- [x] **e2e-6 connector gate** — `apps/daemon/tests/plugins-dod-e2e.test.ts` + `plugins-tool-token-gate.test.ts`.
- [x] **e2e-7 api-fallback rejection** — `apps/daemon/tests/proxy-routes.test.ts`.
- [x] Daemon unit test: pipeline stage scheduler converges on a critique signal in ≤3 iterations — `apps/daemon/tests/plugins-pipeline-runner.test.ts`.
- [x] Daemon unit test: F8 cache hit does not broadcast — `apps/daemon/tests/plugins-pipeline-runner.test.ts`.

### Phase 2A.5 — GenUI form + choice + JSON Schema renderer (2–3 d)

Deliverables

- [ ] `GenUISurfaceRenderer` extended for `form` and `choice`; JSON Schema → React form bridge (small, in-tree; no external dep added without review).
- [ ] CLI parity: `od ui show` returns the schema for headless rendering.

Validation

- [ ] Daemon test: a `form` surface answered via `od ui respond --value-json '...'` writes through the same path as a UI answer; the `genui_surface_response` event has `respondedBy: 'user'` in both cases.

### Phase 2B — Marketplace deep UI + ChatComposer apply + preview sandbox (4–6 d)

Deliverables

- [ ] Routes `/marketplace`, `/marketplace/:id` in `apps/web/src/router.ts`.
- [ ] `MarketplaceView`, `PluginDetailView`.
- [ ] `ChatComposer` integrates `InlinePluginsRail` + `ContextChipStrip` + `PluginInputsForm`. `applyPlugin()` accepts current `projectId`.
- [ ] `GET /api/plugins/:id/preview` and `/api/plugins/:id/example/:name` with the §9.2 sandbox CSP, `sandbox="allow-scripts"` only.
- [ ] Preview path traversal / symlink / size guards.

Validation

- [ ] Browser test: a malicious-fixture preview cannot fetch `/api/*` (CSP `connect-src 'none'`).
- [ ] e2e: install local plugin → marketplace → detail preview → "Use" → Home or ChatComposer prefilled → run produces design.

### Phase 2C — Advanced CLI: files write/upload/delete/diff, project import, run logs (2–3 d)

Deliverables

- [ ] `od files write/upload/delete/diff`.
- [ ] `od project delete/import`, `od run list/logs --since`.
- [ ] `od conversation list/new/info` (basic).

Validation

- [ ] Extend the §12.5 walk-through: `od project import` an external folder → `od plugin apply` → `od plugin replay <runId>` reruns on top.

### Phase 3 — Federated marketplaces + tiered trust + bundle plugins (3–5 d)

Deliverables

- [x] `od marketplace add/list/info/refresh/remove/trust` — Phase 3 entry slice.
- [x] `GET / POST /api/marketplaces`, `POST /api/marketplaces/:id/trust`, `GET /api/marketplaces/:id/plugins`.
- [x] `od plugin install <name>` resolves through configured marketplaces (`resolvePluginInMarketplaces` + `POST /api/plugins/install` bare-name detection). Marketplace trust does NOT auto-propagate — see spec §9.
- [ ] Trust UI on `PluginDetailView` (capability checklist + Grant action).
- [ ] Apply pipeline gates by `trust` + `capabilities_granted` (already partly in Phase 2A; this phase wires UI + marketplace).
- [ ] Bundle plugin installer (multiple skills + DS + craft → registry under namespaced ids).
- [ ] `od plugin doctor <id>` runs full validation including bundle expansion.

Validation

- [ ] e2e: install plugin from a local mock `marketplace.json`, rotate ref, uninstall.
- [ ] e2e: restricted plugin cannot start MCP server until Grant clicked; check `applied_plugin_snapshots.capabilities_granted` updates.

### Phase 4 — Atoms exposure, publish-back, AG-UI adapter, full CLI parity (1–2 wk; splittable)

Deliverables

- [x] `docs/atoms.md`; `GET /api/atoms` returns implemented + reserved (with `(planned)` marker). Source of truth: `apps/daemon/src/plugins/atoms.ts`.
- [x] `od plugin export <projectId> --as od|claude-plugin|agent-skill` — `apps/daemon/src/plugins/export.ts` + `POST /api/applied-plugins/export`.
- [x] `od plugin run <id> --input k=v --follow` (apply + run start wrapper) — landed in §3.B3 (Phase 2A). Full ND-JSON streaming via `od run watch` is also shipped (Phase 1 follow-up §3.F1).
- [x] `od plugin scaffold` interactive starter — `apps/daemon/src/plugins/scaffold.ts`.
- [ ] `od plugin publish --to anthropics-skills|awesome-agent-skills|clawhub` (PR template launcher).
- [ ] CLI parity remainder: `od skills/design-systems/craft/atoms list/show`, `od status/doctor/version`, `od config get/set/list/unset`, `od marketplace search`.
- [ ] Optional `plugins/_official/atoms/<atom>/SKILL.md` extraction (spec §23.3.2 patch 2).
- [ ] `@open-design/agui-adapter` package; `GET /api/runs/:runId/agui` SSE endpoint emits AG-UI canonical events.
- [ ] Plugin manifest upgrade: `od.genui.surfaces[].component` (capability gate `genui:custom-component`).

Validation

- [ ] **e2e-9 UI ↔ CLI parity**: pick 5 desktop UI workflows; replay each through `od …` only; produced artifacts byte-for-byte equal.
- [ ] AG-UI smoke: a CopilotKit React client subscribes to `/api/runs/:runId/agui` and renders surfaces unmodified.

### Phase 5 — Cloud deployment (parallel; can start after Phase 1.5)

Deliverables

- [ ] `linux/amd64` + `linux/arm64` Dockerfile per spec §15.1 (`node:24-bookworm-slim` base, non-root uid 10001, bundled `ffmpeg` / `git` / `ripgrep`).
- [ ] CI pushes `:edge` on main, `:<version>` on tag.
- [ ] `tools/pack/docker-compose.yml`, `tools/pack/helm/`.
- [ ] Bound-API-token guard: daemon refuses to bind `OD_BIND_HOST=0.0.0.0` without `OD_API_TOKEN`; bearer middleware on `/api/*` skipped only on loopback.
- [ ] `ProjectStorage` adapter for S3-compatible blob stores.
- [ ] `DaemonDb` adapter for Postgres.
- [ ] **Snapshot retention enforcement job (PB2).** Periodic worker (default every 6 h, knob `OD_SNAPSHOT_GC_INTERVAL_MS`) deletes `applied_plugin_snapshots` rows where `expires_at IS NOT NULL AND expires_at <= now()`. When `OD_SNAPSHOT_RETENTION_DAYS` is set, the worker additionally retires referenced rows older than the window if and only if the referencing run/conversation/project is itself terminal. Audit log entry per deletion. CLI escape hatch: `od plugin snapshots prune --before <ts>` for forced cleanup. Plays alongside §15.7 hosted defaults.

Validation

- [ ] `docker run` smoke: image starts, web UI renders, `od plugin install` works inside container.
- [ ] Multi-cloud smoke: deploy compose to AWS Fargate, GCP Cloud Run, Azure Container Apps; produce a fixed plugin's artifact byte-for-byte equal across clouds.
- [ ] Pluggable storage smoke: same plugin alternated between local-disk + SQLite and S3 + Postgres; artifacts identical.

### Phase 6 / 7 / 8 — Post-v1 native scenario coverage (per spec §21.4)

These are tracked but **not part of v1 sign-off**. Listed here so spec patches that promote `(planned)` atoms have a place to update.

- [ ] **Phase 6 — figma-migration native**: implement `figma-extract` + `token-map`; ship official `figma-migration` plugin.
- [ ] **Phase 7 — code-migration native** (§20.3 §21.3.2): `code-import`, `design-extract`, `rewrite-plan`, `patch-edit`, `diff-review`, `build-test` evaluator; freeze target-stack contract; freeze design-token mapping contract.
- [ ] **Phase 8 — production code delivery native**: repo-aware multi-file patch orchestration; native review-and-apply surface; promote `handoffKind: 'deployable-app'` from reservation to implementation.

---

## 7. Spec decisions (locked)

These were originally spec §18 open questions; they are now resolved and propagated into both this plan and `docs/plugins-spec.md` proper. Future spec patches that revisit them must update both files in the same PR.

- **PB1. Lift `## Active plugin` block into `packages/contracts/src/prompts/plugin-block.ts` in Phase 2A** (was Phase 4). **Decision: accepted as proposed.** Both `composeSystemPrompt()` implementations (daemon + contracts) import the same renderer. Spec §11.8 patched to drop the "Phase 4 lifts the block" bullet and the CI byte-equality cross-check fixture; spec §18 patched to mark the open question resolved. Plan §6 Phase 2A gains the deliverable; Phase 4 loses it.
- **PB2. `AppliedPluginSnapshot` unreferenced-row TTL.** **Decision: accepted with one modification** to preserve spec §8.2.1's reproducibility-first stance. Final shape:
  - `applied_plugin_snapshots.expires_at INTEGER` column lands in Phase 1 (NULL allowed).
  - Snapshots referenced by any `runs.applied_plugin_snapshot_id` / `conversations.applied_plugin_snapshot_id` / `projects.applied_plugin_snapshot_id` keep `expires_at = NULL` (pinned forever; reproducibility unchanged).
  - Unreferenced snapshots receive `expires_at = applied_at + OD_SNAPSHOT_UNREFERENCED_TTL_DAYS` (default **30 d**, set to `0` to disable). This is the apply-then-cancel garbage-growth defense.
  - The "expire even referenced" knob `OD_SNAPSHOT_RETENTION_DAYS` is **operator-opt-in only**, default unset; when set, a referenced row may expire if `applied_at` is older than the window AND the referencing row is itself terminal (run finished, conversation archived, project deleted).
  - Both env vars live in `apps/daemon/src/app-config.ts` (per F6 pattern). Phase 1 ships the column + config wiring; Phase 5 ships the periodic enforcement job.
  - Spec §11.4 patched to add the `expires_at` column; spec §18 patched to mark the open question resolved.

---

## 8. Definition of done (the hard sign-off bar for v1)

v1 ships when **all** of the following pass on a clean Linux CI container without electron. Each row links to the daemon / e2e test path that asserts it.

- [x] **e2e-1 cold install** — `od plugin install ./fixtures/sample-plugin` →
  - `~/.open-design/plugins/sample-plugin/` exists.
  - `installed_plugins` has one row with `trust='restricted'`, `source_kind='local'`.
  - Test path: `apps/daemon/tests/plugins-e2e-fixture.test.ts`
- [x] **e2e-2 pure apply** — two consecutive applies share `manifestSourceDigest`; the project cwd byte size is unchanged; `applied_plugin_snapshots` is not written by `applyPlugin()` itself (the resolver is the writer).
  - Test path: `apps/daemon/tests/plugins-dod-e2e.test.ts` (`e2e-2 pure apply across runs`).
- [x] **e2e-3 headless run (entry slice)** — install → project create → run start → status → snapshot fetch all walked at the HTTP layer with no electron / no agent backend; the run carries the same `appliedPluginSnapshotId` the project was created with. The full §8 e2e-3 contract ('first ND-JSON event has `kind=pipeline_stage_started`') needs the run-time pipeline runner being plugged into the live agent loop, which is deferred to the next PR.
  - Test path: `apps/daemon/tests/plugins-headless-run.test.ts`.
- [x] **e2e-4 replay invariance** — after a same-id plugin upgrade, `renderPluginBlock(snapshot)` returns the byte-equal prompt block; the live applyPlugin against the upgraded plugin produces a different `manifestSourceDigest`.
  - Test path: `apps/daemon/tests/plugins-dod-e2e.test.ts` (`e2e-4 replay invariance`).
- [x] **e2e-5 GenUI cross-conversation** — second conversation in the same project does not broadcast a fresh `genui_surface_request`; it emits `genui_surface_response { respondedBy: 'cache' }` instead.
  - Test path: `apps/daemon/tests/plugins-pipeline-runner.test.ts` (`reuses a project-tier surface answer across conversations`).
- [x] **e2e-6 connector trust gate** — `resolvePluginSnapshot` rejects with HTTP 409 / exit 66 / `capabilities-required` when the snapshot is restricted and `connector:<id>` is missing. Independently, `checkConnectorAccess` rejects the same call so a leaked tool token cannot bypass §5.3.
  - Test path: `apps/daemon/tests/plugins-dod-e2e.test.ts` (`e2e-6 connector trust gate`) + `apps/daemon/tests/plugins-tool-token-gate.test.ts`.
- [x] **e2e-7 api-fallback rejection** — every `/api/proxy/*` entry returns `409 PLUGIN_REQUIRES_DAEMON` when a body smuggles `pluginId` or `appliedPluginSnapshotId`.
  - Test path: `apps/daemon/tests/proxy-routes.test.ts` (`API fallback rejects plugin runs`).
- [x] **e2e-8 apply purity regression** — 100 applies grow the snapshot count by 100, leave the project cwd byte size unchanged, and emit no `.mcp.json`.
  - Test path: `apps/daemon/tests/plugins-dod-e2e.test.ts` (`e2e-8 apply purity regression`).

Plus repo-wide gates

- [ ] `pnpm guard` clean.
- [ ] `pnpm typecheck` clean.
- [ ] `pnpm --filter @open-design/contracts test` clean.
- [ ] `pnpm --filter @open-design/plugin-runtime test` clean.
- [ ] `pnpm --filter @open-design/daemon test` clean.
- [ ] `pnpm --filter @open-design/web test` clean.

---

## 9. Status snapshot (the always-live cell)

| Field | Value |
| --- | --- |
| Current phase | Phase 2A + 1 + 1.5 + 2B (composer mount + ChatComposer mount + marketplace deep UI) + 2C entry slice + 3 (entry slice incl. `od plugin install <name>`) + 4 (scaffold + export + atoms doc) + early 5 |
| Next planned PR | Plug `runPipelineForRun()` into the live agent loop in `startChatRun()` (lifts e2e-3 from entry-slice to the full §8 'first SSE event = `pipeline_stage_started`' contract); Phase 4 `od plugin publish --to <catalog>` PR-template launcher; Phase 4 atom migration into `plugins/_official/atoms/<atom>/SKILL.md`; Phase 4 AG-UI adapter; Phase 5 Docker image |
| Open spec push-backs | none — PB1 / PB2 resolved (see §7) |
| Last sync against `docs/plugins-spec.md` | 2026-05-09 (Phase 4 scaffold / export / atoms doc + Phase 2B marketplace deep UI + ChatComposer mount landing) |

Update this table on every plugin-system PR merge. When the value of "Current phase" advances, also flip the matching deliverables in §6 and the modules in §3.

---

## 10. References

- Spec: [`docs/plugins-spec.md`](../plugins-spec.md) · [`docs/plugins-spec.zh-CN.md`](../plugins-spec.zh-CN.md)
- Skills protocol: [`docs/skills-protocol.md`](../skills-protocol.md)
- Architecture overview: [`docs/architecture.md`](../architecture.md)
- Repository conventions: [`AGENTS.md`](../../AGENTS.md), [`apps/AGENTS.md`](../../apps/AGENTS.md), [`packages/AGENTS.md`](../../packages/AGENTS.md)
- Adjacent active plan: [`docs/plans/manual-edit-mode-implementation.md`](manual-edit-mode-implementation.md)
