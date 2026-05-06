import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAC_PREBUNDLE_ESBUILD_TARGET,
  MAC_PREBUNDLE_POLICIES,
  MAC_PREBUNDLED_WEB_SIDECAR_RELATIVE_PATH,
  assertMacPrebundleMetafile,
  findForbiddenMacPrebundleInputs,
  renderMacPackagedMainEntry,
  shouldInstallInternalPackageForMacPrebundle,
  shouldUseMacStandalonePrebundle,
} from "../src/mac-prebundle.js";

describe("mac standalone prebundle policy", () => {
  it("is enabled only for standalone web output", () => {
    expect(shouldUseMacStandalonePrebundle("standalone")).toBe(true);
    expect(shouldUseMacStandalonePrebundle("server")).toBe(false);
  });

  it("keeps server-mode package topology unchanged", () => {
    expect(
      shouldInstallInternalPackageForMacPrebundle({
        packageName: "@open-design/web",
        webOutputMode: "server",
      }),
    ).toBe(true);
    expect(
      shouldInstallInternalPackageForMacPrebundle({
        packageName: "@open-design/packaged",
        webOutputMode: "server",
      }),
    ).toBe(true);
  });

  it("excludes only packages replaced by mac standalone prebundles", () => {
    expect(
      shouldInstallInternalPackageForMacPrebundle({
        packageName: "@open-design/web",
        webOutputMode: "standalone",
      }),
    ).toBe(false);
    expect(
      shouldInstallInternalPackageForMacPrebundle({
        packageName: "@open-design/packaged",
        webOutputMode: "standalone",
      }),
    ).toBe(false);
    expect(
      shouldInstallInternalPackageForMacPrebundle({
        packageName: "@open-design/daemon",
        webOutputMode: "standalone",
      }),
    ).toBe(true);
  });

  it("documents the explicit code-level bundle boundaries", () => {
    expect(MAC_PREBUNDLE_ESBUILD_TARGET).toBe("node24");
    expect(MAC_PREBUNDLE_POLICIES.packagedMain.externals).toEqual(["electron"]);
    expect(MAC_PREBUNDLE_POLICIES.webSidecar.externals).toEqual([]);
    expect(MAC_PREBUNDLED_WEB_SIDECAR_RELATIVE_PATH).toBe("app/prebundled/web-sidecar.mjs");
  });
});

describe("findForbiddenMacPrebundleInputs", () => {
  it("matches forbidden dependency roots after path normalization", () => {
    expect(
      findForbiddenMacPrebundleInputs({
        forbiddenInputs: MAC_PREBUNDLE_POLICIES.webSidecar.forbiddenInputs,
        inputs: [
          "src/index.ts",
          "C:\\repo\\node_modules\\next\\dist\\server.js",
          "/repo/node_modules/openai/index.mjs",
        ],
      }),
    ).toEqual([
      "C:/repo/node_modules/next/dist/server.js",
      "/repo/node_modules/openai/index.mjs",
    ]);
  });
});

describe("assertMacPrebundleMetafile", () => {
  it("accepts a safe web sidecar metafile", async () => {
    const root = await mkdtemp(join(tmpdir(), "open-design-mac-prebundle-"));
    const metafilePath = join(root, "safe.json");

    try {
      await writeFile(
        metafilePath,
        JSON.stringify({ inputs: { "/repo/apps/web/sidecar/index.ts": {} } }),
        "utf8",
      );

      await expect(
        assertMacPrebundleMetafile({ metafilePath, policyName: "webSidecar" }),
      ).resolves.toBeUndefined();
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("rejects a packaged main metafile that pulled in web runtime closure", async () => {
    const root = await mkdtemp(join(tmpdir(), "open-design-mac-prebundle-"));
    const metafilePath = join(root, "unsafe.json");

    try {
      await writeFile(
        metafilePath,
        JSON.stringify({ inputs: { "/repo/node_modules/@open-design/web/dist/sidecar/index.js": {} } }),
        "utf8",
      );

      await expect(
        assertMacPrebundleMetafile({ metafilePath, policyName: "packagedMain" }),
      ).rejects.toThrow(/packaged main prebundle included forbidden inputs/);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

describe("renderMacPackagedMainEntry", () => {
  it("renders the prebundled runtime entry shim", () => {
    expect(renderMacPackagedMainEntry(true)).toContain("./prebundled/packaged-main.mjs");
    expect(renderMacPackagedMainEntry(true)).not.toContain("@open-design/packaged");
  });

  it("renders the package entry shim for non-prebundled mode", () => {
    expect(renderMacPackagedMainEntry(false)).toContain("@open-design/packaged");
    expect(renderMacPackagedMainEntry(false)).not.toContain("./prebundled/packaged-main.mjs");
  });
});
