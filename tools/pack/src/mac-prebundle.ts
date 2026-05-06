import { readFile } from "node:fs/promises";

import type { ToolPackConfig } from "./config.js";

export const MAC_PREBUNDLED_APP_DIR_NAME = "prebundled";
export const MAC_PREBUNDLE_META_DIR_NAME = "prebundle-meta";
export const MAC_PREBUNDLED_PACKAGED_MAIN_RELATIVE_PATH = "app/prebundled/packaged-main.mjs";
export const MAC_PREBUNDLED_WEB_SIDECAR_RELATIVE_PATH = "app/prebundled/web-sidecar.mjs";
export const MAC_PREBUNDLE_ESBUILD_TARGET = "node24";

export const MAC_STANDALONE_PREBUNDLE_EXCLUDED_INTERNAL_PACKAGES = [
  "@open-design/web",
  "@open-design/packaged",
] as const;

export const MAC_PREBUNDLE_POLICIES = {
  packagedMain: {
    externals: ["electron"],
    forbiddenInputs: [
      "/apps/web/",
      "/node_modules/@open-design/web/",
      "/node_modules/next/",
      "/node_modules/openai/",
      "/node_modules/react/",
      "/node_modules/react-dom/",
    ],
    label: "packaged main",
  },
  webSidecar: {
    externals: [],
    forbiddenInputs: [
      "/node_modules/next/",
      "/node_modules/openai/",
      "/node_modules/react/",
      "/node_modules/react-dom/",
    ],
    label: "web sidecar",
  },
} as const;

export type MacPrebundlePolicyName = keyof typeof MAC_PREBUNDLE_POLICIES;

function toPosixPath(value: string): string {
  return value.replaceAll("\\", "/");
}

export function shouldUseMacStandalonePrebundle(webOutputMode: ToolPackConfig["webOutputMode"]): boolean {
  return webOutputMode === "standalone";
}

export function shouldInstallInternalPackageForMacPrebundle(options: {
  packageName: string;
  webOutputMode: ToolPackConfig["webOutputMode"];
}): boolean {
  if (!shouldUseMacStandalonePrebundle(options.webOutputMode)) return true;
  return !MAC_STANDALONE_PREBUNDLE_EXCLUDED_INTERNAL_PACKAGES.includes(
    options.packageName as (typeof MAC_STANDALONE_PREBUNDLE_EXCLUDED_INTERNAL_PACKAGES)[number],
  );
}

export function findForbiddenMacPrebundleInputs(options: {
  forbiddenInputs: readonly string[];
  inputs: readonly string[];
}): string[] {
  return options.inputs
    .map(toPosixPath)
    .filter((input) => options.forbiddenInputs.some((forbidden) => input.includes(forbidden)));
}

export async function assertMacPrebundleMetafile(options: {
  metafilePath: string;
  policyName: MacPrebundlePolicyName;
}): Promise<void> {
  const policy = MAC_PREBUNDLE_POLICIES[options.policyName];
  const metafile = JSON.parse(await readFile(options.metafilePath, "utf8")) as { inputs?: Record<string, unknown> };
  const matched = findForbiddenMacPrebundleInputs({
    forbiddenInputs: policy.forbiddenInputs,
    inputs: Object.keys(metafile.inputs ?? {}),
  });
  if (matched.length > 0) {
    throw new Error(`${policy.label} prebundle included forbidden inputs: ${matched.join(", ")}`);
  }
}

export function renderMacPackagedMainEntry(usePrebundle: boolean): string {
  return usePrebundle
    ? 'import("./prebundled/packaged-main.mjs").catch((error) => {\n  console.error("packaged entry failed", error);\n  process.exit(1);\n});\n'
    : 'import("@open-design/packaged").catch((error) => {\n  console.error("packaged entry failed", error);\n  process.exit(1);\n});\n';
}
