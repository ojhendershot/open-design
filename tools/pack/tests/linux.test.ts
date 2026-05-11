import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";

import { requestJsonIpc } from "@open-design/sidecar";
import { describe, expect, it, vi } from "vitest";

vi.mock("@open-design/sidecar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@open-design/sidecar")>();
  return {
    ...actual,
    requestJsonIpc: vi.fn(async () => {
      throw new Error("requestJsonIpc should not be called for invalid headless inspect options");
    }),
  };
});

import type { ToolPackConfig } from "../src/config.js";
import {
  buildDockerArgs,
  inspectPackedLinuxApp,
  matchesAppImageProcess,
  renderDesktopTemplate,
  resolveLinuxLifecycleMode,
  shouldRejectLinuxHeadlessInspectOptions,
  sanitizeNamespace,
} from "../src/linux.js";

function makeConfig(): ToolPackConfig {
  return {
    containerized: true,
    electronBuilderCliPath: "/x/electron-builder/cli.js",
    electronDistPath: "/x/electron/dist",
    electronVersion: "41.3.0",
    macCompression: "normal",
    namespace: "default",
    platform: "linux",
    portable: false,
    removeData: false,
    removeLogs: false,
    removeProductUserData: false,
    removeSidecars: false,
    roots: {
      output: {
        appBuilderRoot: "/work/.tmp/tools-pack/out/linux/namespaces/default/builder",
        namespaceRoot: "/work/.tmp/tools-pack/out/linux/namespaces/default",
        platformRoot: "/work/.tmp/tools-pack/out/linux",
        root: "/work/.tmp/tools-pack/out",
      },
      runtime: {
        namespaceBaseRoot: "/work/.tmp/tools-pack/runtime/linux/namespaces",
        namespaceRoot: "/work/.tmp/tools-pack/runtime/linux/namespaces/default",
      },
      cacheRoot: "/work/.tmp/tools-pack/cache",
      toolPackRoot: "/work/.tmp/tools-pack",
    },
    silent: true,
    signed: false,
    to: "all",
    webOutputMode: "server",
    workspaceRoot: "/work",
  };
}

describe("buildDockerArgs", () => {
  it("returns the expected docker argv array", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    expect(args[0]).toBe("run");
    expect(args).toContain("--rm");
    expect(args).toContain("--user");
    expect(args).toContain("1000:1000");
    expect(args).toContain("electronuserland/builder:base");
  });

  it("mounts the workspace at /project", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    expect(args).toContain("-v");
    expect(args).toContain("/work:/project");
  });

  it("mounts docker home and electron caches under .tmp/tools-pack/.docker-*", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    expect(args).toContain(`${posix.join("/work/.tmp/tools-pack", ".docker-home")}:/home/builder`);
    expect(args).toContain(`${posix.join("/work/.tmp/tools-pack", ".docker-cache", "electron")}:/home/builder/.cache/electron`);
    expect(args).toContain(
      `${posix.join("/work/.tmp/tools-pack", ".docker-cache", "electron-builder")}:/home/builder/.cache/electron-builder`,
    );
  });

  it("mounts the tool-pack root at /tools-pack so inner build writes to host-visible output dir", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    expect(args).toContain("/work/.tmp/tools-pack:/tools-pack");
  });

  it("sets HOME and ELECTRON_CACHE env vars", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    expect(args).toContain("HOME=/home/builder");
    expect(args).toContain("ELECTRON_CACHE=/home/builder/.cache/electron");
    expect(args).toContain("ELECTRON_BUILDER_CACHE=/home/builder/.cache/electron-builder");
  });

  it("re-invokes pnpm tools-pack linux build inside the container without --containerized", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toMatch(/command -v curl >\/dev\/null/);
    expect(last).toMatch(/case "\$\(uname -m\)" in/);
    expect(last).toMatch(/x86_64\) PNPM_ASSET=pnpm-linuxstatic-x64; PNPM_SHA256=[a-f0-9]{64}/);
    expect(last).toMatch(/aarch64\) PNPM_ASSET=pnpm-linuxstatic-arm64; PNPM_SHA256=[a-f0-9]{64}/);
    expect(last).toMatch(
      /curl --retry 3 --retry-all-errors --connect-timeout 10 --max-time 60 -fsSL "https:\/\/github\.com\/pnpm\/pnpm\/releases\/download\/v\d+\.\d+\.\d+\/\$PNPM_ASSET" -o \/tmp\/pnpm\.tmp/,
    );
    expect(last).toMatch(/echo "\$PNPM_SHA256  \/tmp\/pnpm\.tmp" \| sha256sum -c -/);
    expect(last).toMatch(/mv \/tmp\/pnpm\.tmp \/tmp\/pnpm/);
    expect(last).toMatch(/chmod \+x \/tmp\/pnpm/);
    expect(last).toMatch(/\/tmp\/pnpm install --frozen-lockfile/);
    expect(last).toMatch(/\/tmp\/pnpm tools-pack linux build --to all --namespace default/);
    expect(last).not.toMatch(/--containerized/);
  });

  it("fetches pnpm standalone binary instead of relying on image npm tooling", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).not.toMatch(/corepack/);
    expect(last).not.toMatch(/\bnpx\b/);
    expect(last).not.toMatch(/(^|[;&|]\s*)npm(\s|$)/);
    expect(last).toMatch(/pnpm-linuxstatic-x64/);
    expect(last).toMatch(/pnpm-linuxstatic-arm64/);
  });

  it("routes container setup and install output to stderr before the JSON-emitting build", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toContain("{ command -v curl");
    expect(last).toContain("/tmp/pnpm install --frozen-lockfile; } >&2 && /tmp/pnpm tools-pack linux build");
    expect(last.indexOf("/tmp/pnpm install --frozen-lockfile")).toBeLessThan(
      last.indexOf("} >&2 && /tmp/pnpm tools-pack linux build"),
    );
  });

  it("picks the pnpm asset by container CPU so amd64 and arm64 hosts both work", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toContain('case "$(uname -m)" in');
    expect(last).toContain("x86_64) PNPM_ASSET=pnpm-linuxstatic-x64");
    expect(last).toContain("aarch64) PNPM_ASSET=pnpm-linuxstatic-arm64");
    expect(last).toMatch(/unsupported container arch/);
  });

  it("verifies the downloaded standalone pnpm binary before executing it", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toMatch(/PNPM_SHA256=[a-f0-9]{64}/);
    expect(last).toMatch(/sha256sum -c -/);
    expect(last).toMatch(/\/tmp\/pnpm\.tmp/);
    expect(last.indexOf("sha256sum -c -")).toBeLessThan(last.indexOf("mv /tmp/pnpm.tmp /tmp/pnpm"));
    expect(last.indexOf("mv /tmp/pnpm.tmp /tmp/pnpm")).toBeLessThan(last.indexOf("chmod +x /tmp/pnpm"));
  });

  it("hardcoded pnpm version stays in lockstep with root package.json `packageManager`", () => {
    // Guard against silent drift: if someone bumps packageManager in the
    // root package.json but forgets to update PNPM_VERSION in linux.ts,
    // the Linux container build would silently keep downloading the old pnpm.
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf-8")) as {
      packageManager?: string;
    };
    const match = String(rootPkg.packageManager ?? "").match(/^pnpm@(\d+\.\d+\.\d+)$/);
    expect(match, `expected root packageManager "pnpm@x.y.z", got ${rootPkg.packageManager}`).not.toBeNull();
    const expectedVersion = match![1];

    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toContain(`pnpm/releases/download/v${expectedVersion}/$PNPM_ASSET`);
  });

  it("forwards --dir /tools-pack so inner build output lands under the mounted host dir", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toMatch(/--dir \/tools-pack/);
  });

  it("forwards --portable when config.portable is true", () => {
    const args = buildDockerArgs({ ...makeConfig(), portable: true }, { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toMatch(/--portable/);
  });

  it("omits --portable when config.portable is false", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).not.toMatch(/--portable/);
  });

  it("forwards a shell-quoted --app-version to the inner build", () => {
    const args = buildDockerArgs(
      { ...makeConfig(), appVersion: "0.5.0-beta.1;echo-nope" },
      { uid: 1000, gid: 1000 },
    );
    const last = args[args.length - 1];
    expect(last).toContain("--app-version '0.5.0-beta.1;echo-nope'");
  });

  it("shell-quotes apostrophes in --app-version", () => {
    const args = buildDockerArgs(
      { ...makeConfig(), appVersion: "0.5.0-beta.1'quoted" },
      { uid: 1000, gid: 1000 },
    );
    const last = args[args.length - 1];
    expect(last).toContain("--app-version '0.5.0-beta.1'\\''quoted'");
  });
});

describe("renderDesktopTemplate", () => {
  const template = `[Desktop Entry]
Type=Application
Name=Open Design (@@NAMESPACE@@)
Exec=env OD_PACKAGED_NAMESPACE=@@NAMESPACE@@ @@EXEC_PATH@@ --appimage-extract-and-run %U
Icon=@@ICON_PATH@@
MimeType=x-scheme-handler/od;
`;

  it("substitutes all @@TOKEN@@ placeholders", () => {
    const out = renderDesktopTemplate(template, {
      namespace: "default",
      execPath: "/home/u/.local/bin/Open-Design.default.AppImage",
      iconName: "open-design-default",
    });
    expect(out).toContain("Name=Open Design (default)");
    expect(out).toContain(
      "Exec=env OD_PACKAGED_NAMESPACE=default /home/u/.local/bin/Open-Design.default.AppImage --appimage-extract-and-run %U",
    );
    expect(out).toContain("Icon=open-design-default");
  });

  it("uses OD_PACKAGED_NAMESPACE (not OD_NAMESPACE) so apps/packaged actually picks up the namespace override", () => {
    const out = renderDesktopTemplate(template, {
      namespace: "ns",
      execPath: "/x",
      iconName: "open-design-ns",
    });
    expect(out).toMatch(/^Exec=env OD_PACKAGED_NAMESPACE=ns /m);
    expect(out).not.toMatch(/OD_NAMESPACE=/);
  });

  it("preserves --appimage-extract-and-run on the Exec= line so menu launches bypass FUSE", () => {
    const out = renderDesktopTemplate(template, {
      namespace: "ns",
      execPath: "/x",
      iconName: "open-design-ns",
    });
    expect(out).toMatch(/^Exec=.*--appimage-extract-and-run .*%U$/m);
  });

  it("leaves no @@...@@ tokens unsubstituted", () => {
    const out = renderDesktopTemplate(template, {
      namespace: "ns",
      execPath: "/x",
      iconName: "open-design-ns",
    });
    expect(out).not.toMatch(/@@[A-Z_]+@@/);
  });

  it("preserves the MimeType=x-scheme-handler/od; line", () => {
    const out = renderDesktopTemplate(template, {
      namespace: "ns",
      execPath: "/x",
      iconName: "open-design-ns",
    });
    expect(out).toContain("MimeType=x-scheme-handler/od;");
  });
});

describe("sanitizeNamespace", () => {
  it("replaces non-alphanumeric chars with hyphens", () => {
    expect(sanitizeNamespace("a/b c")).toBe("a-b-c");
  });
});

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

describe("inspectPackedLinuxApp", () => {
  it("rejects unsupported headless inspect options before opening IPC", async () => {
    const requestJsonIpcMock = vi.mocked(requestJsonIpc);
    requestJsonIpcMock.mockClear();

    await expect(
      inspectPackedLinuxApp(makeConfig(), {
        expr: "document.title",
        headless: true,
      }),
    ).rejects.toThrow("linux inspect --headless supports status only; omit --expr and --path");
    expect(requestJsonIpcMock).not.toHaveBeenCalled();
  });

  it("allows desktop inspect eval and screenshot options when headless is omitted", async () => {
    const requestJsonIpcMock = vi.mocked(requestJsonIpc);
    requestJsonIpcMock.mockReset();
    requestJsonIpcMock
      .mockResolvedValueOnce({ state: "running", url: "od://app/" })
      .mockResolvedValueOnce({ ok: true, value: "Open Design" })
      .mockResolvedValueOnce({ path: "/tmp/open-design-linux.png" });

    const result = await inspectPackedLinuxApp(makeConfig(), {
      expr: "document.title",
      path: "/tmp/open-design-linux.png",
    });

    expect(result).toEqual({
      eval: { ok: true, value: "Open Design" },
      screenshot: { path: "/tmp/open-design-linux.png" },
      status: { state: "running", url: "od://app/" },
    });
    expect(requestJsonIpcMock).toHaveBeenCalledTimes(3);
  });
});

describe("matchesAppImageProcess", () => {
  const installPath = "/home/u/.local/bin/Open-Design.default.AppImage";

  it("matches FUSE-mode (executable === installPath)", () => {
    const ok = matchesAppImageProcess(
      { pid: 1234, executable: installPath, env: {} },
      installPath,
    );
    expect(ok).toBe(true);
  });

  it("matches extracted-mode (env.APPIMAGE === installPath, executable matches /tmp/.mount_*/AppRun)", () => {
    const ok = matchesAppImageProcess(
      { pid: 1234, executable: "/tmp/.mount_abc123/AppRun", env: { APPIMAGE: installPath } },
      installPath,
    );
    expect(ok).toBe(true);
  });

  it("rejects unrelated processes", () => {
    const ok = matchesAppImageProcess(
      { pid: 9999, executable: "/usr/bin/node", env: {} },
      installPath,
    );
    expect(ok).toBe(false);
  });

  it("rejects extracted-mode with mismatched APPIMAGE env", () => {
    const ok = matchesAppImageProcess(
      { pid: 1234, executable: "/tmp/.mount_abc/AppRun", env: { APPIMAGE: "/other/path.AppImage" } },
      installPath,
    );
    expect(ok).toBe(false);
  });

  it("rejects extracted-mode when APPIMAGE env is missing", () => {
    const ok = matchesAppImageProcess(
      { pid: 1234, executable: "/tmp/.mount_abc123/AppRun", env: {} },
      installPath,
    );
    expect(ok).toBe(false);
  });

  it("matches --appimage-extract-and-run mode (executable in /tmp/appimage_extracted_*/<binary>)", () => {
    const ok = matchesAppImageProcess(
      {
        pid: 1234,
        executable: "/tmp/appimage_extracted_fe548e54/Open Design",
        env: { APPIMAGE: installPath },
      },
      installPath,
    );
    expect(ok).toBe(true);
  });

  it("rejects extract-and-run mode with mismatched APPIMAGE env", () => {
    const ok = matchesAppImageProcess(
      {
        pid: 1234,
        executable: "/tmp/appimage_extracted_fe548e54/Open Design",
        env: { APPIMAGE: "/elsewhere/Other.AppImage" },
      },
      installPath,
    );
    expect(ok).toBe(false);
  });
});
