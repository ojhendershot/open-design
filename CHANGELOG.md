# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Plugin & marketplace system — Phase 2A + 1 + 1.5 + 2B + 2C entry slice + 3 (full) + 4 (full incl. OD_BUNDLED_ATOM_PROMPTS default ON) + 5 (full incl. live S3 impl; postgres adapter still stubbed) + 6 (full incl. asset rasterisation) + 7 (all six code-migration atom impls landed; full pipeline e2e covered by smoke test) + 8 (full incl. GenUI \u2192 decision bridge + handoff promotion ladder bridge) + bundled scenarios + bundled-scenario fallback resolver.** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - **`od plugin validate <folder>` author-side lint (Phase 4).** Pre-install lint pass against an unfinished plugin folder. New `validatePluginFolder({ folder, registry? })` helper reads the folder via the same `resolvePluginFolder()` the installer uses (manifest parsing is byte-equal to install time) and runs `doctorPlugin()` against the supplied registry view. Surfaces atom-id mismatches, manifest parse errors, unparseable `until` expressions, and unresolved skill / DS / craft refs without dirtying the registry table. CLI takes `--no-daemon` for fully-offline runs and `--json` for machine-readable output. Exit code `4` when `doctor.ok=false`, `2` on CLI/folder errors, `0` on clean.
  - **`OD_BUNDLED_ATOM_PROMPTS` default flipped to ON (Phase 4).** With every Phase 6/7/8 atom impl shipping its own SKILL.md fragment (build-test, code-import, design-extract, figma-extract, token-map, rewrite-plan, patch-edit, diff-review, handoff), the audit-block on flipping the default is lifted. Runs with a plugin snapshot now ALWAYS get the matching `## Active stage` blocks spliced into the system prompt without operators having to set the env var. Set `OD_BUNDLED_ATOM_PROMPTS=0` to opt out (snapshot replay against pre-flip daemons, regression bisects that need byte-equal prompts). Runs without a snapshot stay byte-equal so the change is invisible outside the plugin path.
  - **`S3ProjectStorage` live implementation via AWS SigV4 (Phase 5).** New `apps/daemon/src/storage/aws-sigv4.ts` ships a minimal AWS Signature V4 signer using only `node:crypto` (no `@aws-sdk/*` dependency \u2014 keeps the daemon shippable as a small binary). The signer is verifiably correct against the AWS-published reference vector (GetObject example). `S3ProjectStorage` now implements all five `ProjectStorage` ops (read / write / list / delete / stat) via `globalThis.fetch`, with virtual-host-style URLs by default and path-style for `OD_S3_ENDPOINT` overrides (Aliyun OSS, Tencent COS, Huawei OBS, MinIO). LIST walks `NextContinuationToken` for paginated buckets. Credentials read from `OD_S3_ACCESS_KEY_ID/SECRET/SESSION_TOKEN` first, falling back to `AWS_*` env vars so existing IAM-role / `aws configure` setups drop in unchanged.
  - **`runHandoffAtom()` pipeline-driven bridge (Phase 8 entry slice).** New helper reads the canonical state previous atoms wrote (`<cwd>/review/decision.json` from diff-review, `<cwd>/critique/build-test.json` from build-test) and returns the updated `ArtifactManifest` with the right `handoffKind` / `exportTargets[]` attached. Promotion ladder (spec §11.5.1): `reject` \u2192 `design-only`; `accept`/`partial` no-build-test \u2192 `implementation-plan`; + `build.passing`\u2228`tests.passing` \u2192 `patch`; + both signals + docker/cli export \u2192 `deployable-app`. Monotonicity enforced via `recordHandoff()`; a manifest carrying `'patch'` won't demote to `'design-only'` even when a follow-up reject arrives.
  - **`runAndPersistHandoff()` + auto-handoff from diff-review GenUI bridge (Phase 8 entry slice).** New on-disk shell round-trips `<cwd>/handoff/manifest.json`: reads existing manifest (or falls back to `manifestSeed`, then to a minimal default), calls `runHandoffAtom()`, and writes back only when something changed (`persistMode: 'created' | 'updated' | 'skipped'`). The diff-review GenUI bridge now auto-invokes this after recording the user's decision, so the Phase 8 promotion ladder closes end-to-end without an agent turn: user clicks Accept all in the web composer → daemon writes `review/decision.json` AND `handoff/manifest.json` with the right `handoffKind` set; failure surfaces on the bridge result as `handoffError` without regressing the diff-review write.
  - **figma-migration pipeline e2e smoke (Phase 6).** New `plugins-figma-migration-e2e.test.ts` walks figma-extract (stubbed REST) → token-map → diff-review → handoff end-to-end. Locks the scenario folder roster (`plugins/_official/scenarios/od-figma-migration/open-design.json` stages: extract → tokens → generate → critique).
  - **Full code-migration pipeline e2e smoke test (Phase 7-8).** First integration test that walks every code-migration atom (code-import \u2192 design-extract \u2192 token-map \u2192 rewrite-plan \u2192 patch-edit \u2192 build-test \u2192 diff-review \u2192 handoff) on a Next.js fixture repo without any agent in the loop. Locks the inter-atom file contract so a future PR can't break the chain by silently renaming `code/tokens.json` or adding a required field to `plan/steps.json` without updating every downstream reader. Ends on `handoffKind='deployable-app'` for the happy path; second case verifies the `reject` ladder rung still demotes through to `design-only`.
  - **Earlier in this changeset:**
  - **diff-review GenUI \u2192 `review/decision.json` bridge (Phase 8 entry slice).** New `apps/daemon/src/plugins/atoms/diff-review-genui-bridge.ts` owns the `__auto_diff_review_` prefix detection, strict JSON validation of the surface payload (rejects non-object payloads + unknown decisions; coerces non-string entries out of the file lists; forwards optional `reason`), and the end-to-end `applyDiffReviewDecisionToCwd({ cwd, value, reviewer })` glue. `POST /api/runs/:runId/genui/:surfaceId/respond` now bridges the choice surface response into `runDiffReview()` so the user's decision lands on `<cwd>/review/decision.json` immediately. Best-effort: failures are surfaced on the response payload as `diffReviewBridge: { ok: false, error }` without regressing the GenUI respond contract.
  - **Earlier in this changeset:**
  - **Native diff-review UI on `GenUISurfaceRenderer` (Phase 8 entry slice).** New `DiffReviewChoiceSurface` component renders the auto-derived `__auto_diff_review_<stageId>` choice surface natively: three top-level buttons (Accept all / Reject all / Partial…), an optional notes textarea forwarded as `decision.reason`, and a per-file accept/reject checklist that appears when the user picks Partial. Local validation refuses Partial submission when any touched file is left undecided (mirrors the daemon's `partial must cover every touched file` contract). New `GenericChoiceSurface` renders any schema with a primary enum property as a button group; property literally named `decision` wins so plugin-author-customised diff-review schemas keep rendering as accept/reject/partial buttons. PendingSurface gains an optional `context: { touchedFiles?: [] }` field so future runtime context (per-stage hints) can plug in without bloating `GenUISurfaceSpec`.
  - **`figma-extract` asset rasterisation second pass (Phase 6 entry slice).** `runFigmaExtract({ offlineAssets: false })` now downloads per-leaf-node assets via the Figma `GET /v1/images` endpoint. New knobs: `assetFormat` (`'svg' | 'png' | 'jpg' | 'pdf'`, default svg), `assetMaxBytes` (default 5 MiB). 50-id chunks, per-id failure isolation (a single CDN hiccup doesn't lose the batch), every issue lands in `meta.unsupportedNodes[]` with `reason='asset-too-large' | 'no download URL returned' | 'download <status>' | 'image fetch error: …' | 'figma error: …'`. `atomDigest` is recomputed after the asset pass settles so the digest reflects which assets succeeded.
  - **Earlier in this changeset:**
  - **`token-map` atom (Phase 6/7 entry slice).** New `runTokenMap({ cwd, source?, designSystem, strict? })` writes `<cwd>/token-map/{colors,typography,spacing,radius,shadow,unmatched,meta}.json`. Match strategies (deterministic, first-win): exact value match → normalised hex (#abc → #aabbcc) → fuzzy name (strips `--` / `ds-` / `odds-` / `theme-` prefixes). Unmatched lands with `'no-target-equivalent'`, `'target-collision'`, or `'invalid-source'`. `parseDesignSystemTokens(body)` heuristic helper lifts CSS custom properties + markdown table rows from a DESIGN.md body so daemon callers don't need a hand-curated bag.
  - **`figma-extract` atom (Phase 6 entry slice).** New `runFigmaExtract({ cwd, fileUrl?, fileKey?, token, fetchFn?, offlineAssets? })` walks Figma's REST `GET /v1/files/<key>` into the canonical `<cwd>/figma/{tree,tokens,meta}.json`. Token lift heuristics: SOLID fills + strokes → colours, `cornerRadius` → radius, FRAME / GROUP heights → spacing candidates. Gradient + image fills land in `meta.unsupportedNodes[]` with a reason. `fetchFn` is pluggable (tests inject stubs); offline mode keeps the assets/ directory empty. The OAuth bearer token is forwarded via the `Authorization` header and never persisted by the runner — the daemon's connector-gate stays the only place that touches the token store.
  - **Auto-derived `choice` surface for `diff-review` (Phase 8 entry slice).** Mirrors the connector-gate's auto `oauth-prompt` pattern. When a stage in the EFFECTIVE pipeline (consumer-declared OR scenario-fallback) lists `diff-review`, applyPlugin() synthesises an implicit `choice` GenUI surface (`__auto_diff_review_<stageId>`, `persist='run'`, 24h timeout, `onTimeout='abort'`) so the user can accept / reject / partial without the plugin author having to declare the surface by hand. Plugin-author-declared surfaces with the same id win.
  - **Earlier in this changeset:**
  - **Bundled-scenario pipeline fallback (spec §23.3.3).** New pure helper `resolveAppliedPipeline({ manifest, scenarios })` returns `{ pipeline, source: 'declared'|'scenario'|'none', scenarioId? }`. `applyPlugin()` now consults the bundled scenarios surfaced by `loadPluginRegistryView()` and copies the matching scenario's pipeline verbatim into both the `ApplyResult.pipeline` and `AppliedPluginSnapshot.pipeline`. Scenario plugins themselves never recurse. `manifestSourceDigest` stays unchanged across the fallback so spec §11.5 e2e-2 invariance holds. Only rows with `source_kind='bundled'` AND `od.kind='scenario'` are eligible — third-party scenarios cannot promote themselves.
  - **`design-extract` atom (Phase 6/7 entry slice).** New `runDesignExtract({ cwd, repoPath })` reads `code/index.json`, walks every scannable file (css/scss/ts/tsx/js/jsx/html/json), and writes the canonical token bag at `<cwd>/code/tokens.json`. Captures hex / rgba / hsla colours, CSS custom properties (`--*-color/-bg/-accent/-primary/-secondary/-surface/-border/-muted`), font-family declarations, px/rem/em spacing on padding/margin/gap/inset, border-radius, box-shadow, and Tailwind config quoted hex palette entries. Each token records `sources[]` (`<path>:<line>`) + `usage[]` so `token-map` has a precise audit trail.
  - **`rewrite-plan` atom (Phase 7 entry slice).** New `runRewritePlan({ cwd, intent? })` produces `<cwd>/plan/{plan.md, ownership.json, steps.json, meta.json}`. Heuristic ownership classifier maps every imported file to a tier (`leaf | shared | route | shell`); the step generator emits one `rewrite-<slug>` per leaf component, bundles sibling stylesheets, prepends a `tokens-alignment` step when design-extract surfaced literals, marks shared/route touches `medium` risk, and always closes with a `build-test` step. `meta.atomDigest` is over a canonicalised view of `code/index.json` so re-walks that don't change the file roster don't invalidate the plan.
  - **`patch-edit` atom (Phase 7 entry slice).** New `applyPatchForStep({ cwd, stepId, diff })`, `skipStep()`, and `readPlanProgress()`. The applier parses unified-diff text (plain edits, `/dev/null` creation, `/dev/null` deletion, multi-file hunks) and enforces the spec §20.3 safety contract before any byte is written: (a) path-traversal guard, (b) every touched file MUST appear in `step.files[]`, (c) `shell`-tier files require `step.risk='high'`, (d) context lines must match exactly so stale patches surface `context mismatch at line N` without mutating disk. After a successful apply, the runner updates `plan/steps.json[id].status='completed'` and writes `plan/receipts/step-<id>.json` with files / added / removed / rationale.
  - **`diff-review` atom (Phase 7-8 entry slice).** New `runDiffReview({ cwd, decision? })` reads `plan/receipts/` and emits `<cwd>/review/{diff.patch, summary.md, decision.json, meta.json}`. Decision composition rules: `accept` defaults `accepted_files` to every touched file; `reject` defaults `rejected_files` to every touched file; `partial` MUST cover every touched file via the `accepted_files ∪ rejected_files` union or the runner throws `missing <file>` so the GenUI surface can re-prompt. `decision.json` is round-trippable so a re-run without an explicit decision returns the persisted choice.
  - **Earlier in this changeset:**
  - **`build-test` atom (Phase 7 entry slice).** New `runBuildTest({ cwd, buildCommand?, testCommand? })` shells out to typecheck + test commands (overrides win; otherwise inferred from `package.json` scripts). Auto-detects pnpm / yarn / bun / npm from lockfile presence. Per-command timeout default 5 min, log budget 1 MiB. Emits `build.passing` + `tests.passing` signals (newly added to spec §22.4 vocabulary) plus the legacy `critique.score`. `writeBuildTestReport()` persists `critique/build-test.json` + `critique/build-test.log`.
  - **`code-import` atom (Phase 7 entry slice).** New `runCodeImport({ repoPath, cwd })` walks a real repo and writes a normalised `<cwd>/code/index.json` snapshot. Honours a 60 s walk budget; skips `node_modules`, `.git`, `dist`, `build`, `coverage`, etc.; rejects symlinks. Detects framework (next / vite / remix / astro / sveltekit / cra / custom), package manager, style system, and routing model.
  - **`handoff` atom + `ArtifactManifest` provenance fields (Phase 7-8 entry slice).** `ArtifactManifest` gains the spec §11.5.1 reserved fields (`sourcePluginSnapshotId`, `sourcePluginId`, `sourceTaskKind`, `parentArtifactId`, `artifactKind`, `renderKind`, `handoffKind`, `exportTargets[]`, `deployTargets[]`). New `recordHandoff()` helper enforces append-only `exportTargets` / `deployTargets` and monotonic `handoffKind` promotion (`design-only` < `implementation-plan` < `patch` < `deployable-app`). `isDeployableAppEligible()` centralises the §11.5.1 promotion rule (`build.passing` + `tests.passing` + at least one docker / cli export target). Contracts barrel `index.ts` switched to `.js`-suffixed re-exports so daemon NodeNext resolution picks every type up end-to-end.
  - **Bundled scenario plugins (spec §23.3.3).** Four `od.kind: 'scenario'` plugins under `plugins/_official/scenarios/{od-new-generation,od-figma-migration,od-code-migration,od-tune-collab}/` lock the default reference pipeline per `taskKind`. Replacing a default for an enterprise / vertical edition is now a content edit rather than a daemon code change. The bundled boot walker registers them via the existing tier layout.
- **Plugin & marketplace system — earlier landing.** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - **`OD_SNAPSHOT_RETENTION_DAYS` referenced-row TTL (PB2).** `pruneExpiredSnapshots` now retires referenced snapshot rows whose project has been deleted AND whose `applied_at` is older than the configured window. Live-project rows stay pinned forever (reproducibility wins). The GC worker reads `readPluginEnvKnobs().snapshotRetentionDays` so the env-var contract spec PB2 reserved is now end-to-end.
  - **`OD_BUNDLED_ATOM_PROMPTS=1` activates `composeDaemonSystemPrompt`'s atom-block path.** When set AND the run carries an applied snapshot with a non-empty `od.pipeline.stages[*]`, the daemon walks each stage, calls `loadAtomBodies` + `renderActiveStageBlock`, and threads the result as `composeSystemPrompt({ activeStageBlocks })`. Default behaviour (flag unset) is byte-equal to today's prompt.
  - **Phase 6 / 7 / 8 atom SKILL.md substrate.** Nine new `plugins/_official/atoms/<atom>/{SKILL.md, open-design.json}` pairs the bundled boot walker registers on startup: `figma-extract`, `token-map` (Phase 6); `code-import`, `design-extract`, `rewrite-plan`, `patch-edit`, `diff-review`, `build-test` (Phase 7); `handoff` (Phase 8). The fragments teach the agent what each (planned) atom expects so a plugin author who references one of these ids in `od.pipeline.stages[*].atoms[]` sees the canonical fragment without a doctor warning. The matching shell-out implementations stay scheduled per spec §16 Phase 6 / 7 / 8.
- **Plugin & marketplace system — earlier landing.** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - **Per-cloud Helm value overrides.** `tools/pack/helm/open-design/values-{aws,gcp,azure,aliyun,tencent,huawei,self}.yaml` ship the volume + ingress diffs spec §15.5 enumerates. Operators install with `helm install od ./tools/pack/helm/open-design -f values-aws.yaml`.
  - **`composeSystemPrompt({ activeStageBlocks })`.** Both daemon and contracts composers accept a pre-rendered list of `## Active stage` blocks (produced by `renderActiveStageBlock` + `loadAtomBodies`). Substrate slice for the §23.3.2 prompt-fragment migration; the actual call-site wiring stays gated on the next phase so default behaviour is byte-equal to today's prompt.
  - **Plugin-bundled component surface.** `GenUISurfaceRenderer` mounts a `sandbox="allow-scripts"` iframe at `/api/plugins/:id/asset/<path>` when a surface declares `od.genui.surfaces[].component`. Communication is one-way via `postMessage({ kind: 'genui:respond', surfaceId, value })`. The daemon-side asset endpoint serves files from `installed_plugins.fs_path` under the §9.2 preview CSP (`default-src 'none'; connect-src 'none'; frame-ancestors 'self'`) plus `X-Content-Type-Options: nosniff`.
  - **`ProjectStorage` + `DaemonDb` adapter substrate.** New `apps/daemon/src/storage/` module ships the Phase 5 §15.6 interface contracts. `LocalProjectStorage` (v1 default) is fully wired and tested; `S3ProjectStorage` is an interface-locked stub that throws on every op until the AWS SDK wiring lands. `resolveDaemonDbConfig({})` parses `OD_DAEMON_DB` / `OD_PG_*` env vars but the SQLite path remains the only reachable backend in v1.
- **Plugin & marketplace system — earlier landing.** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - **Phase 5 bound-API-token guard.** `startServer()` refuses to bind a non-loopback `OD_BIND_HOST` without `OD_API_TOKEN`; bearer middleware on `/api/*` rejects non-loopback peers without `Authorization: Bearer <OD_API_TOKEN>`. `/api/health`, `/api/version`, `/api/daemon/status` stay open so monitoring probes (kubelet, Compose) work without secrets.
  - **Helm chart templates.** `tools/pack/helm/open-design/templates/` ships Deployment, Service, Secret, ConfigMap, two PVCs, optional Ingress, plus _helpers.tpl + NOTES.txt. The chart installs end-to-end with `helm install od ./tools/pack/helm/open-design --set secrets.apiToken=$(openssl rand -hex 32)`.
  - **`od.genui.surfaces[].component`.** `GenUISurfaceSpecSchema` accepts a `{ path, export?, sandbox? }` field; `genui:custom-component` joins `KNOWN_TOP_LEVEL_CAPABILITIES`; `doctorPlugin()` flags the missing-capability + path-traversal cases. The component path is the v1 substrate for spec §10.3.5 alignment-roadmap row 2; the web sandbox loader stays scheduled.
  - **`.github/workflows/docker-image.yml`.** Multi-arch (linux/amd64 + linux/arm64) build + push to ghcr.io: `:edge` on main, `:<version>` + `:latest` on tag, `:sha-<short>` on every push, smoke build on PRs. Authenticates via GITHUB_TOKEN with `packages:write`.
- **Plugin & marketplace system — earlier landing.** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - **`@open-design/agui-adapter` workspace package + `GET /api/runs/:runId/agui`.** Pure-TS bidirectional bridge between OD's native `PersistedAgentEvent` / `GenUIEvent` / `PluginPipelineStageEvent` union and the [AG-UI canonical event protocol](https://github.com/CopilotKit/CopilotKit). The new SSE endpoint mirrors `/api/runs/:id/events` but pipes every record through `encodeOdEventForAgui` so a CopilotKit / AG-UI client consumes an OD run unmodified. v1 plugins need no change to be consumable inside the AG-UI ecosystem (spec §10.3.5).
  - **`renderActiveStageBlock` + `loadAtomBodies`.** Substrate slice for spec §23.3.2 patch 2: the daemon-side helper reads `<bundled-fsPath>/SKILL.md` for any registered bundled atom and the contracts-side renderer assembles a `## Active stage: <id>` block. The `composeSystemPrompt()` rewiring that consumes them is the next PR; today the helpers are reachable, tested, and the bundled atom plugins from §3.I3 already ship the matching SKILL.md bodies.
  - **Phase 5 Dockerfile + docker-compose + Helm chart entry slice.** `deploy/Dockerfile` now bundles `plugins/_official/` so `registerBundledPlugins()` finds the atom set inside the container. `tools/pack/docker-compose.yml` is the canonical hosted-mode manifest (two-volume layout, OD_API_TOKEN, /api/daemon/status healthcheck). `tools/pack/helm/open-design/` pins the Helm chart parameter surface for the per-cloud value overrides spec §15.5 enumerates; templates land in the Phase 5 follow-up PR.
- **Plugin & marketplace system — earlier landing.** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - **Pipeline runner wired into `POST /api/runs`.** Plugin runs whose snapshot carries `od.pipeline.stages[*]` now emit `pipeline_stage_started` synchronously before the agent process spawns. Subsequent stage events (`pipeline_stage_completed`, per-stage `run_devloop_iterations` audit rows, devloop convergence) fire asynchronously while the agent runs. Stage runner is a converging stub (`critique.score=4`, `preview.ok=true`) so single-pass pipelines walk through every stage in O(stages) time; loop stages still respect `OD_MAX_DEVLOOP_ITERATIONS`. Errors surface as `pipeline_stage_failed` events and never block the agent. **e2e-3** flips from entry-slice to the full §8 contract: `apps/daemon/tests/plugins-headless-run.test.ts` asserts the first SSE event on a pipeline-bearing plugin run is `pipeline_stage_started`.
  - **`od doctor`.** Repo-wide diagnostics: daemon status, installed-plugin doctor sweep, library inventory (skills / design-systems / atoms / craft). Exits 1 when any plugin doctor returns ok=false; exit 64 when the daemon is unreachable.
  - **`od config get/set/list/unset`.** Wraps `GET/PUT /api/app-config`. Top-level keys via positional or `--value`; nested values via `--value-json`.
  - **Phase 4 / §23 entry slice — bundled atom plugins.** New `plugins/_official/atoms/{discovery-question-form,todo-write,direction-picker,critique-theater}/{SKILL.md,open-design.json}` pairs, plus a daemon boot walker (`apps/daemon/src/plugins/bundled.ts`) that registers each folder under `source_kind='bundled'` / `trust='bundled'` on every startup. Idempotent (upserts), ENOENT-silent (works outside the dev tree). Lays the substrate for the §23.3.2 patch that lifts prompt fragments out of `system.ts`.
- **Plugin & marketplace system — Phase 2A + 1 + 1.5 + 2B + 2C entry slice + 3 (full) + 4 (scaffold / export / publish / atoms doc / library CLI) + early 5 (earlier landing).** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - **Phase 4 publish.** `od plugin publish <id> --to anthropics-skills|awesome-agent-skills|clawhub|skills-sh [--repo <github>] [--open]` builds the catalog submission URL + PR body and (with `--open`) auto-launches the system browser. The author still goes through the upstream review flow; OD never POSTs anywhere.
  - **CLI parity remainder.** `od atoms list/show`, `od skills list/show`, `od design-systems list/show`, `od craft list/show`, `od status`, `od version`. New HTTP routes `GET /api/craft` + `GET /api/craft/:id` walk the `craft/` directory and return `{ id, label, bytes }` summaries.
  - **`od marketplace search "<query>" [--tag <tag>]`.** Substring match over every configured marketplace's `plugins[]`; powered entirely by the catalog metadata `od marketplace add` already cached, so a code agent can discover plugins without being inside the desktop UI.
- **Plugin & marketplace system — Phase 2A + 1 + 1.5 + 2B (composer mount + marketplace deep UI) + 2C entry slice + 3 entry slice + 4 (scaffold / export / atoms doc) + early 5 (earlier landing).** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - **Phase 4 author tooling.** `od plugin scaffold --id <id>` writes a starter SKILL.md + open-design.json + README.md (optionally a `.claude-plugin/plugin.json`). `od plugin export <projectId> --as od|claude-plugin|agent-skill --out <dir>` materialises a publish-ready folder from the AppliedPluginSnapshot behind a project (or a snapshot id), so any chat that ran a plugin can be re-published to anthropics/skills, awesome-agent-skills, clawhub, or skills.sh without leaving the terminal. The output's open-design.json carries a provenance block (snapshotId + manifestSourceDigest + appliedAt) that reverse-resolves to the originating run.
  - **Phase 2B marketplace deep UI.** New routes `/marketplace` and `/marketplace/<pluginId>` rendered by `MarketplaceView` (catalog grid + trust filters + configured catalogs panel) and `PluginDetailView` (manifest, capability checklist, connector requirements, declared GenUI surfaces, "Use this plugin" → applyPlugin → Home). `/plugins/<id>` is a parsed alias so the public-site URL scheme reserved in spec §13 already works in-app.
  - **Phase 2B ChatComposer mount.** `ChatComposer` renders `<PluginsSection variant="strip" />` above the input whenever a `projectId` is known. Apply hydrates the draft only when empty so a mid-typing user is never overwritten.
  - **`docs/atoms.md`.** New canonical reference for the first-party atom catalog: implemented vs planned ids, task-kind mapping, how the daemon resolves an atom at run time, the closed `until`-signal vocabulary, and the §22.5 community-plugin → first-party-atom promotion path.
- **Plugin & marketplace system — Phase 2A finished + Phase 1 follow-up + Phase 1.5 + Phase 2B (composer mount) + Phase 2C entry slice + Phase 3 entry slice + early Phase 5 (earlier landing).** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - **CLI canonical agent-facing API (spec §11.7).** Every UI action now has a CLI equivalent: `od project create/list/info/delete`, `od run start/watch/cancel/list/info` (with `--plugin`, `--inputs`, `--grant-caps`, `--snapshot-id`, `--follow`), `od files list/read/write/upload/delete`, `od conversation list/info`. Plugin runs route through the §3.A1 snapshot resolver.
  - **Phase 1.5 headless lifecycle.** New `od daemon start [--headless] [--serve-web] [--port] [--host] [--namespace]`, `od daemon status [--json]`, `od daemon stop`. Backed by new HTTP routes `GET /api/daemon/status` and `POST /api/daemon/shutdown` (loopback-only). The default `od` (no subcommand) keeps its desktop behaviour for back-compat. e2e-3's headless install→project→run loop is now anchored in a daemon supertest (`apps/daemon/tests/plugins-headless-run.test.ts`).
  - **Phase 3 marketplace plugin install resolution.** `POST /api/plugins/install` with a bare plugin name walks every configured `plugin_marketplaces` row in registration order and re-routes to the canonical `github:…` / `https://…` source recorded in the matched manifest. CLI: `od plugin install <name>` works against any catalog the operator added via `od marketplace add <url>`.
  - **Web composer mount.** New `PluginsSection` widget combines `InlinePluginsRail`, `ContextChipStrip`, `PluginInputsForm`, plus `renderPluginBriefTemplate`'s `{{var}}` substitution. Mounted in `NewProjectPanel` below the project-name input as the Phase 2A discovery surface. Purely additive: the existing Send button rules are unchanged.
  - The earlier work in this changelog block remains in place (snapshot resolver, trust mutation, connector tool-token gate, fallback rejection, GitHub tarball + HTTPS install sources, pipeline runner with cross-conversation cache, marketplace registry, snapshot GC worker, web component primitives, definition-of-done suite, …).
- **Plugin & marketplace system — Phase 2A → entry slice of Phase 2B/2C/3 (earlier landing).** Spec: [`docs/plugins-spec.md`](docs/plugins-spec.md). Living plan: [`docs/plans/plugins-implementation.md`](docs/plans/plugins-implementation.md).
  - Snapshot resolver wires `applyPlugin()` into `POST /api/projects` and `POST /api/runs`. Capability gate failures map to HTTP 409 / exit 66; missing inputs map to HTTP 422 / exit 67. The in-memory run object carries `appliedPluginSnapshotId` so connector / replay paths read a frozen view.
  - Trust mutation: new `POST /api/plugins/:id/trust` endpoint plus matching `od plugin trust <id> --capabilities …` CLI. Validates the spec §5.3 capability vocabulary (rejects unknown / malformed strings); preserves the implicit `prompt:inject` floor on revoke.
  - Connector tool-token gate: tokens minted for plugin runs carry `pluginSnapshotId` / `pluginTrust` / `pluginCapabilitiesGranted`. `/api/tools/connectors/execute` re-validates the §5.3 `connector:<id>` rule per call (CONNECTOR_NOT_GRANTED 403 on miss). Trusted plugins implicitly carry `connector:*`; restricted plugins must list each id explicitly.
  - API-fallback rejection: every `/api/proxy/*` entry returns 409 PLUGIN_REQUIRES_DAEMON when a body smuggles `pluginId` / `appliedPluginSnapshotId`.
  - Snapshot GC worker enforces the PB2 `expires_at` TTL (`OD_SNAPSHOT_UNREFERENCED_TTL_DAYS` / `OD_SNAPSHOT_GC_INTERVAL_MS`) at boot + on a periodic interval. Operator escape hatch: `od plugin snapshots prune --before <ts>`.
  - Installer accepts `github:owner/repo[@ref][/subpath]` (codeload tarball) and `https://*.tar.gz` archives in addition to local folders. Hard guards: symlink / hard-link rejection, path-traversal segments, 50 MiB size cap.
  - Pipeline runner emits `pipeline_stage_*` events per stage and persists every iteration into `run_devloop_iterations`. Pre-stage GenUI surfaces auto-derived for not-yet-connected required connectors hit the cross-conversation cache (e2e-5: a second conversation in the same project never re-broadcasts an already-resolved `oauth-prompt`).
  - Marketplace registry minimum verbs: `od marketplace add/list/info/refresh/remove/trust` plus the matching HTTP routes. Default trust tier is `restricted` per spec §9; the Phase 3 follow-up wires `od plugin install <name>` resolution + the trust UI.
  - Web composer surface: `applyPlugin()` state helper, `InlinePluginsRail`, `ContextChipStrip`, `PluginInputsForm`, `GenUISurfaceRenderer` (confirmation + oauth-prompt first-class; form / choice fall back to a JSON Schema preview until Phase 2A.5), `GenUIInbox` drawer.
  - `od plugin run` apply→start shorthand. CLI structured error helper maps recoverable HTTP 4xx envelopes to the §12.4 exit codes (64–73) so code agents get a stable retry contract.
  - Plan §8 e2es covered at the daemon level: e2e-2 (pure apply across runs), e2e-4 (replay invariance after plugin upgrade via `renderPluginBlock(snapshot)`), e2e-5 (GenUI cross-conversation cache), e2e-6 (connector trust gate; re-validated independently in the token-issuance + execute routes), e2e-7 (API-fallback rejection at every proxy entry), e2e-8 (apply purity regression: 100 applies → 0 FS mutation, +100 snapshot rows). e2e-3 (headless run) stays scheduled for Phase 1.5.
- **`ib-pitch-book` skill** — investment-banking strategic-alternatives pitch book (Anthropic financial-services Pitch Agent workflow); ships `example.html` and IB layout references.

## [0.5.0] - 2026-05-07

A minor release focused on iteration: live-data dashboards graduate to a first-class artifact category, an in-preview Inspect mode lands for per-element style tuning, the desktop launcher gets an accent color theme, Critique Theater advances to Phase 5, and Linux gains headless lifecycle support. New Qoder CLI agent, Nano Banana image provider, and Indonesian locale. 51 merged PRs since 0.4.1, accumulated across 16 beta cycles.

### Added

#### Web / UI
- **Inspect mode** — live per-element style tuning in the HTML preview. ([#362])
- **Accent color control + launcher** — a global accent persists across the desktop launcher and entry view. ([#683])
- **Connection tests for execution settings** — verify provider config without launching a chat. ([#507])
- Replaced the SketchEditor `window.prompt()` text tool with an in-app modal so long prompts stop getting clipped. ([#738])

#### Skills, design systems & prompt templates
- **`live-dashboard` skill** — generic Live Artifact dashboard template. ([#778])
- **`clinic-console` live-artifact template.** ([#795])
- **FlowAI live dashboard template skill.** ([#801])
- **Notion-style team dashboard prompt template (Live Artifact).** ([#799])
- **`waitlist-page` skill.** ([#555])
- **`social-media-dashboard` skill + Totality Festival design system.** ([#678])
- **Five Orbit briefing prompt templates.** ([#671])
- **Craft `form-validation` module** — generated forms follow modern RHF/Zod patterns instead of 2018 Formik habits. ([#625])

#### Critique Theater
- **Phase 5** — panel prompt template + system composer wiring. ([#524])

#### Daemon and agents
- **Qoder CLI** agent adapter. ([#626])
- **Project transcript export to disk** for downstream tools (replay, audit, sharing) — prereq for #450. ([#493])
- Override the Codex executable path for nvm / mise / fnm-installed toolchains. ([#755])
- Codex image projects can use built-in imagegen. ([#622])
- DeepSeek v4 models in the model catalog. ([#722])
- `OD_LEGACY_DATA_DIR` migrator for 0.3.x → 0.4.x data recovery. ([#712])

#### Media generation
- **Nano Banana image provider.** ([#631])
- HyperFrames video previews, provider badge, and source filter on the templates surface. ([#293])

#### Linux & packaging
- **Linux headless lifecycle** — `install` / `start` / `stop` from CLI without a desktop session. ([#686])
- Improved Windows beta packaging and installer flow. ([#768])
- Migrated beta release publishing to R2. ([#805])

#### Internationalization
- **Indonesian (`id`) UI locale.** ([#414])

### Changed

- Project file watcher now ignores `.venv` and other large dirs so Python projects stop overwhelming it. ([#531])
- Daemon CORS whitelist accepts portless `Origin` headers for Chrome compatibility. ([#735])
- Extended OpenAI image request timeouts so larger generations stop being killed mid-flight. ([#788])
- Surfaced the `@nexudotio` X account in README and entry sidebar. ([#696])

### Fixed

#### Daemon and agents
- Delivered Copilot prompts via stdin to avoid Windows `ENAMETOOLONG`. ([#727])
- Surfaced OpenCode error frames; treated empty-output runs as failed instead of silently succeeding. ([#700])
- Discovered toolchain paths for GUI-launched agents on minimal `PATH`. ([#614])

#### Web and desktop
- Removed Tweaks-mode element-selector tooltip noise. ([#697])
- Fixed chat pane overflow. ([#740])
- Narrowed the `ws-tabs-bar` scrollbar so filenames stop overlapping. ([#781])
- Improved settings dialog scroll behavior. ([#667])
- Widened settings subtitle so the English copy fits on one line. ([#747])
- Persisted design system selection across sessions. ([#621])
- Aligned the design system default test fixture. ([#708])
- Showed an alert when the PDF export popup is blocked. ([#664])
- Fixed the Windows link-code-folder dialog. ([#698])
- Made desktop entry chrome consistent. ([#655])

#### Packaging & runtime
- Unbroke Claude Design ZIP import on Node 24 and raised the file ceiling. ([#591])
- Diagnosed missing Next package during `tools-dev` web startup. ([#675])

#### Internationalization
- Aligned `README.es` UI references to the `es-ES.ts` locale. ([#611])
- Fixed Ukrainian prompt template translations and removed duplicate keys. ([#674], [#680])

#### Miscellaneous
- Batched small fixes for [#283], [#275], and [#390]. ([#530])

### Documentation

- Documented the Linux namespace env var in `tools-pack`. ([#670])
- Fixed broken `pi-ai` links after the package split. ([#277])

### Internal

- Added desktop settings + project flow e2e coverage. ([#306])
- CI: notify Discord `#resolved` when issues are closed by a merged PR. ([#685])
- Refreshed generated GitHub metrics SVG and contributors wall. ([#718], [#720])

## [0.4.1] - 2026-05-06

0.4.1 is the startup hotfix for the broken 0.4.0 desktop packages. It restores packaged app startup on macOS and Windows, adds release validation so the failure mode is caught before publication, and includes the small UI, agent, documentation, i18n, and craft updates that landed while the hotfix was being verified.

### Added

#### Web / UI
- **Manual edit mode** for direct artifact edits. ([#620])
- **Cmd/Ctrl+P quick file switcher** for faster project navigation. ([#556])
- Resizable chat panel. ([#563])

#### Daemon and agents
- Added model name to PI initial status and RPC abort on cancel. ([#618])

#### Craft and i18n
- Craft `accessibility-baseline` module with opt-ins for dashboard, HR onboarding, and mobile onboarding. ([#587])
- Craft `rtl-and-bidi` module so artifacts handle Arabic, Hebrew, and Persian content more reliably. ([#595])
- Added i18n structure checks. ([#608])

### Changed

- Updated README first-PR links so `help-wanted` issues are surfaced alongside `good-first-issue`. ([#605])

### Fixed

#### Packaging
- Fixed packaged desktop startup by building `@open-design/contracts` to `dist/*.mjs` + `.d.ts`, pointing its exports at compiled JavaScript, and building contracts before all packaged lanes pack workspace tarballs. ([#577])
- Added packaged runtime beta gating so release candidates install, start, inspect `/api/health`, collect logs, stop, and uninstall before promotion. ([#637])

#### Daemon and agents
- Added the required stdio MCP server env field and recover from `-32602` on `session/set_model`. ([#627])
- Normalized ACP `mcpServers` to the stdio shape for Kimi/Hermes ACP. ([#612])
- Fixed agent CLI configuration and workspace focus mode. ([#604])

#### Web and desktop
- Preserved error messages across conversation reloads. ([#623])
- Kept chat recoverable after conversation load failures. ([#637])
- Honored native macOS quit behavior in the packaged desktop shell. ([#637])

### Documentation

- Documented `OD_DATA_DIR` and migration from `.od/` to the Desktop app. ([#570])
- Added Chinese (Simplified) QUICKSTART. ([#578])
- Backported missing zh-TW README sections from the English README. ([#586])
- Synced and improved the Korean README. ([#619])

### Internal

- Refined release workflows, CI scope, e2e layout, and packaged runtime smoke coverage for beta validation. ([#637])
- Refreshed generated GitHub metrics. ([#592])

## [0.4.0] - 2026-05-05

A multi-protocol leap: Open Design now ships as an MCP server, ships Critique Theater (Design Jury) Phase 4, gains live-reload + Tweaks mode + live artifacts in the preview pane, and adds five new agent / runtime adapters. 71 merged PRs from 40+ contributors over two days. Linux AppImage packaging landed in tooling, but the stable Linux artifact is deferred from 0.4.0 while containerized release packaging is hardened.

### Added

#### MCP & agent integration
- **`od mcp` — expose Open Design as a stdio MCP server.** Coding agents in other repos (Claude Code, Codex, Cursor, VS Code, Antigravity, Zed, Windsurf) can read files from local Open Design projects directly, including the project the user has open in the Open Design app right now. ([#399])
- **Link code folder support for agent context** — point agents at any local code folder alongside the design project. ([#455])
- Kilo CLI (ACP) agent adapter. ([#480])
- DeepSeek TUI agent adapter. ([#439])

#### Critique workflow
- **Critique Theater Phase 4** — persistence, transcript, and orchestrator. The "Design Jury" multi-panelist scoring pipeline is now end-to-end. ([#481])
- Critique Theater foundation — shared contracts and streaming v1 parser (Phases 0–2). ([#387])

#### Preview pane
- **Live-reload preview iframes** when project files change on disk. ([#409])
- **Tweaks mode for HTML previews** — element picker, pod selection, batched chat attachments. ([#513])
- URL-load HTML preview iframes by default (`?forceInline=1` opt-out). ([#384])
- **Live artifacts and Composio connector catalog.** ([#381])

#### Packaging & deployment
- **Linux x64 AppImage tooling** in `tools-pack`; stable release artifact deferred from 0.4.0 while the containerized packaging lane is hardened. ([#369])
- Optimize packaged mac artifact size. ([#424])

#### Daemon
- `OD_MEDIA_CONFIG_DIR` to relocate `media-config.json` (Nix store, immutable images, sandboxes). ([#411])
- Modernized multi-provider API proxy routing (Anthropic, OpenAI-compatible, Azure OpenAI, Google Gemini). ([#385])
- Seed daemon with pre-baked decks and web prototypes. ([#457])

#### Skills, design systems & prompt templates
- **Atelier Zero** editorial collage landing-page design system. ([#366])
- `open-design-landing` rename, **kami skill bundle**, and landing OG assets. ([#428])
- Craft `animation-discipline` module + opt-ins on mobile-app, mobile-onboarding, gamified-app. ([#515])
- Craft `state-coverage` module + opt-ins on dashboard, mobile-app, kanban-board. ([#502])

#### Web / UI
- Skills & design systems management page in Settings. ([#535])

#### Design Files
- Batch ZIP download with multi-select. ([#405])

#### Internationalization
- Complete **French** localization, README, and Quickstart. ([#326], [#397], [#434])
- **Ukrainian** UI localization. ([#395])
- **Russian** UI locale refresh + README + gallery metadata. ([#393], [#396])
- Brazilian Portuguese README translation. ([#460])
- Arabic README translation. ([#458])

### Changed

- Refactor `RUNTIME_DATA_DIR` resolution logic. ([#391])
- Update Codex sandbox invocation. ([#477])

### Fixed

#### Security
- Bind daemon to localhost by default + origin validation. ([#365])
- Strip `ANTHROPIC_API_KEY` when spawning Claude Code. ([#400])
- Preserve `ANTHROPIC_API_KEY` when `ANTHROPIC_BASE_URL` is set. ([#514])
- Preserve `*_API_KEY` env vars for CLI agents in packaged builds. ([#404])
- Normalize daemon proxy origins. ([#392])

#### Daemon
- Resolve daemon `package.json` from any compiled layout so the packaged app reports the correct version. ([#537])
- Correct Claude Code `--add-dir` capability detection. ([#440])
- Handle ACP `-32603` errors gracefully in `session/set_model`. ([#492])
- Expose skill resources via cwd-relative aliases. ([#435])
- Support nested paths in project file serve route. ([#401])
- Respect baseUrl path verbatim in OpenAI-compat proxy. ([#410])

#### Web UI
- Prevent vertical scrollbar on artifact preview frame. ([#453])
- Prevent vertical scrollbar on `ws-tabs-bar`. ([#448])
- Language option button height truncation in Settings. ([#447])
- Aspect-ratio cards no longer overflow into siblings. ([#476])
- Add copy buttons for FileViewer code blocks. ([#471])
- Lowercase `todowrite` compatibility in ToolCard. ([#523])
- Cap `htmlPreviewSlideState` Map to prevent memory leak. ([#488])
- Isolate preview blob export paths. ([#429])
- Split execution-mode tabs and align active chip visuals. ([#418])
- Tighten entry-tab layout and design-system showcase color picker. ([#412])
- Lift coming-soon tip above sticky tabs and make it readable in dark theme. ([#382])
- Fix file tab wheel scrolling. ([#549])

#### Design Files
- Clear selection on project switch. ([#465])

#### Agents
- Copilot prompt processing with correct command format. ([#466])
- Codex Gemini CLI trust handling. ([#352])

#### Desktop
- Show window on macOS dock activate. ([#270])

#### Packaging
- Bundle prompt templates in packaged desktop resources. ([#417])

#### Landing page
- Deploy with `npm wrangler`. ([#421])

### Documentation

- Discord invite badge in README. ([#504])
- Surface desktop downloads in README. ([#522])
- "Running the Project" section in README. ([#468])
- First-PR link points to /contribute page. ([#494])
- Defer README template-driven generation; capture #195 discussion. ([#403])
- Fix typo in zh-TW README. ([#548])
- Auto-generated metrics SVG and contributors wall refresh. ([#406], [#407], [#489], [#490])

### Internal

- Enforce test directory conventions. ([#496])

## [0.3.0] - 2026-05-03

A fast follow-up to 0.2.0 focused on richer design workflows, packaged-agent reliability, export/deploy flows, and broader internationalization. 39 merged PRs from 25 contributors.

### Added

#### Web / UI
- Pet companion with Codex hatch-pet integration. ([#296])
- Brand design-system cards, thumbnails, and DESIGN.md side-by-side preview. ([#289])
- Per-tool renderer registry for generative UI. ([#282])
- Task completion sound and browser notification. ([#359])

#### Agents & daemon
- Persist code-agent startup state. ([#255])
- Mistral Vibe CLI agent adapter. ([#354])
- Devin for Terminal support. ([#301])
- `OD_BIND_HOST` and `--host` for interface binding. ([#328])

#### Skills & exports
- Taste-skill-derived web prototype and HTML PPT examples. ([#358])
- `pptx-html-fidelity-audit` skill wired into export prompts. ([#307])
- Broader PPTX fidelity script coverage beyond CJK. ([#308])
- Native desktop Save As dialog for `.pptx` downloads. ([#330])
- Export as Markdown from the share menu. ([#345])

#### Deployment
- `/api/projects/:id/deploy/preflight` for pre-upload inspection. ([#320])

#### Internationalization
- Arabic (`ar`) UI locale with RTL layout. ([#316])
- French (`fr`) UI locale. ([#376])

### Fixed

#### Agents, packaged runtime & Windows
- Include `nvm` / `fnm` / `mise` agent CLI bins in packaged PATH. ([#364])
- Detect Codex and Gemini CLIs from user toolchain paths. ([#346])
- Upgrade `better-sqlite3` for Node 24 Windows prebuilt support. ([#357])
- Lead Copilot spawn with `-p -` so prompt-via-stdin is consumed. ([#351])
- Drop literal `-` argv from Codex spawn so prompts deliver via stdin pipe alone. ([#342])
- Wrap `cmd.exe` shim invocations to survive `/s /c` quote stripping. ([#339])

#### Web UI & files
- Download as `.zip` now returns the actual project tree. ([#341])
- Keep Design Files view active after deleting a file. ([#329])
- Scroll workspace tabs in place instead of the window. ([#363])
- Treat inlined script content as literal in FileViewer. ([#343])
- Use response-order matching for bulk upload aggregation. ([#323])
- Serve `.jsx` / `.tsx` with JS-family MIME types so browser loaders accept them. ([#340])
- Fix macOS entry view drag region. ([#373])

#### Daemon & deployment
- Increase project upload limit from 20MB to 200MB. ([#319])
- Bundle and rewrite assets referenced from inline `<style>` blocks and `style=""` attributes. ([#314])

#### Internationalization
- Update locale coverage after main merge. ([#251])
- Add missing `designFiles.showMore` keys to `ar`, `hu`, `ko`, `pl`, and `tr`. ([#335])

### Documentation

- Japanese documentation update. ([#309])
- README contributors wall refresh. ([#360])
- Spelling fixes in CLI comments, spec, and video prompt docs. ([#300])

## [0.2.0] - 2026-05-02

A feature-heavy follow-up to 0.1.0 — dark mode, xAI Grok Imagine media generation, headless deploy mode, OpenClaude fallback, four new locales, and a much richer skill / design-system / prompt-template catalog. 45 merged PRs from 27 contributors.

### Added

#### Web / UI
- Dark mode with system / light / dark toggle. ([#259])
- Visible conversation timestamps. ([#120])
- React artifact output support. ([#121])
- Preview comment attachments. ([#284])

#### Agents & daemon
- Auto-detect OpenClaude as a fallback for Claude Code. ([#263])
- Standardize agent communication via stdin and remove Windows-specific shims. ([#258])

#### Media generation
- xAI Grok Imagine integration covering image, video, and native audio. ([#276])

#### Skills, design systems & prompt templates
- `kami` editorial paper design system with deck starter. ([#226])
- `html-ppt` skill (lewislulu/html-ppt-skill) with 15 per-template Examples cards. ([#193])
- `design-brief` skill with structured I-Lang input format. ([#184])
- Brand-agnostic craft references and Refero-derived lint rules. ([#225])
- 11 HyperFrames video prompt templates and media generation README section. ([#227])
- Three Kingdoms ARPG Seedance 2.0 video templates (3). ([#212])
- Three Kingdoms ARPG gameplay screenshot templates (3). ([#207])
- Otaku-dance choreography breakdown infographic template. ([#209])
- Anime fighting game screenshot template. ([#208])

#### Deployment & tooling
- `--prod` flag and `OD_HOST` for headless server deployment in `tools-dev`. ([#222])
- GitHub CI workflow. ([#271])
- Daemon `kindFor` / `mimeFor` file classifier tests. ([#269])

#### Internationalization
- Hungarian (`hu`) UI locale. ([#288])
- Polish (`pl`) UI locale. ([#273])
- Korean (`ko`) UI locale. ([#253])
- Turkish (`tr`) UI locale. ([#233])

### Changed

- Image / video projects now pick from prompt templates (not design systems). ([#192])
- Optimize Electron release artifact size. ([#249])

### Fixed

#### Daemon
- Restore `startServer` Promise contract — return `url` / `{ url, server }`. ([#268])
- Emit `tool_use` from `tool_execution_start` in pi-rpc. ([#186])
- Clamp Codex reasoning effort to model-supported values. ([#223])
- Deliver Claude Code prompt via stdin to avoid spawn `E2BIG` / `ENAMETOOLONG`. ([#143])
- Include `package.json` in tarball so packaged app reports correct version. ([#260])
- Treat `.py` files as previewable code in Design Files. ([#261])
- `OD_DAEMON_URL` uses port 0 instead of actual allocated port (now reports the real port). ([#240])
- Quote agent bin path when spawning with `shell:true` on Windows. ([#232])
- Make `max_tokens` configurable. ([#78])

#### Web UI
- Suppress hydration warning on `<body>`. ([#248])
- Fix language dropdown overflow in Settings modal. ([#281], [#287])
- Add scroll to Settings language menu when it overflows view. ([#247])
- Preserve deck preview pagination per file. ([#119])
- Fix deck preview pagination controls. ([#112])

#### Cross-platform
- Use junction instead of dir symlink on Windows in `tools-dev`. ([#231])

#### Internationalization
- Replace hardcoded `Claude` with `助手` in zh-TW assistant role copy. ([#262])

### Documentation

- Traditional Chinese (繁體中文) README. ([#194])

### Internal

- Auto-generated metrics SVG updates. ([#228], [#241])
- Fix metrics workflow protected branch updates. ([#219])

## [0.1.0] - 2026-05-01

First public release of Open Design — a local-first, open-source alternative to Anthropic's Claude Design. It detects your installed code-agent CLI, runs design skills against curated design systems, and streams artifacts into a sandboxed in-app preview.

### Added

#### Agent runtimes & providers
- Multi-agent runtime detection and dispatch: Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Qwen, GitHub Copilot CLI, Hermes, Kimi CLI, Pi, and Kiro. ([#28], [#71], [#117], [#185])
- Per-CLI model picker for local agents. ([#14])
- OpenAI-compatible provider support and Anthropic-compatible stream proxy for non-native providers. ([#80], [#180])
- App version awareness shared across daemon and web. ([#204])

#### Skills, design systems & prompt templates
- 72 brand-grade design systems and 31 composable skills, including Xiaohongshu and Replit Deck (8 themes). ([#24], [#74])
- 57 DESIGN.md specs imported from awesome-design-skills. ([#92])
- Dance storyboard and ancient-China MMO HUD prompt templates. ([#187])

#### Artifacts & preview
- Artifact platform foundation with sandboxed in-app preview. ([#68])
- First-class SVG and Markdown artifact renderers / viewer. ([#73], [#177])
- HTML preview support for relative-asset references. ([#156])
- Document preview support for uploaded files and multi-file design uploads. ([#31], [#63])
- Claude Design `.zip` import. ([#46])
- Image / video / audio media surfaces with unified `od media generate` dispatcher. ([#12])

#### Packaging & deployment
- Mac arm64 packaged runtime with signed/notarized DMG + update ZIP and beta release flow. ([#170])
- Windows x64 NSIS installer (unsigned beta) and release assets. ([#191])
- Vercel self-deploy flow with `vercel.json` configuration. ([#167], [#169])

#### Internationalization
- UI locales: zh-CN, zh-TW, en, ja, de, es-ES, ru, fa, pt-BR. ([#79], [#80], [#155], [#159], [#182], [#190], [#197])
- Improved language switcher UI. ([#107])

#### Developer experience & tools
- `tools-dev` / `tools-pack` workspace tooling for development and packaging, with native addon diagnostics and improved web startup flow. ([#127], [#128], [#153])
- `dev:all` auto-switches to a free port when defaults are busy. ([#9])
- UI end-to-end automation suite and reporting under `apps/e2e`. ([#64], [#102])
- Frontend toolchain migrated from Vite to Next.js 16 App Router. ([#66])
- Project code migrated to TypeScript with shared contracts. ([#118])
- Refreshed desktop integration control plane. ([#123])
- Star-us prompt to surface GitHub repo. ([#5])

### Fixed

#### Stability & reliability
- Chat runs survive web reconnects. ([#146])
- Daemon project-root resolution when launched from src via tsx. ([#162])
- SSE keepalive behind nginx. ([#111])
- Standalone pnpm binary supported in postinstall; install toolchain pinned. ([#35], [#151])
- Surface unfinished todo runs in chat. ([#76])

#### Cross-platform / Windows
- Spawn agents via resolved absolute path on Windows. ([#13])
- Deliver prompts via stdin for non-Claude agents to avoid `spawn ENAMETOOLONG`. ([#15])
- Mitigate Windows `ENAMETOOLONG` and fix daemon crash on cleanup. ([#75])
- Fix `PROMPT_TEMP_FILE()` call and Claude Code stdin delivery on Windows. ([#97])
- Normalize web dev tsconfig paths on Windows for `tools-dev`. ([#174])
- Support Claude Code CLI <1.0.86 (avoid `--include-partial-messages`, parse assistant wrapper text). ([#34])

#### Daemon & providers
- CORS header on raw project file endpoint. ([#140])
- Preserve non-ASCII filenames on multipart upload. ([#166])
- Stop passing literal dash to `cursor-agent`. ([#160])
- Non-interactive permissions for agent CLIs in web UI. ([#26])
- Codex plugin disable env. ([#133])
- Codex assistant agent labels. ([#70])

#### Web UI
- Welcome dialog: stop overwriting user's agent pick on Save. ([#4])
- Allow Claude Code to read skill seeds and design-system specs. ([#7])
- Question form checkbox selection limits enforced. ([#81])
- SettingsDialog content overflow + scrolling, refactored layout and modal styling. ([#83], [#88])
- Duplicate `H.` heading in `discovery.ts` (→ `I.`). ([#87])
- guizang-ppt: sync host slide counter on transform-paginated decks. ([#19])
- Toolbar button text wrapping prevented for CJK languages. ([#178])
- PreviewModal exits fullscreen on first Esc. ([#168])
- Dev indicator moved to bottom-right corner. ([#108])
- Design Files: align upload picker with dropzone, neutral agent copy, remove unsupported Figma copy. ([#199], [#200], [#201])
- Web locale registry test includes Japanese. ([#202])

### Documentation

- README refresh with stats, agents, skills, and metrics workflow. ([#173])
- Korean (한국어) and Japanese README and docs translations. ([#105], [#183])
- `TRANSLATIONS.md` i18n contribution guide. ([#196])
- Refresh environment setup guidance. ([#104])
- Xiaohongshu design-system docs review feedback. ([#54])

### Internal

- Initial project structure, project rename "Open Claude Design" → "Open Design", naming optimization. ([#1], [#2])
- Initial AGENTS.md and OpenCode agent instructions. ([#114])
- Beta release workflow placeholder. ([#36])
- Git commit co-author policy. ([#131])

[Unreleased]: https://github.com/nexu-io/open-design/compare/open-design-v0.5.0...HEAD
[0.5.0]: https://github.com/nexu-io/open-design/releases/tag/open-design-v0.5.0
[0.4.1]: https://github.com/nexu-io/open-design/releases/tag/open-design-v0.4.1
[0.4.0]: https://github.com/nexu-io/open-design/releases/tag/open-design-v0.4.0
[0.3.0]: https://github.com/nexu-io/open-design/releases/tag/open-design-v0.3.0
[0.2.0]: https://github.com/nexu-io/open-design/releases/tag/open-design-v0.2.0
[0.1.0]: https://github.com/nexu-io/open-design/releases/tag/open-design-v0.1.0

[#1]: https://github.com/nexu-io/open-design/pull/1
[#2]: https://github.com/nexu-io/open-design/pull/2
[#4]: https://github.com/nexu-io/open-design/pull/4
[#5]: https://github.com/nexu-io/open-design/pull/5
[#7]: https://github.com/nexu-io/open-design/pull/7
[#9]: https://github.com/nexu-io/open-design/pull/9
[#12]: https://github.com/nexu-io/open-design/pull/12
[#13]: https://github.com/nexu-io/open-design/pull/13
[#14]: https://github.com/nexu-io/open-design/pull/14
[#15]: https://github.com/nexu-io/open-design/pull/15
[#19]: https://github.com/nexu-io/open-design/pull/19
[#24]: https://github.com/nexu-io/open-design/pull/24
[#26]: https://github.com/nexu-io/open-design/pull/26
[#28]: https://github.com/nexu-io/open-design/pull/28
[#31]: https://github.com/nexu-io/open-design/pull/31
[#34]: https://github.com/nexu-io/open-design/pull/34
[#35]: https://github.com/nexu-io/open-design/pull/35
[#36]: https://github.com/nexu-io/open-design/pull/36
[#46]: https://github.com/nexu-io/open-design/pull/46
[#54]: https://github.com/nexu-io/open-design/pull/54
[#63]: https://github.com/nexu-io/open-design/pull/63
[#64]: https://github.com/nexu-io/open-design/pull/64
[#66]: https://github.com/nexu-io/open-design/pull/66
[#68]: https://github.com/nexu-io/open-design/pull/68
[#70]: https://github.com/nexu-io/open-design/pull/70
[#71]: https://github.com/nexu-io/open-design/pull/71
[#73]: https://github.com/nexu-io/open-design/pull/73
[#74]: https://github.com/nexu-io/open-design/pull/74
[#75]: https://github.com/nexu-io/open-design/pull/75
[#76]: https://github.com/nexu-io/open-design/pull/76
[#79]: https://github.com/nexu-io/open-design/pull/79
[#80]: https://github.com/nexu-io/open-design/pull/80
[#81]: https://github.com/nexu-io/open-design/pull/81
[#83]: https://github.com/nexu-io/open-design/pull/83
[#87]: https://github.com/nexu-io/open-design/pull/87
[#88]: https://github.com/nexu-io/open-design/pull/88
[#92]: https://github.com/nexu-io/open-design/pull/92
[#97]: https://github.com/nexu-io/open-design/pull/97
[#102]: https://github.com/nexu-io/open-design/pull/102
[#104]: https://github.com/nexu-io/open-design/pull/104
[#105]: https://github.com/nexu-io/open-design/pull/105
[#107]: https://github.com/nexu-io/open-design/pull/107
[#108]: https://github.com/nexu-io/open-design/pull/108
[#111]: https://github.com/nexu-io/open-design/pull/111
[#114]: https://github.com/nexu-io/open-design/pull/114
[#117]: https://github.com/nexu-io/open-design/pull/117
[#118]: https://github.com/nexu-io/open-design/pull/118
[#123]: https://github.com/nexu-io/open-design/pull/123
[#127]: https://github.com/nexu-io/open-design/pull/127
[#128]: https://github.com/nexu-io/open-design/pull/128
[#131]: https://github.com/nexu-io/open-design/pull/131
[#133]: https://github.com/nexu-io/open-design/pull/133
[#140]: https://github.com/nexu-io/open-design/pull/140
[#146]: https://github.com/nexu-io/open-design/pull/146
[#151]: https://github.com/nexu-io/open-design/pull/151
[#153]: https://github.com/nexu-io/open-design/pull/153
[#155]: https://github.com/nexu-io/open-design/pull/155
[#156]: https://github.com/nexu-io/open-design/pull/156
[#159]: https://github.com/nexu-io/open-design/pull/159
[#160]: https://github.com/nexu-io/open-design/pull/160
[#162]: https://github.com/nexu-io/open-design/pull/162
[#166]: https://github.com/nexu-io/open-design/pull/166
[#167]: https://github.com/nexu-io/open-design/pull/167
[#168]: https://github.com/nexu-io/open-design/pull/168
[#169]: https://github.com/nexu-io/open-design/pull/169
[#170]: https://github.com/nexu-io/open-design/pull/170
[#173]: https://github.com/nexu-io/open-design/pull/173
[#174]: https://github.com/nexu-io/open-design/pull/174
[#177]: https://github.com/nexu-io/open-design/pull/177
[#178]: https://github.com/nexu-io/open-design/pull/178
[#180]: https://github.com/nexu-io/open-design/pull/180
[#182]: https://github.com/nexu-io/open-design/pull/182
[#183]: https://github.com/nexu-io/open-design/pull/183
[#185]: https://github.com/nexu-io/open-design/pull/185
[#187]: https://github.com/nexu-io/open-design/pull/187
[#190]: https://github.com/nexu-io/open-design/pull/190
[#191]: https://github.com/nexu-io/open-design/pull/191
[#196]: https://github.com/nexu-io/open-design/pull/196
[#197]: https://github.com/nexu-io/open-design/pull/197
[#199]: https://github.com/nexu-io/open-design/pull/199
[#200]: https://github.com/nexu-io/open-design/pull/200
[#201]: https://github.com/nexu-io/open-design/pull/201
[#202]: https://github.com/nexu-io/open-design/pull/202
[#204]: https://github.com/nexu-io/open-design/pull/204
[#78]: https://github.com/nexu-io/open-design/pull/78
[#112]: https://github.com/nexu-io/open-design/pull/112
[#119]: https://github.com/nexu-io/open-design/pull/119
[#120]: https://github.com/nexu-io/open-design/pull/120
[#121]: https://github.com/nexu-io/open-design/pull/121
[#143]: https://github.com/nexu-io/open-design/pull/143
[#184]: https://github.com/nexu-io/open-design/pull/184
[#186]: https://github.com/nexu-io/open-design/pull/186
[#192]: https://github.com/nexu-io/open-design/pull/192
[#193]: https://github.com/nexu-io/open-design/pull/193
[#194]: https://github.com/nexu-io/open-design/pull/194
[#207]: https://github.com/nexu-io/open-design/pull/207
[#208]: https://github.com/nexu-io/open-design/pull/208
[#209]: https://github.com/nexu-io/open-design/pull/209
[#212]: https://github.com/nexu-io/open-design/pull/212
[#219]: https://github.com/nexu-io/open-design/pull/219
[#222]: https://github.com/nexu-io/open-design/pull/222
[#223]: https://github.com/nexu-io/open-design/pull/223
[#225]: https://github.com/nexu-io/open-design/pull/225
[#226]: https://github.com/nexu-io/open-design/pull/226
[#227]: https://github.com/nexu-io/open-design/pull/227
[#228]: https://github.com/nexu-io/open-design/pull/228
[#231]: https://github.com/nexu-io/open-design/pull/231
[#232]: https://github.com/nexu-io/open-design/pull/232
[#233]: https://github.com/nexu-io/open-design/pull/233
[#240]: https://github.com/nexu-io/open-design/pull/240
[#241]: https://github.com/nexu-io/open-design/pull/241
[#247]: https://github.com/nexu-io/open-design/pull/247
[#248]: https://github.com/nexu-io/open-design/pull/248
[#249]: https://github.com/nexu-io/open-design/pull/249
[#253]: https://github.com/nexu-io/open-design/pull/253
[#258]: https://github.com/nexu-io/open-design/pull/258
[#259]: https://github.com/nexu-io/open-design/pull/259
[#260]: https://github.com/nexu-io/open-design/pull/260
[#261]: https://github.com/nexu-io/open-design/pull/261
[#262]: https://github.com/nexu-io/open-design/pull/262
[#263]: https://github.com/nexu-io/open-design/pull/263
[#268]: https://github.com/nexu-io/open-design/pull/268
[#269]: https://github.com/nexu-io/open-design/pull/269
[#271]: https://github.com/nexu-io/open-design/pull/271
[#273]: https://github.com/nexu-io/open-design/pull/273
[#276]: https://github.com/nexu-io/open-design/pull/276
[#281]: https://github.com/nexu-io/open-design/pull/281
[#284]: https://github.com/nexu-io/open-design/pull/284
[#287]: https://github.com/nexu-io/open-design/pull/287
[#288]: https://github.com/nexu-io/open-design/pull/288
[#250]: https://github.com/nexu-io/open-design/pull/250
[#251]: https://github.com/nexu-io/open-design/pull/251
[#255]: https://github.com/nexu-io/open-design/pull/255
[#301]: https://github.com/nexu-io/open-design/pull/301
[#307]: https://github.com/nexu-io/open-design/pull/307
[#308]: https://github.com/nexu-io/open-design/pull/308
[#314]: https://github.com/nexu-io/open-design/pull/314
[#316]: https://github.com/nexu-io/open-design/pull/316
[#319]: https://github.com/nexu-io/open-design/pull/319
[#320]: https://github.com/nexu-io/open-design/pull/320
[#323]: https://github.com/nexu-io/open-design/pull/323
[#328]: https://github.com/nexu-io/open-design/pull/328
[#329]: https://github.com/nexu-io/open-design/pull/329
[#330]: https://github.com/nexu-io/open-design/pull/330
[#335]: https://github.com/nexu-io/open-design/pull/335
[#339]: https://github.com/nexu-io/open-design/pull/339
[#340]: https://github.com/nexu-io/open-design/pull/340
[#341]: https://github.com/nexu-io/open-design/pull/341
[#342]: https://github.com/nexu-io/open-design/pull/342
[#343]: https://github.com/nexu-io/open-design/pull/343
[#345]: https://github.com/nexu-io/open-design/pull/345
[#346]: https://github.com/nexu-io/open-design/pull/346
[#351]: https://github.com/nexu-io/open-design/pull/351
[#354]: https://github.com/nexu-io/open-design/pull/354
[#357]: https://github.com/nexu-io/open-design/pull/357
[#358]: https://github.com/nexu-io/open-design/pull/358
[#359]: https://github.com/nexu-io/open-design/pull/359
[#360]: https://github.com/nexu-io/open-design/pull/360
[#363]: https://github.com/nexu-io/open-design/pull/363
[#364]: https://github.com/nexu-io/open-design/pull/364
[#373]: https://github.com/nexu-io/open-design/pull/373
[#376]: https://github.com/nexu-io/open-design/pull/376
[#282]: https://github.com/nexu-io/open-design/pull/282
[#289]: https://github.com/nexu-io/open-design/pull/289
[#296]: https://github.com/nexu-io/open-design/pull/296
[#300]: https://github.com/nexu-io/open-design/pull/300
[#309]: https://github.com/nexu-io/open-design/pull/309
[#270]: https://github.com/nexu-io/open-design/pull/270
[#326]: https://github.com/nexu-io/open-design/pull/326
[#352]: https://github.com/nexu-io/open-design/pull/352
[#365]: https://github.com/nexu-io/open-design/pull/365
[#366]: https://github.com/nexu-io/open-design/pull/366
[#369]: https://github.com/nexu-io/open-design/pull/369
[#381]: https://github.com/nexu-io/open-design/pull/381
[#382]: https://github.com/nexu-io/open-design/pull/382
[#384]: https://github.com/nexu-io/open-design/pull/384
[#385]: https://github.com/nexu-io/open-design/pull/385
[#387]: https://github.com/nexu-io/open-design/pull/387
[#391]: https://github.com/nexu-io/open-design/pull/391
[#392]: https://github.com/nexu-io/open-design/pull/392
[#393]: https://github.com/nexu-io/open-design/pull/393
[#395]: https://github.com/nexu-io/open-design/pull/395
[#396]: https://github.com/nexu-io/open-design/pull/396
[#397]: https://github.com/nexu-io/open-design/pull/397
[#399]: https://github.com/nexu-io/open-design/pull/399
[#400]: https://github.com/nexu-io/open-design/pull/400
[#401]: https://github.com/nexu-io/open-design/pull/401
[#403]: https://github.com/nexu-io/open-design/pull/403
[#404]: https://github.com/nexu-io/open-design/pull/404
[#405]: https://github.com/nexu-io/open-design/pull/405
[#406]: https://github.com/nexu-io/open-design/pull/406
[#407]: https://github.com/nexu-io/open-design/pull/407
[#409]: https://github.com/nexu-io/open-design/pull/409
[#410]: https://github.com/nexu-io/open-design/pull/410
[#411]: https://github.com/nexu-io/open-design/pull/411
[#412]: https://github.com/nexu-io/open-design/pull/412
[#417]: https://github.com/nexu-io/open-design/pull/417
[#418]: https://github.com/nexu-io/open-design/pull/418
[#421]: https://github.com/nexu-io/open-design/pull/421
[#424]: https://github.com/nexu-io/open-design/pull/424
[#428]: https://github.com/nexu-io/open-design/pull/428
[#429]: https://github.com/nexu-io/open-design/pull/429
[#434]: https://github.com/nexu-io/open-design/pull/434
[#435]: https://github.com/nexu-io/open-design/pull/435
[#439]: https://github.com/nexu-io/open-design/pull/439
[#440]: https://github.com/nexu-io/open-design/pull/440
[#447]: https://github.com/nexu-io/open-design/pull/447
[#448]: https://github.com/nexu-io/open-design/pull/448
[#453]: https://github.com/nexu-io/open-design/pull/453
[#455]: https://github.com/nexu-io/open-design/pull/455
[#457]: https://github.com/nexu-io/open-design/pull/457
[#458]: https://github.com/nexu-io/open-design/pull/458
[#460]: https://github.com/nexu-io/open-design/pull/460
[#465]: https://github.com/nexu-io/open-design/pull/465
[#466]: https://github.com/nexu-io/open-design/pull/466
[#468]: https://github.com/nexu-io/open-design/pull/468
[#471]: https://github.com/nexu-io/open-design/pull/471
[#476]: https://github.com/nexu-io/open-design/pull/476
[#477]: https://github.com/nexu-io/open-design/pull/477
[#480]: https://github.com/nexu-io/open-design/pull/480
[#481]: https://github.com/nexu-io/open-design/pull/481
[#488]: https://github.com/nexu-io/open-design/pull/488
[#489]: https://github.com/nexu-io/open-design/pull/489
[#490]: https://github.com/nexu-io/open-design/pull/490
[#492]: https://github.com/nexu-io/open-design/pull/492
[#494]: https://github.com/nexu-io/open-design/pull/494
[#496]: https://github.com/nexu-io/open-design/pull/496
[#502]: https://github.com/nexu-io/open-design/pull/502
[#504]: https://github.com/nexu-io/open-design/pull/504
[#513]: https://github.com/nexu-io/open-design/pull/513
[#514]: https://github.com/nexu-io/open-design/pull/514
[#515]: https://github.com/nexu-io/open-design/pull/515
[#522]: https://github.com/nexu-io/open-design/pull/522
[#523]: https://github.com/nexu-io/open-design/pull/523
[#537]: https://github.com/nexu-io/open-design/pull/537
[#535]: https://github.com/nexu-io/open-design/pull/535
[#548]: https://github.com/nexu-io/open-design/pull/548
[#549]: https://github.com/nexu-io/open-design/pull/549
[#556]: https://github.com/nexu-io/open-design/pull/556
[#563]: https://github.com/nexu-io/open-design/pull/563
[#570]: https://github.com/nexu-io/open-design/pull/570
[#577]: https://github.com/nexu-io/open-design/pull/577
[#578]: https://github.com/nexu-io/open-design/pull/578
[#586]: https://github.com/nexu-io/open-design/pull/586
[#587]: https://github.com/nexu-io/open-design/pull/587
[#592]: https://github.com/nexu-io/open-design/pull/592
[#595]: https://github.com/nexu-io/open-design/pull/595
[#604]: https://github.com/nexu-io/open-design/pull/604
[#605]: https://github.com/nexu-io/open-design/pull/605
[#608]: https://github.com/nexu-io/open-design/pull/608
[#612]: https://github.com/nexu-io/open-design/pull/612
[#618]: https://github.com/nexu-io/open-design/pull/618
[#619]: https://github.com/nexu-io/open-design/pull/619
[#620]: https://github.com/nexu-io/open-design/pull/620
[#623]: https://github.com/nexu-io/open-design/pull/623
[#627]: https://github.com/nexu-io/open-design/pull/627
[#637]: https://github.com/nexu-io/open-design/pull/637
[#275]: https://github.com/nexu-io/open-design/pull/275
[#277]: https://github.com/nexu-io/open-design/pull/277
[#283]: https://github.com/nexu-io/open-design/pull/283
[#293]: https://github.com/nexu-io/open-design/pull/293
[#306]: https://github.com/nexu-io/open-design/pull/306
[#362]: https://github.com/nexu-io/open-design/pull/362
[#390]: https://github.com/nexu-io/open-design/pull/390
[#414]: https://github.com/nexu-io/open-design/pull/414
[#493]: https://github.com/nexu-io/open-design/pull/493
[#507]: https://github.com/nexu-io/open-design/pull/507
[#524]: https://github.com/nexu-io/open-design/pull/524
[#530]: https://github.com/nexu-io/open-design/pull/530
[#531]: https://github.com/nexu-io/open-design/pull/531
[#555]: https://github.com/nexu-io/open-design/pull/555
[#591]: https://github.com/nexu-io/open-design/pull/591
[#611]: https://github.com/nexu-io/open-design/pull/611
[#614]: https://github.com/nexu-io/open-design/pull/614
[#621]: https://github.com/nexu-io/open-design/pull/621
[#622]: https://github.com/nexu-io/open-design/pull/622
[#625]: https://github.com/nexu-io/open-design/pull/625
[#626]: https://github.com/nexu-io/open-design/pull/626
[#631]: https://github.com/nexu-io/open-design/pull/631
[#655]: https://github.com/nexu-io/open-design/pull/655
[#664]: https://github.com/nexu-io/open-design/pull/664
[#667]: https://github.com/nexu-io/open-design/pull/667
[#670]: https://github.com/nexu-io/open-design/pull/670
[#671]: https://github.com/nexu-io/open-design/pull/671
[#674]: https://github.com/nexu-io/open-design/pull/674
[#675]: https://github.com/nexu-io/open-design/pull/675
[#678]: https://github.com/nexu-io/open-design/pull/678
[#680]: https://github.com/nexu-io/open-design/pull/680
[#683]: https://github.com/nexu-io/open-design/pull/683
[#685]: https://github.com/nexu-io/open-design/pull/685
[#686]: https://github.com/nexu-io/open-design/pull/686
[#696]: https://github.com/nexu-io/open-design/pull/696
[#697]: https://github.com/nexu-io/open-design/pull/697
[#698]: https://github.com/nexu-io/open-design/pull/698
[#700]: https://github.com/nexu-io/open-design/pull/700
[#708]: https://github.com/nexu-io/open-design/pull/708
[#712]: https://github.com/nexu-io/open-design/pull/712
[#718]: https://github.com/nexu-io/open-design/pull/718
[#720]: https://github.com/nexu-io/open-design/pull/720
[#722]: https://github.com/nexu-io/open-design/pull/722
[#727]: https://github.com/nexu-io/open-design/pull/727
[#735]: https://github.com/nexu-io/open-design/pull/735
[#738]: https://github.com/nexu-io/open-design/pull/738
[#740]: https://github.com/nexu-io/open-design/pull/740
[#747]: https://github.com/nexu-io/open-design/pull/747
[#755]: https://github.com/nexu-io/open-design/pull/755
[#768]: https://github.com/nexu-io/open-design/pull/768
[#778]: https://github.com/nexu-io/open-design/pull/778
[#781]: https://github.com/nexu-io/open-design/pull/781
[#788]: https://github.com/nexu-io/open-design/pull/788
[#795]: https://github.com/nexu-io/open-design/pull/795
[#799]: https://github.com/nexu-io/open-design/pull/799
[#801]: https://github.com/nexu-io/open-design/pull/801
[#805]: https://github.com/nexu-io/open-design/pull/805
