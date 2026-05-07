---
id: 20260507-langfuse-telemetry
name: Langfuse Telemetry Integration
status: proposed
created: '2026-05-07'
---

## Overview

### Problem Statement

We have no visibility into how Open Design is actually used in the wild — what
prompts users send, how successful agent runs are, how many artifacts get
produced, where users hit failures. The repo today contains zero telemetry,
analytics, or trace-export code. We want to forward agent run information to
[Langfuse](https://langfuse.com) so that product and engineering can observe
real usage and generation quality, without building a bespoke backend.

A previous internal project ([nexu](file:///Users/elian/Documents/refly/nexu),
not in this repo) shipped a similar Langfuse passthrough as an OpenClaw
runtime plugin (`apps/controller/static/runtime-plugins/langfuse-tracer/`,
introduced in commit `8ee2c801` "inject langfuse build secrets into desktop
packaging"). This spec adapts that approach to Open Design's daemon-driven
architecture, with stricter privacy defaults appropriate to a public
Apache-2.0 codebase.

### Goals

- Report agent-run telemetry (prompts, responses, token usage, artifact
  manifest) to Langfuse so generation quality and usage can be observed.
- Wire the integration through the existing `app-config` preferences surface
  so users can inspect and disable it.
- Keep Langfuse credentials out of the open-source codebase by injecting them
  through CI build secrets (only official Open Design builds ship with keys).
- Default to a transparent first-run consent surface: a single button
  enables both anonymous metrics and conversation content; artifact
  manifest stays off until the user opts in separately in Settings.

### Non-Goals

- **Uploading artifact file bodies (HTML, JSX, PPTX JSON, assets)** to
  Langfuse. Langfuse is an LLM observability platform, not blob storage; this
  spec only sends the artifact *manifest* (filename, size, sha256). Body
  upload, if ever wanted, requires a separate object-storage spec.
- **Backfilling historical SQLite data**. Reporting starts at install /
  consent moment, going forward only.
- **Replacing Langfuse with OpenTelemetry** for this iteration, even though
  Langfuse [recommends OTLP](https://langfuse.com/docs/api) for new
  integrations. See §5.2 for the rationale; revisit when legacy ingestion is
  formally deprecated.
- **In-app trace viewer / dashboards**. Users go to Langfuse UI; we do not
  build any local UI on top of the data.

### Scope

- New module `apps/daemon/src/langfuse-trace.ts` (~150 LOC, no new deps).
- New `TelemetryPrefs` field on `AppConfigPrefs` in
  `packages/contracts/src/api/app-config.ts` and corresponding
  `applyConfigValue` / `ALLOWED_KEYS` updates in
  `apps/daemon/src/app-config.ts`.
- New `Privacy` tab in `apps/web/src/components/SettingsDialog.tsx`,
  with three independent toggles, plus a first-run consent step in
  onboarding.
- New i18n keys `settings.privacy.*` in all 14 locales under
  `apps/web/src/i18n/locales/`.
- Build-secret plumbing in the `tools/pack` packaging path so
  `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` are
  available to the daemon process inside packaged builds.
- New top-level `docs/privacy.md` describing what is collected, retention,
  and how to disable.

### Constraints

- Integration must impose zero overhead when keys are absent (dev builds,
  third-party forks). The module short-circuits at register time if
  `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` are not set.
- Reporting must never block, throw out of, or slow down a run's completion
  path. Failures are warned and dropped.
- Truncation/scrubbing must happen client-side (in the daemon), because
  Langfuse [does not offer server-side
  masking](https://langfuse.com/docs/observability/features/masking).
- All new daemon writes must respect the existing `AppConfigPrefs` strict
  whitelist in `apps/daemon/src/app-config.ts:27-87`; new fields require
  matching `applyConfigValue` branches.
- `sessionId` must stay under 200 ASCII chars
  ([Langfuse Sessions](https://langfuse.com/docs/observability/features/sessions)).
  Our `conversationId` is a uuid (36 chars), well under the limit.
- A single ingestion request must stay under 5 MB and a batch under ~3.5 MB
  ([Langfuse API Limits](https://langfuse.com/faq/all/api-limits)). Per-trace
  budget below targets ~30 KB.

## Background Facts

References listed once here so the rest of the doc can cite them by tag.

### Open Design (this repo)

| Tag | Fact | Source |
|---|---|---|
| F1 | Conversations and messages live in SQLite. `messages` columns include `role`, `content`, `run_id`, `run_status`, `events_json`, `produced_files_json`, `started_at`, `ended_at`, `position`. | `apps/daemon/src/db.ts:60-90` |
| F2 | `upsertMessage()` is the sole message persistence entry, called from `PUT /api/projects/:id/conversations/:cid/messages/:mid`. | `apps/daemon/src/db.ts:629-716`; `apps/daemon/src/server.ts:895-911` |
| F3 | Run lifecycle: terminal states are `succeeded` / `failed` / `canceled`. The in-memory event buffer is a 2000-event ring; terminal runs are kept 30 min then GC'd. | `apps/daemon/src/runs.ts:4-46` |
| F4 | Agents are spawned via `spawn()` and emit SSE events through `send('agent', ev)`; token usage arrives on the `usage` event from `claude-stream.ts`. | `apps/daemon/src/server.ts:2081-2412` (esp. 2351-2391) |
| F5 | Artifacts are stored at `<dataDir>/artifacts/<ISO-timestamp>-<slug>/{artifact.json, index.html\|*.jsx\|*.md, assets/}` via `POST /api/artifacts/save`. | `apps/daemon/src/server.ts:1340-1367`; `docs/architecture.md:158-185` |
| F6 | Per-message produced-file manifest lives in `messages.produced_files_json` with `MAX_METADATA_BYTES = 16 KB`. | `apps/daemon/src/artifact-manifest.ts:11`; `apps/daemon/src/db.ts:81` |
| F7 | App preferences flow `Web → PUT /api/app-config → writeAppConfig → <dataDir>/app-config.json`. New fields require updates to `AppConfigPrefs`, `ALLOWED_KEYS`, and `applyConfigValue`. | `apps/daemon/src/app-config.ts:19-87,99-153`; `packages/contracts/src/api/app-config.ts` |
| F8 | `SettingsDialog.tsx` currently has six tabs (`execution`, `media`, `language`, `appearance`, `pet`, `about`). No privacy/telemetry tab today. | `apps/web/src/components/SettingsDialog.tsx` |
| F9 | i18n keys follow `settings.<camelCase>` convention; 14 locales under `apps/web/src/i18n/locales/`. | `apps/web/src/i18n/locales/en.ts:45-120` |
| F10 | Repo has zero existing telemetry, analytics, posthog, sentry, or langfuse code (verified by grep). | grep |
| F11 | License is Apache-2.0; the codebase is fully public. | `LICENSE:1-3` |
| F12 | Daemon already reads env vars in the `process.env.OD_*` style; new vars follow the same convention. | `apps/daemon/src/server.ts:250,314,597`; `apps/daemon/src/cli.ts:62-63` |

### Langfuse platform

| Tag | Fact | Source |
|---|---|---|
| L1 | Ingestion endpoint is `POST /api/public/ingestion` with Basic Auth (`base64(public:secret)`). Body is `{ batch: Event[] }`. | <https://langfuse.com/docs/api>, <https://langfuse.com/faq/all/api-limits> |
| L2 | Event types in batch include `trace-create`, `generation-create`, `span-create`, `score-create`, `observation-update`. The reference `langfuse-tracer/index.js` only uses the first two. | <https://api.reference.langfuse.com/> |
| L3 | OTel endpoint `/api/public/otel` is the recommended path going forward; legacy ingestion is **not yet** assigned a deprecation date. | <https://langfuse.com/integrations/native/opentelemetry>, <https://langfuse.com/docs/api> |
| L4 | Single request ≤ 5 MB; recommended batch ≤ 3.5 MB; `sessionId` ≤ 200 ASCII chars (otherwise dropped). No documented per-field byte cap beyond the 5 MB request frame. | <https://langfuse.com/faq/all/api-limits>, <https://langfuse.com/docs/observability/features/sessions> |
| L5 | Hobby (free) tier: 50,000 units/month, 30-day retention, 1,000 batched-ingestion req/min. Returns HTTP 429 + `Retry-After` on overflow. | <https://langfuse.com/pricing>, <https://langfuse.com/faq/all/api-limits> |
| L6 | Sessions are a grouping container. Multiple traces with the same `sessionId` show up as one session replay. **There is no explicit "session end" signal.** | <https://langfuse.com/docs/observability/features/sessions> |
| L7 | Multi-modal media (PNG/JPG/WebP, MP3/WAV/MPEG, PDF, plain text) supported. SDKs auto-handle base64 data URIs; raw upload via `POST /api/public/media` → presigned `PUT`. Media is currently free on Cloud, with explicit reservation to add pricing later. No documented per-file size cap. | <https://langfuse.com/docs/observability/features/multi-modality> |
| L8 | Masking is **client-side only** (`mask` function on the SDK). No server-side filtering documented. | <https://langfuse.com/docs/observability/features/masking> |
| L9 | Self-hosting is the same codebase as Cloud; requires Postgres, ClickHouse, Redis, S3-compatible blob. Core ingestion/sessions/media work in OSS. | <https://langfuse.com/self-hosting> |

### Compliance

| Tag | Fact | Source |
|---|---|---|
| C1 | Under GDPR, user content is personal data; processing requires affirmative opt-in. **No pre-checked boxes**, accept/reject buttons need equal prominence, bundled consent is an EDPB enforcement target. | [EDPB Guidelines 05/2020 on consent](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf), [EDPB summary 2026-04](https://www.edpb.europa.eu/system/files/2026-04/edpb-summary-consent_en.pdf) |
| C2 | VS Code remains opt-out for telemetry and is repeatedly criticized for it (issues #47284, #176269). Cursor exposes granular opt-out switches. | <https://code.visualstudio.com/docs/configure/telemetry>, <https://github.com/microsoft/vscode/issues/176269>, <https://howtoharden.com/guides/cursor/> |
| C3 | Continue.dev (a comparable AI coding tool) splits "anonymous metrics on, content off" by default. | <https://docs.continue.dev/customize/telemetry> |

## Design

### Data Model Mapping (from F1–F6, L1, L6)

```
open-design                       Langfuse
─────────────────                 ──────────────────────────
project                           userId = installationId,
                                  + tag "project:<projectId>"
conversation                ─►    session   (sessionId = conversationId)
message (one turn) + run    ─►    trace     (id = messageId)
  └─ LLM call                ─►    generation (parent = trace)
artifacts produced this turn ─►   trace.metadata.artifacts[] (manifest only)
events_json (SSE buffer)     ─►   trace.metadata.eventsSummary (counters)
```

- `installationId` is a random uuid generated on first consent and stored in
  `app-config.json`. **No email, no account binding.**
- `conversationId` (uuid, 36 chars) easily fits Langfuse's 200-char
  `sessionId` limit (L4).
- We do **not** send raw `events_json` (can be 100 KB+ per F3); we summarize
  it into counters (`{ toolCalls, errors, durationMs }`).

### Trigger Point (from F3, F4)

Inside the existing run-close path in `apps/daemon/src/server.ts:2401`
(the `child.on('close', …)` handler), once `run.status` transitions to a
terminal state:

1. Read the persisted message via `getMessage(db, runId)` (F2).
2. Read `TelemetryPrefs` from `app-config.json`.
3. Build the trace + generation payload (§Field Budget below).
4. Fire-and-forget POST to Langfuse with a 5 s timeout. Errors are
   `console.warn`'d and dropped — never thrown, never retried.

**Why not on `upsertMessage`**: that endpoint is web-driven and may fire
multiple times per turn (drafts, edits, retries). Run-close is a single,
daemon-controlled signal per turn — exactly what we want a trace to map to.

### Module Layout

New file `apps/daemon/src/langfuse-trace.ts` (~150 LOC, **no `langfuse` npm
dep**, mirrors the nexu reference implementation's lean fetch-only style):

```text
langfuse-trace.ts
├─ readLangfuseConfig()        // reads env; returns null if keys absent (no-op mode)
├─ buildTracePayload(ctx)      // truncation per Field Budget table
├─ postLangfuseBatch(cfg, b)   // fetch + AbortSignal.timeout(5000) + warn-on-fail
└─ reportRunCompleted(ctx)     // top-level; respects TelemetryPrefs gates
```

We deliberately do **not** pull in `langfuse`, `@langfuse/tracing`, or
`@langfuse/otel`. Reasons: zero new deps, single-file auditable surface,
and the legacy ingestion API has no announced deprecation date (L3). When
that changes we revisit.

### Field Budget (from L4, L8)

Truncation happens **before** the fetch call, in `buildTracePayload`.

| Field | Cap | Why |
|---|---|---|
| `trace.input` (last user message) | 8 KB | Open Design prompts often include layout/design descriptions. nexu's 2 KB cap is too tight for our use case. |
| `trace.output` (final assistant message text) | 16 KB | Generated artifacts are routinely >4 KB; 16 KB lets meaningful samples through while leaving room. |
| `generation.usage` | full | 4–5 small numbers. |
| `metadata.artifacts[]` | ≤ 50 entries, manifest-only (`{slug, type, sizeBytes, sha256, createdAt}`) | An entire turn producing 50 artifacts is already an outlier; we skip the rest with a `truncated: true` flag. |
| `metadata.eventsSummary` | counters only (`{toolCalls, errors, durationMs}`) | Raw `events_json` can be 100 KB+ per F3. |
| Hard guard | If serialized batch > 1 MB after the above, drop the trace and warn. | Defense in depth against the 5 MB request limit (L4). |

Estimated typical trace size: ~30 KB, ~100× under the 3.5 MB batch ceiling.

### Failure & Degradation (from L5)

- **No keys**: `register()` returns immediately. Cost on the run-close path
  is one cheap env-var read.
- **Network failure / timeout**: `console.warn`, drop. No retry queue, no
  local persistence — additional state would carry its own privacy and
  reliability cost.
- **HTTP 429**: same path as network failure for now. Hobby tier allows
  1,000 batched req/min (L5), well above realistic load.
- **Process restart**: in-flight unsent traces are lost. Acceptable.

### Privacy Defaults (from C1, C2, C3 — decisions resolved 2026-05-07)

Three independent prefs persisted on `AppConfigPrefs.telemetry`:

| Pref | What it sends | Default before consent | After Share clicked | Rationale |
|---|---|---|---|---|
| `telemetry.metrics` | `installationId`, run counts, token totals, error rate, duration | off | **on** | Industry baseline (C2, C3). |
| `telemetry.content` | `trace.input` + `trace.output` text | off | **on** | Owner accepted bundled-consent risk on 2026-05-07; mitigated by transparent first-run wording (see below). |
| `telemetry.artifactManifest` | filename, type, size, sha256 (no body) | off | off | Brand assets / unreleased mockups are sensitive; user must opt in separately in Settings. |

**First-run consent card** (the only place where `metrics` and `content`
get switched on):

- Two equally-prominent buttons. Reject must not be smaller, dimmer, or
  buried (C1 "equal prominence" requirement).
- Wording must enumerate the two categories explicitly. Strawman:
  > "Help improve Open Design by sharing usage data with our team. This
  > includes:
  > - **Anonymous metrics**: run counts, token usage, error rate, duration.
  > - **Conversation content**: the prompts you send and the responses the
  >   AI generates.
  >
  > You can change either of these any time in Settings → Privacy."
  >
  > **[Share usage data]** **[Don't share]**
- The button label is `Share usage data`, **not** `Share anonymous
  metrics` — the latter would be misleading because content is also
  shipped (C1 transparency).
- Clicking *Share usage data* sets `metrics=true` and `content=true` and
  generates the random `installationId`. Clicking *Don't share* leaves
  all three off and `installationId=null`.
- `artifactManifest` is **never** auto-enabled; users must visit
  `Settings → Privacy` to switch it on. The reason: artifact filenames
  often leak product names / brand asset names that are not in the
  conversation text.

`Settings → Privacy` exposes all three toggles independently after the
first-run choice. Toggling any of them off must take effect immediately
and prevent further reporting from that turn on.

### Identifier (Q5 resolved: random `installationId`)

`installationId` is a v4 uuid generated at the moment the user clicks
*Share usage data*, persisted to `app-config.json`. Properties:

- No machine-id / hardware fingerprint / email / account binding.
- Lowest GDPR risk: clearing `.od/app-config.json` produces a new id, so
  the field is genuinely unlinkable across reinstalls (acknowledged
  trade-off: cohort analysis loses precision after reinstall).
- Used as Langfuse `userId` and as part of trace tags.

### Right to Deletion (Q10 resolved: rotate-and-let-expire)

When a user wants their data removed, the flow is:

1. `Settings → Privacy → Delete my data` button (or an email request to
   the address documented in `docs/privacy.md`).
2. The daemon rotates `installationId` (writes a new uuid) and disables
   `metrics`, `content`, `artifactManifest` in `AppConfigPrefs`. From this
   moment, no further traces from this install can be linked to the prior
   identity.
3. We do **not** call Langfuse's [trace deletion API][langfuse-deletion].
   Existing traces age out under the org's retention setting.

Compliance posture (C1, GDPR Art. 17):

- This satisfies "right to erasure" only if our promised retention is
  short enough to be defensible as "undue delay." Hobby's 30-day
  retention (L5) is on the edge of acceptable; longer retention would
  require revisiting this decision in favor of an active deletion call
  (option B in the Q10 discussion).
- Retention must be promised in `docs/privacy.md` in absolute terms
  (e.g. "data is retained for at most 30 days from collection").
- The Privacy tab UI must show, near the Delete button, the current
  retention duration so users understand what "delete" means here.

[langfuse-deletion]: https://langfuse.com/faq/all/api-limits

### `AppConfigPrefs` Changes (from F7)

`packages/contracts/src/api/app-config.ts`:

```ts
export interface TelemetryPrefs {
  metrics?: boolean;
  content?: boolean;
  artifactManifest?: boolean;
}

export interface AppConfigPrefs {
  // …existing fields
  installationId?: string | null;
  telemetry?: TelemetryPrefs;
}
```

`apps/daemon/src/app-config.ts`:

- Extend `ALLOWED_KEYS` with `'installationId'` and `'telemetry'`.
- Add a branch in `applyConfigValue()` for `telemetry` that validates each
  inner key as boolean (mirrors the existing `agentModels` validator at
  `apps/daemon/src/app-config.ts:51-64`).
- Add a branch for `installationId` (string-or-null), pattern at
  `apps/daemon/src/app-config.ts:75-77`.
- New unit tests in `apps/daemon/src/app-config.test.ts`: round-trip of
  telemetry prefs, rejection of malformed inner values.

### Build-Secret Injection (from nexu commit `8ee2c801`)

| Variable | Source | Path into daemon |
|---|---|---|
| `LANGFUSE_PUBLIC_KEY` | GitHub Actions org/repo secret | `tools/pack` packaging step → bundled into Electron main env when launching daemon |
| `LANGFUSE_SECRET_KEY` | same | same |
| `LANGFUSE_BASE_URL` | same (default `https://us.cloud.langfuse.com`, see Q3) | same |

Concrete edits:

- `tools/pack/src/win.ts` (and the macOS sibling) add the three vars to the
  daemon-launch env when present in the build environment.
- New CI workflow inputs mirror nexu's `desktop-build.yml` style (`env:
  LANGFUSE_*: ${{ secrets.LANGFUSE_* }}` at the workflow level).

**Important consequence**: only Open Design's official CI builds carry
keys. `pnpm tools-dev`, hand-built dev runs, and third-party forks land in
"no key → no-op" mode (L5 quota and our blast radius are both protected).

## Implementation Plan

Order is chosen so each step is independently shippable / testable.

1. **Contracts + app-config plumbing.** Add `TelemetryPrefs` /
   `installationId` to `AppConfigPrefs`, extend `ALLOWED_KEYS` and
   `applyConfigValue`, add tests. **Validation**: `pnpm typecheck && pnpm
   --filter @open-design/daemon test`.
2. **`langfuse-trace.ts` module.** New file, fully unit-tested with mock
   fetch (no network in tests). Truncation, no-key short-circuit, summary
   builder. **Validation**: new tests under `apps/daemon/src/`.
3. **Wire into run-close.** `server.ts:2401` calls
   `reportRunCompleted()` inside a try/catch. **Validation**: a manual run
   with `LANGFUSE_PUBLIC_KEY=fake` confirms the warn path; a manual run
   with real keys (locally exported) confirms a trace appears in Langfuse
   UI.
4. **Onboarding consent card.** New step before the existing onboarding
   flow exits. *Share usage data* sets `metrics=true`, `content=true`,
   and generates `installationId`; *Don't share* leaves all three off.
   Wording must list both categories per §Privacy Defaults.
   **Validation**: `pnpm test:ui` covers both buttons writing the
   expected `app-config.json` shape.
5. **Settings → Privacy tab.** Three toggles, link to `docs/privacy.md`.
   **Validation**: `pnpm test:ui` for the toggles' read/write of
   `app-config`.
6. **i18n.** 14 locales × ~10 new keys. Run `pnpm test` to make sure the
   `locales.test.ts` parity check passes.
7. **`tools/pack` env injection.** Pass `LANGFUSE_*` through packaging.
   **Validation**: `pnpm build` of a packaged build, inspect via
   `pnpm tools-dev inspect desktop status` that env reaches daemon.
8. **`docs/privacy.md` + README link.** What we collect, retention, how to
   disable, where to ask for deletion. **Validation**: review with the
   Q1–Q7 answers below baked in.
9. **CI secrets.** Add `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` /
   `LANGFUSE_BASE_URL` to the desktop build workflow. **Validation**:
   trigger a CI build, confirm a trace from a packaged run.

Each step touches a bounded surface; a partial landing leaves the system in
"telemetry off" by default, which is the intended fallback.

## Resolved Decisions (2026-05-07)

| # | Decision | Notes |
|---|---|---|
| Q1 | First-run *Share usage data* button enables both `metrics` and `content`; wording must explicitly list both categories. Owner accepted the bundled-consent compliance risk; mitigation lives in transparent wording + per-toggle Settings exposure. | See §Privacy Defaults. |
| Q3 | Langfuse **US** (`https://us.cloud.langfuse.com`). Initial preference was EU based on the nexu module's `DEFAULT_BASE_URL`, but an end-to-end smoke on 2026-05-07 with the actual dev key returned `401 Invalid credentials. Confirm that you've configured the correct host.` from `cloud.langfuse.com` and `207 Multi-Status` from `us.cloud.langfuse.com`, confirming the org lives in US. nexu commit `8ee2c801` injects `LANGFUSE_BASE_URL` from CI secrets so its hard-coded EU default was never authoritative. | Set as the `LANGFUSE_BASE_URL` default. |
| Q5 | Random v4 uuid `installationId` generated at consent time, persisted in `app-config.json`. No machine-id / hardware fingerprint. | See §Identifier. |
| Q8 | Owner: project owner (`lefarcen`). Holds Langfuse org admin, billing, key rotation. | Step 9 unblocked. |
| Q10 | Right-to-deletion = "rotate `installationId` locally + let Langfuse retention expire". No active trace-deletion API call. **Implicitly binds us to a short retention promise** (see Q9 follow-up and R7). | See §Right to Deletion. |

## Open Questions

These do not block steps 1–2 of the plan (contracts + module + tests with
mock fetch); they need answers before later steps.

| # | Question | Default proposal | Blocks step |
|---|---|---|---|
| Q2 | Should artifact bodies (HTML/JSX/PPTX JSON) ever be uploaded? | Out of scope for this spec; would require a follow-up object-storage spec. | n/a (excluded) |
| Q4 | Legacy ingestion or OTel for the first version? | Legacy (L3 has no deprecation date; one fewer dep). | 2 |
| Q6 | README disclosure: do we say "official builds report usage data by default after first-run consent; toggle in Settings → Privacy"? | Yes — pre-empts community reaction (C2). | 8 |
| Q7 | Hobby tier 50k events/month (L5). With `content=on` after consent, expect 2 events per turn (trace + generation), so ~830 turns/day across the whole user base before capping. Upgrade, sample, or self-host? | Decide based on early traffic. Build in a hard cap (`OD_LANGFUSE_DAILY_CAP`) and a sampling factor as escape hatches. | 9 (capacity) |
| Q9 | What retention do we promise in `docs/privacy.md`? Hobby gives 30 days only (L5); paid or self-host can be longer. | Match whatever tier the owner picks; default to 30 days until then. | 8 |
| Q11 | Local dev key location. Owner believed keys were in `~/Documents/refly/nexu/.env*`; grep on 2026-05-07 found none. Likely they only ever lived in GitHub Actions secrets. Owner to fetch a dev key from the Langfuse cloud console and store it via `direnv` / Keychain (never in a tracked `.env`). Until then, step 3 lands with mock-fetch tests only. | 3 (end-to-end validation) |

## Risks

- **R1** — *Public-codebase fork shipping our keys*. Anyone forking and
  building the desktop app could exfiltrate our keys if we shipped them in
  source. Mitigation: keys live in CI secrets only (§Build-Secret
  Injection); third-party builds run no-op.
- **R2** — *Hobby quota DoS*. 50k units/month is small (L5). Mitigation:
  metrics-only mode keeps each turn at one event, predictable growth; add
  client-side sampling if needed; upgrade tier or self-host before caps.
- **R3** — *Sensitive content leakage despite content=off*. The trace
  metadata path could accidentally include user content (e.g. via summary
  fields). Mitigation: explicit allowlist of fields in the summary builder
  + unit test that asserts `trace.input/output` are absent when
  `content=false`.
- **R4** — *Langfuse legacy API deprecation*. L3 says OTel is recommended;
  no date set. Mitigation: keep the module thin so a swap to
  `@langfuse/tracing` later is a contained refactor.
- **R5** — *EDPB scrutiny of bundled consent*. The first-run button
  enables both `metrics` and `content` together (Q1 resolution).
  EDPB guidance treats bundled consent as a primary enforcement target
  (C1). Mitigations: (a) the consent card must enumerate both categories
  in the wording, not hide content under a "metrics" label; (b)
  `Settings → Privacy` exposes both toggles independently after
  onboarding so users can revoke `content` while keeping `metrics`; (c)
  `artifactManifest` stays opt-in. If legal pressure rises later, the
  fallback is to split the first-run card into two checkboxes — that is
  a localized UI change, no protocol or storage change.
- **R6** — *Identifier reset on `.od/` clear*. The random
  `installationId` (Q5 resolution) makes a returning user look like a
  brand-new user after `.od/app-config.json` is cleared. Cohort and
  retention analyses lose precision. Mitigation: documented in
  `docs/privacy.md` as an intentional privacy property; if sharper
  cohorting becomes important, revisit Q5 with a hashed-machine-id
  alternative behind an explicit consent string.
- **R7** — *Q10 binds us to short retention*. The "rotate-and-expire"
  deletion model (Q10 resolution) only satisfies GDPR Art. 17 if the
  org's retention is short enough that "delete = stop sending + wait" is
  defensible as undue-delay-free. Hobby's 30 days (L5) is borderline OK;
  Pro's 3-year retention is **not**. Mitigation: if we ever upgrade past
  Hobby for capacity reasons (Q7), Q10 must be re-opened to add an
  active `POST /api/public/trace/{id}` deletion call. Add a tripwire
  test that asserts `docs/privacy.md` retention number and the actual
  Langfuse org retention setting agree.

## References

- Open Design: cited inline by `path:line` (this repo).
- nexu reference implementation:
  `/Users/elian/Documents/refly/nexu/apps/controller/static/runtime-plugins/langfuse-tracer/`
  (commit `8ee2c801`).
- Langfuse: <https://langfuse.com/docs/api>,
  <https://langfuse.com/faq/all/api-limits>,
  <https://langfuse.com/docs/observability/features/sessions>,
  <https://langfuse.com/docs/observability/features/multi-modality>,
  <https://langfuse.com/docs/observability/features/masking>,
  <https://langfuse.com/docs/observability/features/queuing-batching>,
  <https://langfuse.com/integrations/native/opentelemetry>,
  <https://langfuse.com/pricing>, <https://langfuse.com/self-hosting>.
- Compliance:
  <https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf>,
  <https://www.edpb.europa.eu/system/files/2026-04/edpb-summary-consent_en.pdf>,
  <https://code.visualstudio.com/docs/configure/telemetry>,
  <https://github.com/microsoft/vscode/issues/176269>,
  <https://docs.continue.dev/customize/telemetry>.
