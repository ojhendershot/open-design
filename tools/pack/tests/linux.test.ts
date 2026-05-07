import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { ToolPackConfig } from "../src/config.js";
import {
  buildDockerArgs,
  matchesAppImageProcess,
  renderDesktopTemplate,
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
    expect(args).toContain("CI=true");
    expect(args).toContain("ELECTRON_CACHE=/home/builder/.cache/electron");
    expect(args).toContain("ELECTRON_BUILDER_CACHE=/home/builder/.cache/electron-builder");
  });

  it("re-invokes pnpm tools-pack linux build inside the container without --containerized", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toMatch(/node-v24\.14\.1-linux-x64/);
    expect(last).toMatch(/corepack pnpm@\d+\.\d+\.\d+ install --frozen-lockfile/);
    expect(last).toMatch(/corepack pnpm@\d+\.\d+\.\d+ exec tools-pack linux build --to all --namespace default/);
    expect(last).not.toMatch(/--containerized/);
  });

  it("bootstraps Node 24 before invoking pnpm because electronuserland/builder:base has no Node/npm/npx", () => {
    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toMatch(/curl -fsSL "https:\/\/nodejs\.org\/dist\/v24\.14\.1\/node-v24\.14\.1-linux-x64\.tar\.xz"/);
    expect(last).toMatch(/node_dir="\$HOME\/\.node\/node-v24\.14\.1-linux-x64"/);
    expect(last).toMatch(/tar -xJf "\$tmp_dir\/node\.tar\.xz" -C "\$HOME\/\.node"/);
    expect(last).not.toMatch(/node_dir="\$HOME\/\.cache\//);
    expect(last).toMatch(/export PATH="\$node_dir\/bin:\$PATH"/);
    expect(last).toMatch(/export COREPACK_HOME="\$HOME\/\.node\/corepack"/);
    expect(last).toMatch(/mkdir -p "\$COREPACK_HOME"/);
    expect(last).toMatch(/corepack enable --install-directory "\$node_dir\/bin"/);
    expect(last).not.toMatch(/\.cache\/node/);
    expect(last).not.toMatch(/\bnpx\b/);
    expect(last).not.toMatch(/npm exec/);
    expect(last).toMatch(/corepack pnpm@/);
  });

  it("hardcoded pnpm version stays in lockstep with root package.json `packageManager`", () => {
    // Guard against silent drift: if someone bumps packageManager in the
    // root package.json but forgets to update PNPM_VERSION in linux.ts,
    // the Linux container build would silently keep using the old pnpm.
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf-8")) as {
      packageManager?: string;
    };
    const match = String(rootPkg.packageManager ?? "").match(/^pnpm@(\d+\.\d+\.\d+)$/);
    expect(match, `expected root packageManager "pnpm@x.y.z", got ${rootPkg.packageManager}`).not.toBeNull();
    const expectedVersion = match![1];

    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toContain(`corepack pnpm@${expectedVersion}`);
  });

  it("hardcoded Node major stays in lockstep with root package.json `engines.node`", () => {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf-8")) as {
      engines?: { node?: string };
    };
    const match = String(rootPkg.engines?.node ?? "").match(/^~(\d+)$/);
    expect(match, `expected root engines.node "~<major>", got ${rootPkg.engines?.node}`).not.toBeNull();
    const expectedMajor = match![1];

    const args = buildDockerArgs(makeConfig(), { uid: 1000, gid: 1000 });
    const last = args[args.length - 1];
    expect(last).toContain(`node-v${expectedMajor}.`);
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
