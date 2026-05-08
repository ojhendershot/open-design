# Merge Conflicts Analysis

## Scope and Method

- Repository: `nexu-io/open-design`
- PR range: PRs created since `2026-05-03`
- Sample size: 353 PRs
- Verification method: each PR head was merged locally into current `origin/main` in an isolated clone
- Primary reporting scope: unmerged PRs (`OPEN` and closed-unmerged PRs)
- Result: 116 unmerged PRs were checked; 55 produced actual merge conflicts

## Exact Conflict File Frequency

| Rank | File | Conflicting PR count | Conflict hunk count |
|---:|---|---:|---:|
| 1 | `apps/daemon/src/server.ts` | 13 | 61 |
| 2 | `README.md` | 7 | 18 |
| 3 | `apps/web/src/i18n/content.ts` | 7 | 16 |
| 4 | `apps/daemon/src/agents.ts` | 6 | 16 |
| 5 | `apps/web/src/App.tsx` | 6 | 17 |
| 6 | `apps/web/src/index.css` | 6 | 19 |
| 7 | `apps/web/src/i18n/content.fr.ts` | 6 | 8 |
| 8 | `apps/web/src/i18n/content.ru.ts` | 6 | 8 |
| 9 | `apps/daemon/tests/agents.test.ts` | 4 | 12 |
| 10 | `packages/contracts/package.json` | 4 | 9 |

## Observed Conflict Patterns and Causes

### 1. Centralized daemon server file conflicts

Primary file: `apps/daemon/src/server.ts`

Observed PRs include #884, #815, #761, #719, #641, #639, #568, #532, #486, #469, #432, #378, and #355.

The file receives changes from many daemon feature lanes at once. Import sections, API route registration, CORS and origin validation, media task handling, MCP config, agent streaming, import/export behavior, and runtime startup logic are all edited in the same file.

Several conflicts occur around origin validation and CORS behavior. PRs #761, #641, and #432 all modify nearby `isLocalSameOrigin` and allowed-origin logic. Other conflicts occur around agent event streaming, where one side updates usage or stop-reason handling while current `main` has added activity tracking.

The dominant cause is that unrelated daemon features share one high-traffic implementation surface.

Example context:

This conflict comes from PR #884. Current `main` has an expanded MCP config import block in `server.ts`, while the PR adds media task persistence imports in the same import area. The conflict is easy to misunderstand as a media-only change, but the surrounding context shows it is an import-section collision in a large server entrypoint.

Current `main` side:

```ts
  MCP_TEMPLATES,
  buildAcpMcpServers,
  buildClaudeMcpJson,
  isManagedProjectCwd,
  readMcpConfig,
  writeMcpConfig,
} from './mcp-config.js';
import {
  createJsonEventStream,
  writeJsonEvent,
} from './json-event-stream.js';
```

PR side:

```ts
import {
  deleteMediaTask,
  getMediaTask,
  insertMediaTask,
  listMediaTasksByProject,
  listRecentMediaTasks,
  reconcileMediaTasksOnBoot,
  updateMediaTask,
} from './media-tasks.js';
import { requireProject } from './projects.js';
```

### 2. README content conflicts

Primary file: `README.md`

Observed PRs include #939, #815, #762, #719, #653, #635, and #355.

Conflicts cluster around the top product description, coding-agent count, provider count, feature list, skills references, installation sections, and language navigation. Several PRs update numbers such as `15` versus `16` coding-agent CLIs or adjust provider/BYOK wording.

Large README restructuring also causes broad overlap. PR #762 rewrites the README into a showcase-first structure, while other PRs add targeted feature, skill, import, Nix, or fix-log content into sections that have moved or changed.

The dominant cause is that README serves as a shared product, onboarding, feature, and integration index.

Example context:

This conflict comes from PR #939. Current `main` has newer README counts for supported coding-agent adapters, while the PR was based on an older README state and edits the same comparison table. The conflict reflects product metadata drift in a shared documentation table.

```md
<<<<<<< HEAD
| Provider flexibility | Anthropic only | 7+ via [`pi-ai`][piai] | **16 CLI adapters + OpenAI-compatible BYOK proxy** |
=======
| Provider flexibility | Anthropic only | 7+ via [`pi-ai`][piai] | **10 CLI adapters + OpenAI-compatible BYOK proxy** |
>>>>>>> refs/pr/939
```

Related nearby README context:

```md
| Category | Claude Design | Manus | Open Design |
| --- | --- | --- | --- |
| Local-first workflow | Browser-hosted | Cloud agent | **Local daemon + web app** |
| Provider flexibility | Anthropic only | 7+ via [`pi-ai`][piai] | **16 CLI adapters + OpenAI-compatible BYOK proxy** |
| Extensibility | Closed system prompt | Closed workflows | **Skills + design systems + BYOK APIs** |
```

### 3. Linear i18n registry and fallback list conflicts

Primary files:

- `apps/web/src/i18n/content.ts`
- `apps/web/src/i18n/content.fr.ts`
- `apps/web/src/i18n/content.ru.ts`

Observed PRs include #939, #816, #815, #702, #653, #635, #613, and #568.

Conflicts repeatedly occur in arrays of skill IDs, prompt-template IDs, and design-system IDs. Multiple PRs insert entries around the same nearby list items, including `dcf-valuation`, `flowai-live-dashboard-template`, `clinic-console-dashboard`, `alipay-*`, `remotion`, `social-media-dashboard`, and `totality-festival`.

French and Russian content files mirror the same fallback-list structure, so one feature often creates conflicts in all three files. Template-heavy PRs produce multiple nearby insertions in the same arrays.

The dominant cause is a linear registry shape where many independent feature PRs append or insert IDs into the same ordered lists.

Example context:

This conflict comes from PR #816. Current `main` and the PR both insert skill IDs into the same fallback registry array. The surrounding list is a sorted or semi-sorted linear registry of IDs, so independent skill additions land on adjacent lines.

```ts
<<<<<<< HEAD
  'dcf-valuation',
=======
  'clinic-console-dashboard',
>>>>>>> refs/pr/816
```

Related context from the same pattern:

```ts
const DE_SKILL_IDS_WITH_EN_FALLBACK = [
  'dcf-valuation',
  'flowai-live-dashboard-template',
  'html-ppt-taste-brutalist',
  'html-ppt-taste-editorial',
  'notion-team-dashboard-live-artifact',
] as const;
```

Another PR side in the same region:

```ts
const DE_SKILL_IDS_WITH_EN_FALLBACK = [
  'clinic-console-dashboard',
  'dcf-valuation',
  'flowai-live-dashboard-template',
] as const;
```

### 4. Agent registry and executable handling conflicts

Primary files:

- `apps/daemon/src/agents.ts`
- `apps/daemon/tests/agents.test.ts`

Observed PRs include #942, #815, #754, #639, #469, and #378 for source conflicts; #942, #815, #754, and #378 for test conflicts.

Conflicts occur around agent definitions, model lists, executable override logic, environment construction, MCP server configuration, and tests for those behaviors. PR #754 changes Codex executable override handling while current `main` contains a broader multi-adapter override map. PR #639 changes sensitive environment filtering, while other PRs change agent environment injection and spawning behavior.

Test conflicts mirror the source conflicts. The test file has shared setup for environment variables and shared assertions for live-artifacts MCP server shapes, local agent profiles, and executable resolution.

The dominant cause is that agent capability registration, executable resolution, environment handling, and their tests are concentrated in a small number of files.

Example context:

This conflict comes from PR #754. Current `main` supports executable overrides for many agent adapters, while the PR adds a narrower Codex-only map. The surrounding source is the central agent executable-resolution path, so registry expansion and behavior changes collide.

```ts
<<<<<<< HEAD
const AGENT_BIN_ENV_KEYS = new Map([
  ['claude', 'CLAUDE_BIN'],
  ['codex', 'CODEX_BIN'],
  ['copilot', 'COPILOT_BIN'],
  ['cursor-agent', 'CURSOR_AGENT_BIN'],
  ['deepseek', 'DEEPSEEK_BIN'],
]);
=======
const AGENT_BIN_ENV_KEYS = new Map([['codex', 'CODEX_BIN']]);
>>>>>>> refs/pr/754
```

Related downstream context:

```ts
function configuredExecutableOverride(def, configuredEnv = {}) {
  const envKey = AGENT_BIN_ENV_KEYS.get(def?.id);
  if (!envKey) return null;

  const raw = configuredEnv?.[envKey] ?? process.env[envKey];
  if (!raw) return null;

  const expanded = expandHome(raw.trim());
  if (!path.isAbsolute(expanded)) return null;
  return statSync(expanded).isFile() ? expanded : null;
}
```

Representative PR-side behavior in the same area:

```ts
function configuredExecutableOverride(def, configuredEnv = {}) {
  if (def?.id !== 'codex') return null;
  const raw = configuredEnv?.CODEX_BIN ?? process.env.CODEX_BIN;
  if (!raw) return null;
  const expanded = expandHome(raw.trim());
  return existsSync(expanded) ? expanded : null;
}
```

### 5. Web application root state conflicts

Primary file: `apps/web/src/App.tsx`

Observed PRs include #925, #815, #800, #689, #687, and #568.

Conflicts occur around top-level app state, config persistence, daemon synchronization, onboarding behavior, media provider loading, Composio config changes, and Launchpad IA toggles. Several PRs modify the same initialization and config-save flow.

PR #925 adds a demo IA mode at the top-level app shell while current `main` has config synchronization helpers in the same area. PRs #689 and #687 both affect settings persistence and daemon media-provider synchronization. PR #800 changes privacy or onboarding consent behavior near existing configuration-loading logic.

The dominant cause is that broad app lifecycle and settings behavior is centralized in the root React component.

Example context:

This conflict comes from PR #925. Current `main` has top-level config persistence helpers near the start of `App.tsx`, while the PR adds a Launchpad demo IA mode in the same top-level module area. The collision is caused by app-shell state and helper functions sharing one file-level namespace.

```tsx
<<<<<<< HEAD
export async function persistComposioConfigChange(
  current: AppConfig,
  composio: AppConfig['composio'],
  sync: (config: AppConfig['composio']) => Promise<boolean> = syncComposioConfig,
) {
=======
// Demo IA toggle — `?ia=legacy` falls back to the original EntryView so
// reviewers can A/B compare on the same build. Default is the new
// Launchpad layout.
>>>>>>> refs/pr/925
```

Related current `main` context:

```tsx
export async function persistComposioConfigChange(
  current: AppConfig,
  composio: AppConfig['composio'],
  sync: (config: AppConfig['composio']) => Promise<boolean> = syncComposioConfig,
): Promise<AppConfig> {
  const next = { ...current, composio };
  const ok = await sync(composio);
  if (!ok) throw new Error('Failed to persist Composio config');
  return next;
}
```

Representative PR-side context:

```tsx
type IaMode = 'launchpad' | 'legacy';

function readIaMode(): IaMode {
  const params = new URLSearchParams(window.location.search);
  return params.get('ia') === 'legacy' ? 'legacy' : 'launchpad';
}

const [iaMode, setIaMode] = useState<IaMode>(() => readIaMode());
```

### 6. Global CSS accumulation conflicts

Primary file: `apps/web/src/index.css`

Observed PRs include #925, #831, #815, #800, #516, and #469.

Conflicts appear in large adjacent style blocks for Launchpad, MCP settings, privacy panel layout, comment popovers, prompt-template picker, Persian/RTL typography, FileViewer, and visual editing UI.

Many PRs append large `/* ===== */` section blocks near the same part of the file. Git treats adjacent appended sections as overlapping hunks, even when the UI features are conceptually separate.

The dominant cause is that unrelated component styling is accumulated in one global stylesheet.

Example context:

This conflict comes from PR #925. Current `main` has a large Settings/MCP CSS section near the end of `index.css`, while the PR appends a large Launchpad demo shell section in the same area. The two changes describe separate UI surfaces, but both are large global CSS blocks appended near each other.

```css
<<<<<<< HEAD
/* ============================================================
   External MCP servers — Settings panel
   ------------------------------------------------------------
   Compact card-per-server layout.
=======
/* ============================================================
   Launchpad — demo IA shell. Center prompt + surface tiles +
   timeline. No sidebar, no top tabs, no foot pills, no PetRail.
>>>>>>> refs/pr/925
```

Representative current `main` side:

```css
/* ============================================================
   External MCP servers — Settings panel
   ------------------------------------------------------------
   Compact card-per-server layout. Inputs stack vertically inside
   each card, with per-server connection state and action rows.
   ============================================================ */

.external-mcp-server-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-panel);
}
```

Representative PR side:

```css
/* ============================================================
   Launchpad — demo IA shell. Center prompt + surface tiles +
   timeline. No sidebar, no top tabs, no foot pills, no PetRail.
   ============================================================ */

.launchpad-shell {
  min-height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
}
```

### 7. Package manifest and exports map conflicts

Primary file: `packages/contracts/package.json`

Observed PRs include #937, #815, #583, and #582.

Conflicts occur in the `exports` map, package version, files list, and build/prepack scripts. Several PRs add API exports such as `./api/finalize`, `./api/orbit`, and `./api/connectionTest` around the same JSON object area.

Other conflicts come from the package transition between source exports and generated `dist` exports. JSON ordering makes adjacent export additions especially prone to direct merge conflicts.

The dominant cause is that package exports are represented as a single ordered JSON object edited by multiple API and packaging PRs.

Example context:

This conflict comes from PR #937. Current `main` already has newer contract package exports, while the PR adds an Orbit API export around the same object location. The conflict occurs inside the package manifest's ordered `exports` map.

```json
<<<<<<< HEAD
    "./api/finalize": {
      "types": "./dist/api/finalize.d.ts",
      "default": "./dist/api/finalize.mjs"
    }
=======
    "./api/orbit": {
      "types": "./dist/api/orbit.d.ts",
      "default": "./dist/api/orbit.mjs"
    }
>>>>>>> refs/pr/937
```

Related current `main` context:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.mjs"
  },
  "./api/connectionTest": {
    "types": "./dist/api/connectionTest.d.ts",
    "default": "./dist/api/connectionTest.mjs"
  },
  "./api/finalize": {
    "types": "./dist/api/finalize.d.ts",
    "default": "./dist/api/finalize.mjs"
  }
}
```

Representative PR-side addition:

```json
"./api/orbit": {
  "types": "./dist/api/orbit.d.ts",
  "default": "./dist/api/orbit.mjs"
}
```

## Summary of Causes

The highest-frequency conflicts come from centralized files that act as shared registries, shared app roots, shared route files, shared documentation indexes, or shared global style surfaces. The conflict pattern is dominated by repeated adjacent insertions into ordered lists, large app-level files that combine many responsibilities, and JSON or Markdown files where unrelated feature changes land in the same small regions.
