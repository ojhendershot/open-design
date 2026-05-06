import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { promisify } from "node:util";

import { rebuild } from "@electron/rebuild";
import { createCommandInvocation, createPackageManagerInvocation } from "@open-design/platform";

import { hashJson, hashPath, ToolPackCache } from "../cache.js";
import type { ToolPackConfig } from "../config.js";
import { copyBundledResourceTrees, winResources } from "../resources.js";
import { ensureWorkspaceBuildArtifacts } from "../workspace-build.js";
import {
  ELECTRON_BUILDER_ASAR,
  ELECTRON_BUILDER_BUILD_DEPENDENCIES_FROM_SOURCE,
  ELECTRON_BUILDER_FILE_PATTERNS,
  ELECTRON_BUILDER_NODE_GYP_REBUILD,
  ELECTRON_BUILDER_NPM_REBUILD,
  ELECTRON_REBUILD_MODE,
  ELECTRON_REBUILD_NATIVE_MODULES,
  INTERNAL_PACKAGES,
  NSIS_INSTALLER_LANGUAGE_BY_WEB_LOCALE,
  PRODUCT_NAME,
  WEB_STANDALONE_HOOK_CONFIG_ENV,
  WEB_STANDALONE_RESOURCE_NAME,
} from "./constants.js";
import { pathExists, removeTree, sizeExistingFileBytes, sizePathBytes, sumChildDirectorySizes } from "./fs.js";
import { ensureNsisPersianLanguageAlias, writeNsisInclude } from "./nsis.js";
import { resolveWinPaths, sanitizeNamespace } from "./paths.js";
import type {
  AssembledAppCacheMetadata,
  AssembledAppCacheResult,
  ElectronReadyAppCacheMetadata,
  ElectronReadyAppCacheResult,
  NativeRebuildCacheMetadata,
  NativeRebuildCacheResult,
  PackedTarballInfo,
  PackedTarballsCacheMetadata,
  PackedTarballsCacheResult,
  ResourceTreeCacheMetadata,
  WinPackResult,
  WinPackTiming,
  WinPaths,
  WinSizeReport,
} from "./types.js";

const execFileAsync = promisify(execFile);

async function runPnpm(config: ToolPackConfig, args: string[], extraEnv: NodeJS.ProcessEnv = {}): Promise<void> {
  const invocation = createPackageManagerInvocation(args, process.env);
  await execFileAsync(invocation.command, invocation.args, {
    cwd: config.workspaceRoot,
    env: { ...process.env, ...extraEnv },
    windowsVerbatimArguments: invocation.windowsVerbatimArguments,
  });
}

async function runNpmInstall(appRoot: string): Promise<void> {
  const invocation = createCommandInvocation({
    args: ["install", "--omit=dev", "--no-package-lock"],
    command: process.platform === "win32" ? "npm.cmd" : "npm",
  });
  await execFileAsync(invocation.command, invocation.args, {
    cwd: appRoot,
    env: process.env,
    windowsVerbatimArguments: invocation.windowsVerbatimArguments,
  });
}

async function runElectronRebuild(config: ToolPackConfig, appRoot: string): Promise<void> {
  const foundModules = new Set<string>();
  const rebuildResult = rebuild({
    arch: "x64",
    buildFromSource: ELECTRON_BUILDER_BUILD_DEPENDENCIES_FROM_SOURCE,
    buildPath: appRoot,
    electronVersion: config.electronVersion,
    force: true,
    mode: ELECTRON_REBUILD_MODE,
    onlyModules: [...ELECTRON_REBUILD_NATIVE_MODULES],
    platform: "win32",
    projectRootPath: appRoot,
  });
  rebuildResult.lifecycle.on("modules-found", (modules: string[]) => {
    for (const moduleName of modules) foundModules.add(moduleName);
    process.stderr.write(`[tools-pack] rebuilding Electron ABI modules: ${modules.join(", ") || "none"}\n`);
  });
  await rebuildResult;
  const missingModules = ELECTRON_REBUILD_NATIVE_MODULES.filter((moduleName) => !foundModules.has(moduleName));
  if (missingModules.length > 0) {
    throw new Error(`Electron ABI rebuild did not discover required native module(s): ${missingModules.join(", ")}`);
  }
}

function nativeRebuildOutputPath(appRoot: string): string {
  return join(appRoot, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");
}

function isBetterSqlite3SourceResidue(path: string): boolean {
  return (
    path.includes("/node_modules/better-sqlite3/deps/") ||
    path.includes("/node_modules/better-sqlite3/build/Release/obj/")
  );
}

async function rebuildWinNativeDependencies(
  config: ToolPackConfig,
  cache: ToolPackCache,
  assembledApp: AssembledAppCacheResult,
): Promise<NativeRebuildCacheResult> {
  const key = hashJson({
    arch: "x64",
    assembledAppKey: assembledApp.key,
    electronVersion: config.electronVersion,
    modules: ELECTRON_REBUILD_NATIVE_MODULES,
    platform: "win32",
    schemaVersion: 1,
  });
  const node = {
    id: "win.native-rebuild",
    key,
    outputs: ["better_sqlite3.node"],
    invalidate: async () => null,
    build: async ({ entryRoot }: { entryRoot: string }): Promise<NativeRebuildCacheMetadata> => {
      const stagingAppRoot = join(entryRoot, "app");
      await cp(assembledApp.appRoot, stagingAppRoot, { recursive: true });
      await runElectronRebuild(config, stagingAppRoot);
      await cp(nativeRebuildOutputPath(stagingAppRoot), join(entryRoot, "better_sqlite3.node"));
      return { modules: ELECTRON_REBUILD_NATIVE_MODULES };
    },
  };
  const manifest = await cache.acquire({
    materialize: [],
    node,
  });
  return {
    key,
    modules: manifest.payloadMetadata.modules,
    nodePath: join(manifest.entryPath, "better_sqlite3.node"),
  };
}

async function readPackagedVersion(config: ToolPackConfig): Promise<string> {
  const packageJsonPath = join(config.workspaceRoot, "apps", "packaged", "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { version?: unknown };
  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error(`missing apps/packaged package version in ${packageJsonPath}`);
  }
  return packageJson.version;
}

async function assertWebStandaloneOutput(config: ToolPackConfig): Promise<void> {
  const webRoot = join(config.workspaceRoot, "apps", "web");
  const standaloneSourceRoot = join(webRoot, ".next", "standalone");
  const candidates = [
    join(standaloneSourceRoot, "apps", "web", "server.js"),
    join(standaloneSourceRoot, "server.js"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return;
  }

  throw new Error("Next.js standalone server output was not produced under apps/web/.next/standalone");
}

async function writeWebStandaloneHookConfig(config: ToolPackConfig, paths: WinPaths): Promise<string> {
  const webRoot = join(config.workspaceRoot, "apps", "web");
  await assertWebStandaloneOutput(config);

  await mkdir(dirname(paths.webStandaloneHookConfigPath), { recursive: true });
  await writeFile(
    paths.webStandaloneHookConfigPath,
    `${JSON.stringify(
      {
        auditReportPath: paths.webStandaloneHookAuditPath,
        pruneCopiedSharp: true,
        pruneRootNext: true,
        pruneRootSharp: true,
        resourceName: WEB_STANDALONE_RESOURCE_NAME,
        standaloneSourceRoot: join(webRoot, ".next", "standalone"),
        version: 1,
        webPublicSourceRoot: join(webRoot, "public"),
        webStaticSourceRoot: join(webRoot, ".next", "static"),
        workspaceRoot: config.workspaceRoot,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return paths.webStandaloneHookConfigPath;
}

async function buildWorkspaceArtifacts(config: ToolPackConfig): Promise<void> {
  const webNextEnvPath = join(config.workspaceRoot, "apps", "web", "next-env.d.ts");
  const previousWebNextEnv = await readFile(webNextEnvPath, "utf8").catch(() => null);

  await runPnpm(config, ["--filter", "@open-design/contracts", "build"]);
  await runPnpm(config, ["--filter", "@open-design/sidecar-proto", "build"]);
  await runPnpm(config, ["--filter", "@open-design/sidecar", "build"]);
  await runPnpm(config, ["--filter", "@open-design/platform", "build"]);
  await runPnpm(config, ["--filter", "@open-design/daemon", "build"]);
  try {
    await runPnpm(config, ["--filter", "@open-design/web", "build"], { OD_WEB_OUTPUT_MODE: config.webOutputMode });
    await runPnpm(config, ["--filter", "@open-design/web", "build:sidecar"]);
  } finally {
    if (previousWebNextEnv == null) await rm(webNextEnvPath, { force: true });
    else await writeFile(webNextEnvPath, previousWebNextEnv, "utf8");
  }
  await runPnpm(config, ["--filter", "@open-design/desktop", "build"]);
  await runPnpm(config, ["--filter", "@open-design/packaged", "build"]);
}

async function createResourceTreeCacheKey(config: ToolPackConfig): Promise<string> {
  return hashJson({
    assetsCommunityPets: await hashPath(join(config.workspaceRoot, "assets", "community-pets")),
    assetsFrames: await hashPath(join(config.workspaceRoot, "assets", "frames")),
    craft: await hashPath(join(config.workspaceRoot, "craft")),
    designSystems: await hashPath(join(config.workspaceRoot, "design-systems")),
    node: "win.resource-tree",
    promptTemplates: await hashPath(join(config.workspaceRoot, "prompt-templates")),
    schemaVersion: 1,
    skills: await hashPath(join(config.workspaceRoot, "skills")),
  });
}

async function copyResourceTree(config: ToolPackConfig, paths: WinPaths, cache: ToolPackCache): Promise<void> {
  const node = {
    id: "win.resource-tree",
    key: await createResourceTreeCacheKey(config),
    outputs: ["open-design"],
    invalidate: async () => null,
    build: async ({ entryRoot }: { entryRoot: string }): Promise<ResourceTreeCacheMetadata> => {
      const resourceRoot = join(entryRoot, "open-design");
      await mkdir(resourceRoot, { recursive: true });
      await copyBundledResourceTrees({
        workspaceRoot: config.workspaceRoot,
        resourceRoot,
      });
      return { resourceName: "open-design" };
    },
  };
  await cache.acquire({
    materialize: [{ from: "open-design", to: paths.resourceRoot }],
    node,
  });
}

async function copyWinIcon(paths: WinPaths): Promise<void> {
  await mkdir(dirname(paths.winIconPath), { recursive: true });
  await cp(winResources.icon, paths.winIconPath);
}

async function createWorkspaceTarballsCacheKey(config: ToolPackConfig): Promise<string> {
  const packageHashes: Record<string, string> = {};
  for (const packageInfo of INTERNAL_PACKAGES) {
    packageHashes[packageInfo.name] = await hashPath(join(config.workspaceRoot, packageInfo.directory), {
      ignoreDirectoryNames: [".next", "dist", "node_modules"],
    });
  }
  const rootPackageJson = JSON.parse(await readFile(join(config.workspaceRoot, "package.json"), "utf8")) as {
    packageManager?: unknown;
  };

  return hashJson({
    node: "win.workspace-tarballs",
    packageHashes,
    packageManager: rootPackageJson.packageManager,
    pnpmLock: await hashPath(join(config.workspaceRoot, "pnpm-lock.yaml")),
    schemaVersion: 1,
  });
}

async function collectWorkspaceTarballs(
  config: ToolPackConfig,
  paths: WinPaths,
  cache: ToolPackCache,
): Promise<PackedTarballsCacheResult> {
  const key = await createWorkspaceTarballsCacheKey(config);
  const node = {
    id: "win.workspace-tarballs",
    key,
    outputs: ["tarballs"],
    invalidate: async () => null,
    build: async ({ entryRoot }: { entryRoot: string }): Promise<PackedTarballsCacheMetadata> => {
      const tarballsRoot = join(entryRoot, "tarballs");
      await mkdir(tarballsRoot, { recursive: true });
      const packedTarballs: PackedTarballInfo[] = [];
      for (const packageInfo of INTERNAL_PACKAGES) {
        const beforeEntries = new Set(await readdir(tarballsRoot));
        await runPnpm(config, ["-C", packageInfo.directory, "pack", "--pack-destination", tarballsRoot]);
        const newEntries = (await readdir(tarballsRoot)).filter((entry) => !beforeEntries.has(entry));
        if (newEntries.length !== 1 || newEntries[0] == null) {
          throw new Error(`expected one tarball for ${packageInfo.name}, got ${newEntries.length}`);
        }
        packedTarballs.push({ fileName: newEntries[0], packageName: packageInfo.name });
      }
      return { tarballs: packedTarballs };
    },
  };
  const manifest = await cache.acquire({
    materialize: [{ from: "tarballs", to: paths.tarballsRoot }],
    node,
  });
  return { key, tarballs: manifest.payloadMetadata.tarballs };
}

async function writePackagedConfig(config: ToolPackConfig, paths: WinPaths, packagedVersion: string): Promise<void> {
  await writeFile(
    paths.packagedConfigPath,
    `${JSON.stringify(
      {
        appVersion: packagedVersion,
        namespace: config.namespace,
        webOutputMode: config.webOutputMode,
        ...(config.portable ? {} : { namespaceBaseRoot: config.roots.runtime.namespaceBaseRoot }),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function createAssembledAppDependencies(
  paths: Pick<WinPaths, "assembledAppRoot" | "tarballsRoot">,
  packedTarballs: PackedTarballInfo[],
): Record<string, string> {
  const tarballByPackage = Object.fromEntries(packedTarballs.map((entry) => [entry.packageName, entry.fileName] as const));
  return Object.fromEntries(
    INTERNAL_PACKAGES.map((packageInfo) => {
      const tarball = tarballByPackage[packageInfo.name];
      if (tarball == null) throw new Error(`missing tarball for ${packageInfo.name}`);
      return [packageInfo.name, `file:${relative(paths.assembledAppRoot, join(paths.tarballsRoot, tarball))}`];
    }),
  );
}

async function writeAssembledAppEntrypoints(
  paths: Pick<WinPaths, "assembledAppRoot" | "assembledMainEntryPath" | "assembledPackageJsonPath" | "tarballsRoot">,
  packedTarballs: PackedTarballInfo[],
  packagedVersion: string,
  options: { dependencies?: Record<string, string> } = {},
): Promise<void> {
  await mkdir(paths.assembledAppRoot, { recursive: true });
  await writeFile(
    paths.assembledPackageJsonPath,
    `${JSON.stringify(
      {
        dependencies: options.dependencies ?? createAssembledAppDependencies(paths, packedTarballs),
        description: "Open Design packaged runtime",
        main: "./main.cjs",
        name: "open-design-packaged-app",
        private: true,
        productName: PRODUCT_NAME,
        version: packagedVersion,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    paths.assembledMainEntryPath,
    'import("@open-design/packaged").catch((error) => {\n  console.error("packaged entry failed", error);\n  process.exit(1);\n});\n',
    "utf8",
  );
}

async function createAssembledAppCacheKey(
  config: ToolPackConfig,
  tarballsKey: string,
  packedTarballs: PackedTarballInfo[],
  packagedVersion: string,
): Promise<string> {
  return hashJson({
    electronVersion: config.electronVersion,
    node: "win.assembled-app",
    packagedVersion,
    packedTarballs,
    platform: "win32",
    schemaVersion: 3,
    tarballsKey,
    webOutputMode: config.webOutputMode,
  });
}

async function writeAssembledApp(
  config: ToolPackConfig,
  paths: WinPaths,
  tarballs: PackedTarballsCacheResult,
  cache: ToolPackCache,
): Promise<AssembledAppCacheResult> {
  const packagedVersion = await readPackagedVersion(config);
  await removeTree(join(config.roots.output.namespaceRoot, "assembled"));
  const packedTarballs = tarballs.tarballs;
  const key = await createAssembledAppCacheKey(config, tarballs.key, packedTarballs, packagedVersion);
  const node = {
    id: "win.assembled-app",
    key,
    outputs: ["app"],
    invalidate: async () => null,
    build: async ({ entryRoot }: { entryRoot: string }): Promise<AssembledAppCacheMetadata> => {
      const assembledAppRoot = join(entryRoot, "app");
      await writeAssembledAppEntrypoints(
        { ...paths, assembledAppRoot, assembledMainEntryPath: join(assembledAppRoot, "main.cjs"), assembledPackageJsonPath: join(assembledAppRoot, "package.json") },
        packedTarballs,
        packagedVersion,
      );
      await runNpmInstall(assembledAppRoot);
      return { packagedVersion };
    },
  };
  const manifest = await cache.acquire({
    materialize: [],
    node,
  });
  await writePackagedConfig(config, paths, packagedVersion);
  return { appRoot: join(manifest.entryPath, "app"), key, packagedVersion };
}

async function prepareElectronReadyApp(
  assembledApp: AssembledAppCacheResult,
  nativeRebuild: NativeRebuildCacheResult,
  cache: ToolPackCache,
): Promise<ElectronReadyAppCacheResult> {
  const key = hashJson({
    assembledAppKey: assembledApp.key,
    nativeRebuildKey: nativeRebuild.key,
    node: "win.electron-ready-app",
    schemaVersion: 2,
  });
  const node = {
    id: "win.electron-ready-app",
    key,
    outputs: ["app"],
    invalidate: async () => null,
    build: async ({ entryRoot }: { entryRoot: string }): Promise<ElectronReadyAppCacheMetadata> => {
      const appRoot = join(entryRoot, "app");
      await cp(assembledApp.appRoot, appRoot, { recursive: true });
      await cp(nativeRebuild.nodePath, nativeRebuildOutputPath(appRoot));
      return { assembledAppKey: assembledApp.key, nativeRebuildKey: nativeRebuild.key };
    },
  };
  const manifest = await cache.acquire({
    materialize: [],
    node,
  });
  return {
    appRoot: join(manifest.entryPath, "app"),
    assembledAppKey: manifest.payloadMetadata.assembledAppKey,
    key,
    nativeRebuildKey: manifest.payloadMetadata.nativeRebuildKey,
  };
}

function resolveWinTargets(to: ToolPackConfig["to"]): Array<"dir" | "nsis"> {
  switch (to) {
    case "dir":
      return ["dir"];
    case "all":
      return ["dir", "nsis"];
    case "nsis":
      return ["nsis"];
    default:
      throw new Error(`unsupported win target: ${to}`);
  }
}

async function runElectronBuilder(config: ToolPackConfig, paths: WinPaths, projectDir: string): Promise<void> {
  const namespaceToken = sanitizeNamespace(config.namespace);
  const packagedVersion = await readPackagedVersion(config);
  const webStandaloneHookConfigPath = config.webOutputMode === "standalone"
    ? await writeWebStandaloneHookConfig(config, paths)
    : null;
  const builderConfig = {
    appId: "io.open-design.desktop",
    afterPack: webStandaloneHookConfigPath == null ? undefined : winResources.webStandaloneAfterPackHook,
    asar: ELECTRON_BUILDER_ASAR,
    buildDependenciesFromSource: ELECTRON_BUILDER_BUILD_DEPENDENCIES_FROM_SOURCE,
    compression: "maximum",
    directories: { output: paths.appBuilderOutputRoot },
    electronDist: config.electronDistPath,
    electronVersion: config.electronVersion,
    executableName: PRODUCT_NAME,
    extraMetadata: {
      main: "./main.cjs",
      name: "open-design-packaged-app",
      productName: PRODUCT_NAME,
      version: packagedVersion,
    },
    extraResources: [
      { from: paths.resourceRoot, to: "open-design" },
      { from: paths.packagedConfigPath, to: "open-design-config.json" },
    ],
    files: [...ELECTRON_BUILDER_FILE_PATTERNS],
    forceCodeSigning: false,
    icon: paths.winIconPath,
    nodeGypRebuild: ELECTRON_BUILDER_NODE_GYP_REBUILD,
    npmRebuild: ELECTRON_BUILDER_NPM_REBUILD,
    nsis: {
      allowElevation: false,
      allowToChangeInstallationDirectory: true,
      artifactName: `${PRODUCT_NAME}-${namespaceToken}-setup.\${ext}`,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      deleteAppDataOnUninstall: false,
      displayLanguageSelector: false,
      include: paths.nsisIncludePath,
      installerLanguages: Object.values(NSIS_INSTALLER_LANGUAGE_BY_WEB_LOCALE),
      language: "1033",
      multiLanguageInstaller: true,
      oneClick: false,
      perMachine: false,
      shortcutName: PRODUCT_NAME,
      warningsAsErrors: false,
    },
    productName: PRODUCT_NAME,
    publish: [{ provider: "generic", url: "https://updates.invalid/open-design" }],
    win: {
      artifactName: `${PRODUCT_NAME}-${namespaceToken}.\${ext}`,
      icon: paths.winIconPath,
      target: resolveWinTargets(config.to).map((target) => ({ arch: ["x64"], target })),
    },
  };

  await removeTree(paths.appBuilderOutputRoot);
  await mkdir(dirname(paths.appBuilderConfigPath), { recursive: true });
  await writeNsisInclude(config, paths);
  await writeFile(paths.appBuilderConfigPath, `${JSON.stringify(builderConfig, null, 2)}\n`, "utf8");
  const build = async () => {
    await execFileAsync(process.execPath, [
      config.electronBuilderCliPath,
      "--win",
      "--projectDir",
      projectDir,
      "--config",
      paths.appBuilderConfigPath,
      "--publish",
      "never",
    ], {
      cwd: config.workspaceRoot,
      env: {
        ...process.env,
        CSC_IDENTITY_AUTO_DISCOVERY: "false",
        ...(webStandaloneHookConfigPath == null ? {} : { [WEB_STANDALONE_HOOK_CONFIG_ENV]: webStandaloneHookConfigPath }),
      },
    });
  };
  await ensureNsisPersianLanguageAlias(config);
  try {
    await build();
  } catch (error) {
    const output = `${(error as { stdout?: unknown }).stdout ?? ""}\n${(error as { stderr?: unknown }).stderr ?? ""}`;
    if (output.includes("Persian.nlf") && await ensureNsisPersianLanguageAlias(config)) {
      await build();
      return;
    }
    throw error;
  }
}

async function writeLocalLatestYml(config: ToolPackConfig, paths: WinPaths): Promise<void> {
  if (!(await pathExists(paths.setupPath))) return;
  const packagedVersion = await readPackagedVersion(config);
  const setupPayload = await readFile(paths.setupPath);
  const setupMetadata = await stat(paths.setupPath);
  const sha512 = createHash("sha512").update(setupPayload).digest("base64");
  const setupName = basename(paths.setupPath);
  await writeFile(
    paths.latestYmlPath,
    [
      `version: ${JSON.stringify(packagedVersion)}`,
      "files:",
      `  - url: ${JSON.stringify(setupName)}`,
      `    sha512: ${JSON.stringify(sha512)}`,
      `    size: ${setupMetadata.size}`,
      `path: ${JSON.stringify(setupName)}`,
      `sha512: ${JSON.stringify(sha512)}`,
      `releaseDate: ${JSON.stringify(new Date().toISOString())}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

async function collectWinSizeReport(config: ToolPackConfig, paths: WinPaths): Promise<WinSizeReport> {
  const appResourcesRoot = join(paths.unpackedRoot, "resources");
  const appNodeModulesRoot = join(appResourcesRoot, "app", "node_modules");
  const copiedStandaloneRoot = join(appResourcesRoot, WEB_STANDALONE_RESOURCE_NAME);
  const copiedStandaloneNodeModulesRoot = join(copiedStandaloneRoot, "node_modules");
  const copiedStandaloneWebNodeModulesRoot = join(copiedStandaloneRoot, "apps", "web", "node_modules");
  const electronLocalesRoot = join(paths.unpackedRoot, "locales");
  const rootWebPackageRoot = join(appNodeModulesRoot, "@open-design", "web");
  return {
    builder: {
      asar: ELECTRON_BUILDER_ASAR,
      buildDependenciesFromSource: ELECTRON_BUILDER_BUILD_DEPENDENCIES_FROM_SOURCE,
      filePatterns: ELECTRON_BUILDER_FILE_PATTERNS,
      nativeRebuild: {
        buildFromSource: ELECTRON_BUILDER_BUILD_DEPENDENCIES_FROM_SOURCE,
        mode: ELECTRON_REBUILD_MODE,
        modules: ELECTRON_REBUILD_NATIVE_MODULES,
      },
      nodeGypRebuild: ELECTRON_BUILDER_NODE_GYP_REBUILD,
      npmRebuild: ELECTRON_BUILDER_NPM_REBUILD,
      targets: resolveWinTargets(config.to),
      webOutputMode: config.webOutputMode,
    },
    generatedAt: new Date().toISOString(),
    installerBytes: await sizeExistingFileBytes(paths.setupPath),
    outputRootBytes: await sizePathBytes(config.roots.output.namespaceRoot),
    resourceRootBytes: await sizePathBytes(paths.resourceRoot),
    runtimeNamespaceRoot: config.roots.runtime.namespaceRoot,
    topLevel: {
      appResourcesBytes: await sizePathBytes(join(appResourcesRoot, "app")),
      copiedStandaloneBytes: await sizePathBytes(copiedStandaloneRoot),
      electronLocalesBytes: await sizePathBytes(electronLocalesRoot),
      resourcesBytes: await sizePathBytes(appResourcesRoot),
    },
    tracked: {
      appNodeModulesBytes: await sizePathBytes(appNodeModulesRoot),
      betterSqlite3Bytes: await sizePathBytes(join(appNodeModulesRoot, "better-sqlite3")),
      betterSqlite3SourceResidueBytes: await sizePathBytes(paths.unpackedRoot, {
        includeFile: isBetterSqlite3SourceResidue,
      }),
      bundledNodeBytes: await sizePathBytes(join(paths.resourceRoot, "bin", "node.exe")),
      copiedStandaloneNextBytes:
        await sizePathBytes(join(copiedStandaloneNodeModulesRoot, "next")) +
        await sizePathBytes(join(copiedStandaloneWebNodeModulesRoot, "next")),
      copiedStandaloneNextSwcBytes:
        await sumChildDirectorySizes(join(copiedStandaloneNodeModulesRoot, "@next"), (name) => name.startsWith("swc-win32-")) +
        await sumChildDirectorySizes(join(copiedStandaloneWebNodeModulesRoot, "@next"), (name) => name.startsWith("swc-win32-")),
      copiedStandaloneNodeModulesBytes: await sizePathBytes(copiedStandaloneNodeModulesRoot),
      copiedStandalonePnpmHoistedNextBytes: await sizePathBytes(
        join(copiedStandaloneNodeModulesRoot, ".pnpm", "node_modules", "next"),
      ),
      copiedStandaloneSharpLibvipsBytes: await sizePathBytes(
        join(copiedStandaloneNodeModulesRoot, "@img", "sharp-libvips-win32-x64"),
      ),
      copiedStandaloneSourcemapBytes: await sizePathBytes(copiedStandaloneRoot, {
        includeFile: (path) => path.endsWith(".map"),
      }),
      copiedStandaloneTsbuildInfoBytes: await sizePathBytes(copiedStandaloneRoot, {
        includeFile: (path) => path.endsWith(".tsbuildinfo"),
      }),
      copiedStandaloneWebNextBytes: await sizePathBytes(join(copiedStandaloneWebNodeModulesRoot, "next")),
      copiedStandaloneWebNodeModulesBytes: await sizePathBytes(copiedStandaloneWebNodeModulesRoot),
      electronLocalesBytes: await sizePathBytes(electronLocalesRoot),
      markdownBytes: await sizePathBytes(paths.unpackedRoot, { includeFile: (path) => path.endsWith(".md") }),
      nextBytes: await sizePathBytes(join(appNodeModulesRoot, "next")),
      nextSwcBytes: await sumChildDirectorySizes(join(appNodeModulesRoot, "@next"), (name) => name.startsWith("swc-win32-")),
      sharpLibvipsBytes: await sizePathBytes(join(appNodeModulesRoot, "@img", "sharp-libvips-win32-x64")),
      sourcemapBytes: await sizePathBytes(paths.unpackedRoot, { includeFile: (path) => path.endsWith(".map") }),
      tsbuildInfoBytes: await sizePathBytes(paths.unpackedRoot, { includeFile: (path) => path.endsWith(".tsbuildinfo") }),
      webCopiedStandaloneBytes: await sizePathBytes(copiedStandaloneRoot),
      webNextCacheBytes: await sizePathBytes(join(rootWebPackageRoot, ".next", "cache")),
      webPackageAppBytes: await sizePathBytes(join(rootWebPackageRoot, "app")),
      webPackageBytes: await sizePathBytes(rootWebPackageRoot),
      webPackageDistBytes: await sizePathBytes(join(rootWebPackageRoot, "dist")),
      webPackagePublicBytes: await sizePathBytes(join(rootWebPackageRoot, "public")),
      webPackageSrcBytes: await sizePathBytes(join(rootWebPackageRoot, "src")),
      webPackageStandaloneBytes: await sizePathBytes(join(rootWebPackageRoot, ".next", "standalone")),
    },
    unpackedBytes: (await pathExists(paths.unpackedRoot)) ? await sizePathBytes(paths.unpackedRoot) : null,
  };
}

export async function packWin(config: ToolPackConfig): Promise<WinPackResult> {
  const paths = resolveWinPaths(config);
  const cache = new ToolPackCache(config.roots.cacheRoot);
  const timings: WinPackTiming[] = [];
  const runPhase = async <T>(phase: string, task: () => Promise<T>): Promise<T> => {
    const startedAt = Date.now();
    try {
      return await task();
    } finally {
      timings.push({ durationMs: Date.now() - startedAt, phase });
    }
  };

  await runPhase("workspace-build", async () => {
    await ensureWorkspaceBuildArtifacts(config, cache, async () => {
      await buildWorkspaceArtifacts(config);
    });
  });
  await runPhase("resource-tree", async () => {
    await copyResourceTree(config, paths, cache);
  });
  await runPhase("win-icon", async () => {
    await copyWinIcon(paths);
  });
  const tarballs = await runPhase("workspace-tarballs", async () => collectWorkspaceTarballs(config, paths, cache));
  const assembledApp = await runPhase("assembled-app", async () => writeAssembledApp(config, paths, tarballs, cache));
  const nativeRebuild = await runPhase("native-rebuild", async () => rebuildWinNativeDependencies(config, cache, assembledApp));
  const electronReadyApp = await runPhase("electron-ready-app", async () => prepareElectronReadyApp(assembledApp, nativeRebuild, cache));
  await runPhase("electron-builder", async () => {
    await runElectronBuilder(config, paths, electronReadyApp.appRoot);
  });
  await runPhase("latest-yml", async () => {
    await writeLocalLatestYml(config, paths);
  });
  const sizeReport = await runPhase("size-report", async () => collectWinSizeReport(config, paths));
  return {
    blockmapPath: (await pathExists(paths.blockmapPath)) ? paths.blockmapPath : null,
    installerPath: (await pathExists(paths.setupPath)) ? paths.setupPath : null,
    latestYmlPath: (await pathExists(paths.latestYmlPath)) ? paths.latestYmlPath : null,
    outputRoot: config.roots.output.namespaceRoot,
    resourceRoot: paths.resourceRoot,
    runtimeNamespaceRoot: config.roots.runtime.namespaceRoot,
    cacheReport: cache.report(),
    sizeReport,
    timings,
    to: config.to,
    unpackedPath: (await pathExists(paths.unpackedRoot)) ? paths.unpackedRoot : null,
    webStandaloneHookAuditPath: (await pathExists(paths.webStandaloneHookAuditPath)) ? paths.webStandaloneHookAuditPath : null,
  };
}
