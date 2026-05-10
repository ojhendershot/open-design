# Linux Client Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Linux packaged client from "present but optional and under-proven" to a scoped, continuously validated Linux lane with headless lifecycle parity, desktop inspection parity, CI smoke coverage, and accurate docs.

**Architecture:** Keep Linux work inside the existing packaged-runtime boundaries: `tools/pack` owns local build/install/start/stop/logs/uninstall/cleanup/inspect orchestration, `apps/packaged` owns packaged sidecar startup, and `e2e/specs` owns high-ROI smoke tests. Start with a headless Linux PR smoke lane because it is display-independent and fast, then add AppImage runtime smoke in release jobs where artifact correctness matters.

**Tech Stack:** TypeScript, Vitest, GitHub Actions, Electron AppImage, `@open-design/sidecar-proto`, `@open-design/sidecar`, `@open-design/platform`, `tools-pack`, `apps/packaged`, `e2e`.

---

## Issue Ownership

- Issue: https://github.com/nexu-io/open-design/issues/709
- Owner branch: `codex/linux-client-issue-709`
- Ownership note: As of 2026-05-10, this local branch owns the issue 709 Linux client parity audit and implementation plan. Keep `main` in parity with `origin/main`; continue all documentation and implementation work from this branch unless the user directs otherwise.

---

## Audited Scope

### Current Verified State

- Checkout: branch `codex/linux-client-issue-709`, based on `main`/`origin/main` at `32fa0c23`.
- Root package manager contract: `package.json` pins `pnpm@10.33.2`.
- Dependencies are installed locally with `corepack pnpm install --frozen-lockfile`. Local bare `pnpm` was still absent from `PATH` during manual packaged smoke, so the local headless smoke used a temporary Corepack-backed `pnpm` shim for child processes.
- `tools-pack linux` now has build/install/start/stop/logs/uninstall/cleanup/inspect. `--headless` now routes install/start/stop/uninstall/cleanup to the no-Electron entry, and `inspect --headless` is status-only.
- `e2e/specs/linux.spec.ts` covers Linux headless packaged smoke for PR CI and Linux AppImage runtime smoke for release jobs.
- CI packaged smoke jobs now include Linux headless smoke on Ubuntu when packaged changes require smoke.
- Beta/stable Linux release jobs run AppImage smoke behind their existing Linux gates and preserve Linux e2e report artifacts for release publication.
- Beta Linux release build remains optional and defaults off; stable Linux release build remains gated by `vars.ENABLE_STABLE_LINUX == 'true'`.

### In Scope

- Add Linux headless lifecycle parity for `uninstall --headless` and `cleanup --headless`.
- Add Linux `inspect` support that mirrors mac/win status/eval/screenshot behavior for AppImage desktop mode and gives safe, explicit behavior for headless mode.
- Add `e2e/specs/linux.spec.ts` with a headless smoke path suitable for PR CI.
- Add Linux PR smoke job gated by packaging-related changes.
- Add release-job AppImage smoke checks behind the existing Linux release gates.
- Refresh docs to distinguish Linux headless, Linux AppImage beta/release status, and known AppImage caveats.

### Out Of Scope

- New package formats: `.deb`, `.rpm`, Snap, Flatpak.
- AppImage signing or auto-update feed.
- Nix/Home Manager/NixOS service changes unless later implementation discovers a direct regression in the packaged Linux lane.
- Product UI changes outside what is needed to inspect the existing packaged desktop shell.

---

## File Structure

### Modify

- `tools/pack/src/linux.ts`
  - Add Linux lifecycle mode helper.
  - Add headless uninstall result and implementation.
  - Make cleanup choose AppImage or headless stop path.
  - Add Linux inspect result and implementation.
- `tools/pack/src/index.ts`
  - Wire `linux inspect`.
  - Route `linux uninstall --headless` to the headless uninstall implementation.
  - Route `linux cleanup --headless` to headless-aware cleanup.
- `tools/pack/tests/linux.test.ts`
  - Add pure tests for lifecycle-mode routing and headless cleanup/uninstall selection helpers.
  - Add pure tests for inspect option validation.
- `e2e/specs/linux.spec.ts`
  - Add Linux headless packaged smoke.
  - Add AppImage packaged smoke gated by an env var for release jobs.
- `.github/workflows/ci.yml`
  - Include Linux spec/workflow changes in packaged smoke detection.
  - Add a Linux headless smoke job on Ubuntu for packaging changes.
- `.github/workflows/release-beta.yml`
  - When `enable_linux` is true, run AppImage smoke before asset preparation.
- `.github/workflows/release-stable.yml`
  - When `ENABLE_STABLE_LINUX` enables the job, run AppImage smoke before asset preparation.
- `tools/pack/README.md`
  - Document `linux inspect`.
  - Document headless uninstall/cleanup parity.
  - Update CI/release status after the new lane exists.
- `README.md`
  - Keep public support claims conservative unless Linux stable publication is actually enabled.

### Create

- No new runtime package is needed.
- Create only `e2e/specs/linux.spec.ts` for tests.

---

## Task 1: Headless Lifecycle Parity

**Files:**
- Modify: `tools/pack/src/linux.ts`
- Modify: `tools/pack/src/index.ts`
- Test: `tools/pack/tests/linux.test.ts`

- [x] **Step 1: Add failing tests for Linux lifecycle mode routing**

Add this import to `tools/pack/tests/linux.test.ts`:

```ts
import {
  buildDockerArgs,
  matchesAppImageProcess,
  renderDesktopTemplate,
  resolveLinuxLifecycleMode,
  shouldRejectLinuxHeadlessInspectOptions,
  sanitizeNamespace,
} from "../src/linux.js";
```

Add this test block near the existing `sanitizeNamespace` tests:

```ts
describe("resolveLinuxLifecycleMode", () => {
  it("uses headless mode for every lifecycle action when --headless is set", () => {
    expect(resolveLinuxLifecycleMode({ headless: true }, "install")).toBe("headless");
    expect(resolveLinuxLifecycleMode({ headless: true }, "start")).toBe("headless");
    expect(resolveLinuxLifecycleMode({ headless: true }, "stop")).toBe("headless");
    expect(resolveLinuxLifecycleMode({ headless: true }, "uninstall")).toBe("headless");
    expect(resolveLinuxLifecycleMode({ headless: true }, "cleanup")).toBe("headless");
  });

  it("uses appimage mode when --headless is omitted", () => {
    expect(resolveLinuxLifecycleMode({}, "install")).toBe("appimage");
    expect(resolveLinuxLifecycleMode({}, "start")).toBe("appimage");
    expect(resolveLinuxLifecycleMode({}, "stop")).toBe("appimage");
    expect(resolveLinuxLifecycleMode({}, "uninstall")).toBe("appimage");
    expect(resolveLinuxLifecycleMode({}, "cleanup")).toBe("appimage");
  });
});
```

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```bash
corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts
```

Expected before implementation:

```text
FAIL tools/pack/tests/linux.test.ts
Error: Module "../src/linux.js" has no exported member "resolveLinuxLifecycleMode"
```

- [x] **Step 3: Add lifecycle mode helper and headless uninstall**

In `tools/pack/src/linux.ts`, add the helper after `sanitizeNamespace()`:

```ts
export type LinuxLifecycleAction = "cleanup" | "install" | "start" | "stop" | "uninstall";
export type LinuxLifecycleMode = "appimage" | "headless";

export function resolveLinuxLifecycleMode(
  options: { headless?: boolean },
  _action: LinuxLifecycleAction,
): LinuxLifecycleMode {
  return options.headless === true ? "headless" : "appimage";
}
```

In `tools/pack/src/linux.ts`, add this result type and function after `uninstallPackedLinuxApp()`:

```ts
export type LinuxHeadlessUninstallResult = {
  launcherPath: string;
  namespace: string;
  removed: "ok" | "already-removed" | "skipped-process-running";
  stop: LinuxStopResult;
};

export async function uninstallPackedLinuxHeadless(
  config: ToolPackConfig,
): Promise<LinuxHeadlessUninstallResult> {
  const stop = await stopPackedLinuxHeadless(config);
  const launcherPath = headlessLauncherPath(config);

  if (!isSafeToRemoveInstallFiles(stop)) {
    return {
      launcherPath,
      namespace: config.namespace,
      removed: "skipped-process-running",
      stop,
    };
  }

  return {
    launcherPath,
    namespace: config.namespace,
    removed: await tryRemove(launcherPath),
    stop,
  };
}
```

- [x] **Step 4: Make cleanup headless-aware**

Change `cleanupPackedLinuxNamespace` in `tools/pack/src/linux.ts` to accept an options argument and choose the right stop function:

```ts
export async function cleanupPackedLinuxNamespace(
  config: ToolPackConfig,
  options: { headless?: boolean } = {},
): Promise<LinuxCleanupResult> {
  const stop =
    resolveLinuxLifecycleMode(options, "cleanup") === "headless"
      ? await stopPackedLinuxHeadless(config)
      : await stopPackedLinuxApp(config);
  const outputRoot = config.roots.output.namespaceRoot;
  const runtimeNamespaceRoot = config.roots.runtime.namespaceRoot;

  if (!isSafeToRemoveInstallFiles(stop)) {
    return {
      namespace: config.namespace,
      outputRoot,
      removedOutputRoot: false,
      removedRuntimeNamespaceRoot: false,
      runtimeNamespaceRoot,
      skipped: true,
      stop,
    };
  }

  const hadOutput = await pathExists(outputRoot);
  if (hadOutput) await rm(outputRoot, { force: true, recursive: true });

  const hadRuntime = await pathExists(runtimeNamespaceRoot);
  if (hadRuntime) await rm(runtimeNamespaceRoot, { force: true, recursive: true });

  return {
    namespace: config.namespace,
    outputRoot,
    removedOutputRoot: hadOutput,
    removedRuntimeNamespaceRoot: hadRuntime,
    runtimeNamespaceRoot,
    skipped: false,
    stop,
  };
}
```

- [x] **Step 5: Route headless uninstall and cleanup in the CLI**

In `tools/pack/src/index.ts`, add `uninstallPackedLinuxHeadless` to the Linux import list:

```ts
  uninstallPackedLinuxApp,
  uninstallPackedLinuxHeadless,
} from "./linux.js";
```

Change the Linux `uninstall` and `cleanup` cases:

```ts
      case "uninstall":
        printJson(await (options.headless ? uninstallPackedLinuxHeadless(config) : uninstallPackedLinuxApp(config)));
        return;
      case "cleanup":
        printJson(await cleanupPackedLinuxNamespace(config, { headless: options.headless === true }));
        return;
```

- [x] **Step 6: Run focused tests**

Run:

```bash
corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts
```

Expected after implementation:

```text
PASS tools/pack/tests/linux.test.ts
```

- [x] **Step 7: Commit**

```bash
git add tools/pack/src/linux.ts tools/pack/src/index.ts tools/pack/tests/linux.test.ts
git commit -m "fix: complete linux headless lifecycle routing"
```

---

## Task 2: Linux Inspect Command

**Files:**
- Modify: `tools/pack/src/linux.ts`
- Modify: `tools/pack/src/index.ts`
- Test: `tools/pack/tests/linux.test.ts`

- [x] **Step 1: Add failing inspect option tests**

Add this test block to `tools/pack/tests/linux.test.ts`:

```ts
describe("shouldRejectLinuxHeadlessInspectOptions", () => {
  it("allows status-only headless inspect", () => {
    expect(shouldRejectLinuxHeadlessInspectOptions({})).toBe(false);
  });

  it("rejects headless eval and screenshot requests", () => {
    expect(shouldRejectLinuxHeadlessInspectOptions({ expr: "document.title" })).toBe(true);
    expect(shouldRejectLinuxHeadlessInspectOptions({ path: "/tmp/open-design-linux.png" })).toBe(true);
    expect(
      shouldRejectLinuxHeadlessInspectOptions({
        expr: "document.title",
        path: "/tmp/open-design-linux.png",
      }),
    ).toBe(true);
  });
});
```

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```bash
corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts
```

Expected before implementation:

```text
FAIL tools/pack/tests/linux.test.ts
Error: Module "../src/linux.js" has no exported member "shouldRejectLinuxHeadlessInspectOptions"
```

- [x] **Step 3: Add Linux inspect types and option helper**

In `tools/pack/src/linux.ts`, extend the sidecar-proto import:

```ts
  type DesktopEvalResult,
  type DesktopScreenshotResult,
  type DesktopStatusSnapshot,
```

Add these exports near `LinuxStartResult`:

```ts
export type LinuxInspectResult = {
  eval?: DesktopEvalResult;
  screenshot?: DesktopScreenshotResult;
  status: DesktopStatusSnapshot | null;
};

export function shouldRejectLinuxHeadlessInspectOptions(options: {
  expr?: string;
  path?: string;
}): boolean {
  return options.expr != null || options.path != null;
}
```

- [x] **Step 4: Implement AppImage and headless inspect**

Add this function after `readPackedLinuxLogs()` in `tools/pack/src/linux.ts`:

```ts
export async function inspectPackedLinuxApp(
  config: ToolPackConfig,
  options: { expr?: string; headless?: boolean; path?: string },
): Promise<LinuxInspectResult> {
  const stamp = linuxDesktopStamp(config);
  const status = await requestJsonIpc<DesktopStatusSnapshot>(
    stamp.ipc,
    { type: SIDECAR_MESSAGES.STATUS },
    { timeoutMs: 2000 },
  ).catch(() => null);

  if (options.headless === true) {
    if (shouldRejectLinuxHeadlessInspectOptions(options)) {
      throw new Error("linux inspect --headless supports status only; omit --expr and --path");
    }
    return { status };
  }

  return {
    ...(options.expr == null
      ? {}
      : {
          eval: await requestJsonIpc<DesktopEvalResult>(
            stamp.ipc,
            { input: { expression: options.expr }, type: SIDECAR_MESSAGES.EVAL },
            { timeoutMs: 5000 },
          ),
        }),
    ...(options.path == null
      ? {}
      : {
          screenshot: await requestJsonIpc<DesktopScreenshotResult>(
            stamp.ipc,
            { input: { path: options.path }, type: SIDECAR_MESSAGES.SCREENSHOT },
            { timeoutMs: 10000 },
          ),
        }),
    status,
  };
}
```

- [x] **Step 5: Wire `linux inspect` in the CLI**

In `tools/pack/src/index.ts`, add `inspectPackedLinuxApp` to the Linux import list.

Change the Linux command description:

```ts
cli.command("linux <action>", "Linux packaging commands: build|install|start|stop|logs|uninstall|cleanup|inspect")
```

Add this switch case:

```ts
      case "inspect":
        printJson(await inspectPackedLinuxApp(config, {
          expr: options.expr,
          headless: options.headless === true,
          path: options.path,
        }));
        return;
```

- [x] **Step 6: Run focused tests**

Run:

```bash
corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts
corepack pnpm --filter @open-design/tools-pack typecheck
```

Expected:

```text
PASS tools/pack/tests/linux.test.ts
```

Typecheck should complete without TypeScript errors.

- [x] **Step 7: Commit**

```bash
git add tools/pack/src/linux.ts tools/pack/src/index.ts tools/pack/tests/linux.test.ts
git commit -m "feat: add linux packaged inspect command"
```

---

## Task 3: Linux Headless E2E Smoke

**Files:**
- Create: `e2e/specs/linux.spec.ts`
- Test: `e2e/specs/linux.spec.ts`

- [x] **Step 1: Write the failing Linux headless spec**

Create `e2e/specs/linux.spec.ts` with this structure:

```ts
// @vitest-environment node

import { execFile } from "node:child_process";
import { access, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const e2eRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workspaceRoot = dirname(e2eRoot);
const toolsPackDir = resolveFromWorkspace(process.env.OD_PACKAGED_E2E_TOOLS_PACK_DIR ?? ".tmp/tools-pack");
const namespace = process.env.OD_PACKAGED_E2E_NAMESPACE ?? "ci-pr-linux";
const shouldRunLinuxHeadlessSmoke =
  process.platform === "linux" && process.env.OD_PACKAGED_E2E_LINUX_HEADLESS === "1";
const linuxHeadlessDescribe = shouldRunLinuxHeadlessSmoke ? describe : describe.skip;

const outputNamespaceRoot = join(toolsPackDir, "out", "linux", "namespaces", namespace);
const runtimeNamespaceRoot = join(toolsPackDir, "runtime", "linux", "namespaces", namespace);

type LinuxHeadlessInstallResult = {
  launcherPath: string;
  namespace: string;
};

type LinuxHeadlessStartResult = {
  launcherPath: string;
  logPath: string;
  namespace: string;
  pid: number;
  status: {
    namespace: string;
    pid: number;
    url: string;
    startedAt: string;
    version: 1;
  };
};

type LinuxInspectResult = {
  status: {
    pid?: number;
    state?: string;
    url?: string | null;
  } | null;
};

type LinuxStopResult = {
  namespace: string;
  remainingPids: number[];
  status: string;
};

type LinuxHeadlessUninstallResult = {
  launcherPath: string;
  namespace: string;
  removed: string;
  stop: LinuxStopResult;
};

type LogsResult = {
  logs: Record<string, { lines: string[]; logPath: string }>;
  namespace: string;
};

linuxHeadlessDescribe("packaged linux headless runtime smoke", () => {
  let started = false;

  test("installs, starts, inspects status, logs, stops, uninstalls, and cleans up headless runtime", async () => {
    let passed = false;
    try {
      const install = await runToolsPackJson<LinuxHeadlessInstallResult>("install", ["--headless"]);
      expect(install.namespace).toBe(namespace);
      expectPathInside(install.launcherPath, join(process.env.HOME ?? "", ".local", "bin"));

      const start = await runToolsPackJson<LinuxHeadlessStartResult>("start", ["--headless"]);
      started = true;
      expect(start.namespace).toBe(namespace);
      expect(start.pid).toBeGreaterThan(0);
      expect(start.status.namespace).toBe(namespace);
      expect(start.status.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//);
      expectPathInside(start.logPath, join(runtimeNamespaceRoot, "logs", "desktop"));

      const inspect = await runToolsPackJson<LinuxInspectResult>("inspect", ["--headless"]);
      expect(inspect.status?.state).toBe("running");
      expect(inspect.status?.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//);

      const logs = await runToolsPackJson<LogsResult>("logs");
      expect(logs.namespace).toBe(namespace);
      expectPathInside(logs.logs.desktop.logPath, join(runtimeNamespaceRoot, "logs", "desktop"));
      expect(logs.logs.desktop.lines.join("\n")).toContain("Open Design is running");

      const stop = await runToolsPackJson<LinuxStopResult>("stop", ["--headless"]);
      started = false;
      expect(stop.namespace).toBe(namespace);
      expect(stop.status).not.toBe("partial");
      expect(stop.remainingPids).toEqual([]);

      const uninstall = await runToolsPackJson<LinuxHeadlessUninstallResult>("uninstall", ["--headless"]);
      expect(uninstall.namespace).toBe(namespace);
      expect(uninstall.removed).toMatch(/^(ok|already-removed)$/);
      expect(await pathExists(install.launcherPath)).toBe(false);

      const cleanup = await runToolsPackJson<{ skipped: boolean }>("cleanup", ["--headless"]);
      expect(cleanup.skipped).toBe(false);
      passed = true;
    } finally {
      if (!passed) {
        await runToolsPackJson<LogsResult>("logs").catch(() => null);
      }
      if (started) {
        await runToolsPackJson<LinuxStopResult>("stop", ["--headless"]).catch(() => null);
      }
    }
  }, 180_000);
});

async function runToolsPackJson<T>(action: string, extraArgs: string[] = []): Promise<T> {
  const { stdout } = await execFileAsync(
    process.env.OD_E2E_PNPM_COMMAND ?? "pnpm",
    [
      "exec",
      "tools-pack",
      "linux",
      action,
      "--dir",
      toolsPackDir,
      "--namespace",
      namespace,
      "--json",
      ...extraArgs,
    ],
    {
      cwd: workspaceRoot,
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  return JSON.parse(stdout) as T;
}

function resolveFromWorkspace(path: string): string {
  return isAbsolute(path) ? path : resolve(workspaceRoot, path);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function expectPathInside(actualPath: string, expectedParent: string): void {
  const relative = resolve(actualPath).startsWith(resolve(expectedParent) + sep);
  expect(relative, `${actualPath} should be inside ${expectedParent}`).toBe(true);
}

async function fileSizeBytes(path: string): Promise<number> {
  return (await stat(path)).size;
}
```

- [x] **Step 2: Run the spec and verify it fails before the new build exists**

Run:

```bash
OD_PACKAGED_E2E_LINUX_HEADLESS=1 \
OD_PACKAGED_E2E_NAMESPACE=ci-pr-linux \
OD_PACKAGED_E2E_TOOLS_PACK_DIR=.tmp/tools-pack \
corepack pnpm -C e2e test specs/linux.spec.ts
```

Expected before build:

```text
headless entry not found ... run `tools-pack linux build` first
```

- [x] **Step 3: Build the Linux headless fixture and rerun**

Run:

```bash
corepack pnpm exec tools-pack linux build --to dir --namespace ci-pr-linux --json
OD_PACKAGED_E2E_LINUX_HEADLESS=1 \
OD_PACKAGED_E2E_NAMESPACE=ci-pr-linux \
OD_PACKAGED_E2E_TOOLS_PACK_DIR=.tmp/tools-pack \
corepack pnpm -C e2e test specs/linux.spec.ts
```

Expected:

```text
PASS specs/linux.spec.ts
```

- [x] **Step 4: Typecheck e2e**

Run:

```bash
corepack pnpm --filter @open-design/e2e typecheck
```

Expected: no TypeScript errors.

- [x] **Step 5: Commit**

```bash
git add e2e/specs/linux.spec.ts
git commit -m "test: add linux headless packaged smoke"
```

---

## Task 4: Linux PR Smoke Workflow

**Files:**
- Modify: `.github/workflows/ci.yml`
- Test: `e2e/tests/packaged-smoke-workflow.test.ts`

- [x] **Step 1: Add failing workflow guard test**

Extend `e2e/tests/packaged-smoke-workflow.test.ts`:

```ts
it("runs a linux headless packaged smoke job when packaged changes require smoke", async () => {
  const workflow = await readFile(ciWorkflowPath, "utf8");
  expect(workflow).toContain("packaged_smoke_linux_headless:");
  expect(workflow).toContain("Build PR linux headless artifacts");
  expect(workflow).toContain("OD_PACKAGED_E2E_LINUX_HEADLESS: \"1\"");
  expect(workflow).toContain("pnpm test specs/linux.spec.ts");
});
```

- [x] **Step 2: Run the guard test and verify it fails**

Run:

```bash
corepack pnpm --filter @open-design/e2e test -- tests/packaged-smoke-workflow.test.ts
```

Expected before workflow change:

```text
FAIL e2e/tests/packaged-smoke-workflow.test.ts
expected workflow to contain packaged_smoke_linux_headless
```

- [x] **Step 3: Update packaged smoke detection**

In `.github/workflows/ci.yml`, update the single-file condition near the mac/win spec check to include Linux:

```bash
if [[ "$file" == "e2e/specs/mac.spec.ts" || "$file" == "e2e/specs/win.spec.ts" || "$file" == "e2e/specs/linux.spec.ts" || "$file" == "package.json" || "$file" == "pnpm-lock.yaml" || "$file" == "pnpm-workspace.yaml" || "$file" == ".github/workflows/ci.yml" || "$file" == ".github/workflows/release-beta.yml" || "$file" == ".github/workflows/release-stable.yml" ]]; then
  required=true
fi
```

- [x] **Step 4: Add Linux headless smoke job**

Add this job after `packaged_smoke_win`:

```yaml
  packaged_smoke_linux_headless:
    name: Packaged linux headless smoke
    needs: [validate, packaged_changes]
    if: ${{ needs.packaged_changes.outputs.required == 'true' }}
    runs-on: ubuntu-latest
    timeout-minutes: 45

    steps:
      - name: Checkout
        uses: actions/checkout@v6.0.2

      - name: Setup pnpm
        uses: pnpm/action-setup@v5
        with:
          version: 10.33.2

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build PR linux headless artifacts
        run: |
          set -euo pipefail
          pnpm exec tools-pack linux build \
            --dir "$RUNNER_TEMP/tools-pack" \
            --namespace ci-pr-linux \
            --to dir \
            --json

      - name: Smoke PR linux headless packaged runtime
        working-directory: e2e
        env:
          OD_PACKAGED_E2E_LINUX_HEADLESS: "1"
          OD_PACKAGED_E2E_NAMESPACE: ci-pr-linux
          OD_PACKAGED_E2E_TOOLS_PACK_DIR: ${{ runner.temp }}/tools-pack
        run: pnpm test specs/linux.spec.ts
```

- [x] **Step 5: Run workflow guard tests**

Run:

```bash
corepack pnpm --filter @open-design/e2e test -- tests/packaged-smoke-workflow.test.ts
```

Expected:

```text
PASS e2e/tests/packaged-smoke-workflow.test.ts
```

- [x] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml e2e/tests/packaged-smoke-workflow.test.ts
git commit -m "ci: add linux headless packaged smoke"
```

---

## Task 5: Linux AppImage Release Smoke

**Files:**
- Modify: `e2e/specs/linux.spec.ts`
- Modify: `.github/workflows/release-beta.yml`
- Modify: `.github/workflows/release-stable.yml`

- [x] **Step 1: Add AppImage mode to Linux e2e spec**

Extend `e2e/specs/linux.spec.ts` with an AppImage describe block gated by `OD_PACKAGED_E2E_LINUX_APPIMAGE=1`. Use `tools-pack linux install`, `start`, `inspect --expr`, `inspect --path`, `logs`, `stop`, and `uninstall`.

Required assertions:

```ts
const shouldRunLinuxAppImageSmoke =
  process.platform === "linux" && process.env.OD_PACKAGED_E2E_LINUX_APPIMAGE === "1";
const linuxAppImageDescribe = shouldRunLinuxAppImageSmoke ? describe : describe.skip;
```

The AppImage test must assert:

```ts
expect(start.source).toBe("installed");
expect(start.status?.state).toBe("running");
expect(inspect.status?.state).toBe("running");
expect(assertHealthEvalValue(inspect.eval?.value).status).toBe(200);
expect(await fileSizeBytes(screenshotPath)).toBeGreaterThan(0);
expect(stop.remainingPids).toEqual([]);
expect(uninstall.removed.appImage).toMatch(/^(ok|already-removed)$/);
```

- [x] **Step 2: Add release beta smoke before Linux asset preparation**

In `.github/workflows/release-beta.yml`, insert after `Build beta linux artifacts` and before `Prepare linux beta assets`:

```yaml
      - name: Smoke beta linux AppImage runtime
        working-directory: e2e
        env:
          OD_PACKAGED_E2E_LINUX_APPIMAGE: "1"
          OD_PACKAGED_E2E_NAMESPACE: release-beta-linux
          OD_PACKAGED_E2E_SCREENSHOT_PATH: ${{ runner.temp }}/release-report/linux/screenshots/open-design-linux-smoke.png
          OD_PACKAGED_E2E_TOOLS_PACK_DIR: ${{ runner.temp }}/tools-pack
        run: |
          set -euo pipefail
          sudo apt-get update
          sudo apt-get install -y xvfb
          report_dir="$RUNNER_TEMP/release-report/linux"
          mkdir -p "$report_dir/screenshots"
          xvfb-run -a pnpm test specs/linux.spec.ts 2>&1 | tee "$report_dir/vitest.log"
```

- [x] **Step 3: Add release stable smoke before Linux asset preparation**

In `.github/workflows/release-stable.yml`, insert the same smoke step after `Build release linux artifacts`, using `release-stable-linux` for the namespace and `open-design-release-linux-e2e-report` for any uploaded artifact name added later.

- [x] **Step 4: Run local e2e typecheck**

Run:

```bash
corepack pnpm --filter @open-design/e2e typecheck
```

Expected: no TypeScript errors.

- [x] **Step 5: Commit**

```bash
git add e2e/specs/linux.spec.ts .github/workflows/release-beta.yml .github/workflows/release-stable.yml
git commit -m "ci: smoke linux AppImage release artifacts"
```

---

## Task 6: Documentation Refresh

**Files:**
- Modify: `tools/pack/README.md`
- Modify: `README.md`

- [x] **Step 1: Update `tools/pack/README.md` Linux command list**

Add these lines to the Linux lifecycle command list:

```markdown
- `tools-pack linux inspect` (desktop status, eval, and screenshot for AppImage mode)
- `tools-pack linux inspect --headless` (status only)
- `tools-pack linux uninstall --headless`
- `tools-pack linux cleanup --headless`
```

- [x] **Step 2: Replace the CI status bullet**

Replace:

```markdown
- Linux entry in `ci.yml` (release lanes only build linux; PR validation does not yet).
```

with:

```markdown
- Full Linux AppImage PR smoke remains release-lane only; PR validation runs the Linux headless packaged smoke because it does not require a display server.
```

- [x] **Step 3: Keep README public release claim conservative**

If Linux stable remains gated after Task 5, keep `README.md` line 68 limited to macOS and Windows downloads. Add a sentence in the desktop section instead:

```markdown
Linux AppImage packaging is available through the optional release lane and is covered by the Linux packaged smoke workflow, but public stable downloads remain gated until the release maintainers enable the Linux stable lane.
```

If release maintainers enable stable Linux in the same PR, update the deployable row to include `Linux (x64 AppImage)` only after the release workflow succeeds with Linux enabled.

- [x] **Step 4: Commit**

```bash
git add tools/pack/README.md README.md
git commit -m "docs: document linux packaged client status"
```

---

## Task 7: Final Verification

**Files:**
- Verify all changed files.

- [x] **Step 1: Install dependencies if needed**

Run:

```bash
corepack pnpm install --frozen-lockfile
```

Expected: dependencies install without lockfile changes.

- [x] **Step 2: Run focused package checks**

Run:

```bash
corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts
corepack pnpm --filter @open-design/tools-pack typecheck
corepack pnpm --filter @open-design/e2e test -- tests/packaged-smoke-workflow.test.ts
corepack pnpm --filter @open-design/e2e typecheck
```

Expected: all pass.

- [x] **Step 3: Run headless smoke locally**

Run:

```bash
corepack pnpm exec tools-pack linux build --to dir --namespace ci-pr-linux --json
OD_PACKAGED_E2E_LINUX_HEADLESS=1 \
OD_PACKAGED_E2E_NAMESPACE=ci-pr-linux \
OD_PACKAGED_E2E_TOOLS_PACK_DIR=.tmp/tools-pack \
corepack pnpm -C e2e test specs/linux.spec.ts
```

Expected: headless smoke passes.

- [x] **Step 4: Run repo-level checks**

Run:

```bash
corepack pnpm guard
corepack pnpm typecheck
```

Expected: both pass.

- [x] **Step 5: Inspect final diff**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected:

```text
git diff --check
# no output
```

- [x] **Step 6: Commit final verification/doc fixups if needed**

Only commit if the verification pass required small fixups:

```bash
git add <changed-files>
git commit -m "chore: finalize linux client parity checks"
```

---

## Regression Risks

- Linux AppImage smoke can be slower or flaky on GitHub Ubuntu runners if Electron cannot acquire a display. Keep the PR job headless first; use `xvfb-run` only in release AppImage smoke.
- `inspect --headless` must not pretend eval/screenshot work without Electron. It should return status only and throw clear errors when `--expr` or `--path` are present.
- `cleanup --headless` must remove output/runtime roots only after `stopPackedLinuxHeadless()` reports `stopped` or `not-running`.
- Do not introduce port-derived data/log/runtime paths; namespace remains the only path identity boundary.
- Do not widen headless daemon auth unless headless gains a privileged local file-open surface.

## Security Notes

- `apps/packaged/src/headless.ts` intentionally starts daemon + web with `requireDesktopAuth: false` because there is no Electron `shell.openPath` surface. This remains acceptable only while headless has no privileged desktop file-opening capability.
- The Linux plan should fix mac-biased recovery guidance separately if implementation touches `apps/packaged/src/launch.ts`; otherwise leave it as a tracked follow-up.
- AppImage direct launch still depends on extract-and-run for reliable daemon boot. Keep the `.desktop` Exec line and `tools-pack linux start` behavior using `--appimage-extract-and-run`.

## Self-Review

- Spec coverage: The plan covers lifecycle parity, inspect parity, e2e coverage, CI, release smoke, docs, and final validation.
- Placeholder scan: No unresolved placeholder markers are present.
- Type consistency: The plan uses `LinuxLifecycleMode`, `LinuxInspectResult`, `LinuxHeadlessUninstallResult`, and existing `LinuxStopResult` consistently across tasks.

## Execution Status

Implementation completed on branch `codex/linux-client-issue-709` for issue 709. The branch adds Linux headless lifecycle parity, Linux inspect support, Linux packaged e2e smoke coverage, Linux PR headless CI smoke, Linux AppImage release smoke, and conservative documentation.

Post-audit remediation completed in the same branch:

- Linux release AppImage smoke now writes manifest/build/test evidence into `release-report/linux`, uploads it as a workflow artifact, and downloads it in the publish job.
- Workflow guard tests now cover the Linux release e2e report artifact path for beta and stable release workflows.
- Linux release build evidence now validates `linux-tools-pack-build.json` with Node after capture, so non-JSON stdout fails the release build before the evidence is uploaded.
- `linux inspect --headless --expr/--path` now rejects before attempting IPC.
- This plan document was refreshed from pre-work plan state to executed branch state.

Post-audit remediation verification:

- Red checks first failed for the intended gaps:
  - `corepack pnpm --filter @open-design/e2e test -- tests/packaged-smoke-workflow.test.ts`
  - `corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts`
- Green focused checks passed after remediation:
  - `corepack pnpm --filter @open-design/e2e test -- tests/packaged-smoke-workflow.test.ts`
  - `corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts`
  - `corepack pnpm --filter @open-design/tools-pack typecheck`
  - `corepack pnpm --filter @open-design/e2e typecheck`
- Repo checks passed:
  - `corepack pnpm guard` with sandbox escalation for the `tsx` IPC socket under `/tmp`.
  - `ASTRO_TELEMETRY_DISABLED=1 corepack pnpm -r --workspace-concurrency=1 --if-present run typecheck && ASTRO_TELEMETRY_DISABLED=1 corepack pnpm exec tsc -p scripts/tsconfig.json --noEmit` with `/tmp/open-design-pnpm-shim/pnpm` pointing at the Corepack-managed `pnpm@10.33.2` entrypoint.
- Static checks passed:
  - `.github/workflows/release-beta.yml`, `.github/workflows/release-stable.yml`, and `.github/workflows/ci.yml` parsed with the local `yaml@2.8.4` package.
  - `git diff --check` produced no output.

Next agent should verify live branch state before publishing or opening a PR.
