import { execFile as execFileCallback } from "node:child_process";
import { appendFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { get as httpsGet } from "node:https";
import { join } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const stableVersionPattern = /^(\d+)\.(\d+)\.(\d+)$/;
const stableReleaseBranchPattern = /^release\/v(\d+\.\d+\.\d+)$/;
const stableTagPattern = /^open-design-v(\d+\.\d+\.\d+)$/;
const nightlyVersionPattern = /^(\d+\.\d+\.\d+)\.nightly\.(\d+)$/;

type ReleaseChannel = "nightly" | "stable";

type GitHubRelease = {
  draft?: boolean;
  name?: string | null;
  prerelease?: boolean;
  tag_name?: string;
};

type ParsedStableVersion = {
  parsed: [number, number, number];
  value: string;
};

type ParsedNightlyVersion = {
  baseVersion: string;
  nightlyNumber: number;
  nightlyVersion: string;
};

type ParsedNightlyMetadata = ParsedNightlyVersion & {
  source: "metadata-json";
};

function fail(message: string): never {
  console.error(`[release-stable] ${message}`);
  process.exit(1);
}

function parseChannel(value: string | undefined): ReleaseChannel {
  if (value == null || value.length === 0 || value === "stable") return "stable";
  if (value === "nightly") return "nightly";
  fail(`OPEN_DESIGN_RELEASE_CHANNEL must be stable or nightly; got ${value}`);
}

function parseStableVersion(value: string): [number, number, number] | null {
  const match = stableVersionPattern.exec(value);
  if (match == null) return null;

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(left: [number, number, number], right: [number, number, number]): number {
  const [leftMajor, leftMinor, leftPatch] = left;
  const [rightMajor, rightMinor, rightPatch] = right;
  const pairs = [
    [leftMajor, rightMajor],
    [leftMinor, rightMinor],
    [leftPatch, rightPatch],
  ] as const;

  for (const [leftPart, rightPart] of pairs) {
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}

function extractStableVersion(release: GitHubRelease): ParsedStableVersion | null {
  const candidates = [release.tag_name, release.name].filter((value): value is string => typeof value === "string");

  for (const candidate of candidates) {
    const tagMatch = stableTagPattern.exec(candidate);
    const value = tagMatch?.[1] ?? candidate.match(/\b(\d+\.\d+\.\d+)\b/)?.[1];
    if (value == null) continue;

    const parsed = parseStableVersion(value);
    if (parsed != null) return { parsed, value };
  }

  return null;
}

function parseNightlyParts(baseVersion: string, nightlyNumber: string): ParsedNightlyVersion {
  const parsedNightlyNumber = Number(nightlyNumber);
  if (!Number.isSafeInteger(parsedNightlyNumber) || parsedNightlyNumber < 1) {
    fail(`invalid nightly number in latest nightly metadata: ${nightlyNumber}`);
  }

  return {
    baseVersion,
    nightlyNumber: parsedNightlyNumber,
    nightlyVersion: `${baseVersion}.nightly.${nightlyNumber}`,
  };
}

function readStringField(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumberField(record: Record<string, unknown>, field: string): number | null {
  const value = record[field];
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function parseNightlyVersion(value: string, sourceName: string): ParsedNightlyVersion {
  const match = nightlyVersionPattern.exec(value);
  if (match?.[1] == null || match[2] == null) {
    fail(`${sourceName} nightlyVersion must be x.y.z.nightly.N; got ${value}`);
  }
  return parseNightlyParts(match[1], match[2]);
}

function parseNightlyMetadataJson(value: string): ParsedNightlyMetadata {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    fail(`R2 nightly metadata.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (typeof parsed !== "object" || parsed == null || Array.isArray(parsed)) {
    fail("R2 nightly metadata.json must be a JSON object");
  }

  const record = parsed as Record<string, unknown>;
  const nightlyVersion = readStringField(record, "nightlyVersion");
  const nightlyNumber = readNumberField(record, "nightlyNumber");
  const baseVersion = readStringField(record, "baseVersion");

  if (nightlyVersion != null) {
    const nightly = parseNightlyVersion(nightlyVersion, "R2 nightly metadata.json");
    if (baseVersion != null && baseVersion !== nightly.baseVersion) {
      fail(`R2 nightly metadata.json baseVersion ${baseVersion} does not match nightlyVersion ${nightly.nightlyVersion}`);
    }
    if (nightlyNumber != null && nightlyNumber !== nightly.nightlyNumber) {
      fail(`R2 nightly metadata.json nightlyNumber ${nightlyNumber} does not match nightlyVersion ${nightly.nightlyVersion}`);
    }
    return { ...nightly, source: "metadata-json" };
  }

  if (baseVersion == null || nightlyNumber == null) {
    fail("R2 nightly metadata.json must include nightlyVersion or baseVersion+nightlyNumber");
  }

  const parsedBase = parseStableVersion(baseVersion);
  if (parsedBase == null) {
    fail(`R2 nightly metadata.json baseVersion must be x.y.z; got ${baseVersion}`);
  }

  return { ...parseNightlyParts(baseVersion, String(nightlyNumber)), source: "metadata-json" };
}

async function readPackagedVersion(): Promise<string> {
  const packageJsonPath = join(process.cwd(), "apps", "packaged", "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { version?: unknown };

  if (typeof packageJson.version !== "string") {
    fail(`missing version in ${packageJsonPath}`);
  }

  if (!stableVersionPattern.test(packageJson.version)) {
    fail(`apps/packaged/package.json version must be a stable x.y.z base version; got ${packageJson.version}`);
  }

  return packageJson.version;
}

async function fetchReleases(repository: string): Promise<GitHubRelease[]> {
  const releases: GitHubRelease[] = [];
  for (let page = 1; ; page += 1) {
    const { stdout } = await execFile("gh", ["api", `repos/${repository}/releases?per_page=100&page=${page}`]);
    const batch = JSON.parse(stdout) as GitHubRelease[];
    if (batch.length === 0) break;
    releases.push(...batch);
  }
  return releases;
}

function fetchOptionalHttpsText(url: string, redirectCount = 0): Promise<string | null> {
  return new Promise((resolvePromise, reject) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      reject(new Error(`expected HTTPS URL for nightly feed lookup: ${parsed.protocol}`));
      return;
    }

    const request = httpsGet(
      parsed,
      {
        headers: {
          "Cache-Control": "no-cache",
        },
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode === 404) {
          response.resume();
          resolvePromise(null);
          return;
        }

        const location = response.headers.location;
        if (statusCode >= 300 && statusCode < 400 && typeof location === "string") {
          response.resume();
          if (redirectCount >= 3) {
            reject(new Error("too many redirects while reading nightly feed"));
            return;
          }
          const nextUrl = new URL(location, parsed).toString();
          fetchOptionalHttpsText(nextUrl, redirectCount + 1).then(resolvePromise, reject);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`nightly feed request failed with HTTP ${statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolvePromise(Buffer.concat(chunks).toString("utf8"));
        });
      },
    );

    request.setTimeout(10_000, () => {
      request.destroy(new Error("timed out while reading nightly feed"));
    });
    request.on("error", reject);
  });
}

function validateHttpsUrl(value: string, name: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${name} must be an HTTPS URL; got ${value}`);
  }

  if (parsed.protocol !== "https:") {
    fail(`${name} must be an HTTPS URL; got ${value}`);
  }
}

function setOutput(name: string, value: string): void {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath == null || outputPath.length === 0) return;
  appendFileSync(outputPath, `${name}=${value}\n`);
}

const repository = process.env.GITHUB_REPOSITORY ?? fail("GITHUB_REPOSITORY is required");
const channel = parseChannel(process.env.OPEN_DESIGN_RELEASE_CHANNEL);
const packagedVersion = await readPackagedVersion();
const packagedParsed = parseStableVersion(packagedVersion) ?? fail(`invalid packaged version: ${packagedVersion}`);
const branch = process.env.GITHUB_REF_NAME ?? "";
const branchMatch = stableReleaseBranchPattern.exec(branch);
if (branchMatch?.[1] == null) {
  fail(`release-stable can only run from release/vX.Y.Z branches; got ${branch || "(empty)"}`);
}
const branchVersion = branchMatch[1];
if (branchVersion !== packagedVersion) {
  fail(`release branch version ${branchVersion} must match apps/packaged/package.json version ${packagedVersion}`);
}

const releases = await fetchReleases(repository);
const versionTag = `open-design-v${packagedVersion}`;

let latestStable: ParsedStableVersion | null = null;
for (const release of releases) {
  if (release.draft === true || release.prerelease === true) continue;

  const parsedRelease = extractStableVersion(release);
  if (parsedRelease == null) continue;

  if (release.tag_name === versionTag) {
    fail(`stable release ${versionTag} already exists; bump apps/packaged/package.json before publishing`);
  }

  if (latestStable == null || compareVersions(parsedRelease.parsed, latestStable.parsed) > 0) {
    latestStable = parsedRelease;
  }
}

if (latestStable != null && compareVersions(packagedParsed, latestStable.parsed) <= 0) {
  fail(`packaged stable version ${packagedVersion} must be strictly greater than latest stable ${latestStable.value}`);
}

let releaseVersion = packagedVersion;
let releaseName = `Open Design ${packagedVersion}`;
let nightlyNumber = "";
let stateSource = channel === "nightly" ? "R2 metadata.json" : "GitHub Releases";

if (channel === "nightly") {
  const metadataUrl = process.env.OPEN_DESIGN_NIGHTLY_METADATA_URL;
  if (metadataUrl == null || metadataUrl.length === 0) {
    fail("OPEN_DESIGN_NIGHTLY_METADATA_URL is required for nightly channel");
  }
  validateHttpsUrl(metadataUrl, "OPEN_DESIGN_NIGHTLY_METADATA_URL");

  let nextNightlyNumber = 1;
  let latestNightly: ParsedNightlyVersion | null = null;
  const latestMetadataJson = await fetchOptionalHttpsText(metadataUrl);
  if (latestMetadataJson == null) {
    latestNightly = {
      baseVersion: packagedVersion,
      nightlyNumber: 0,
      nightlyVersion: `${packagedVersion}.nightly.0`,
    };
    stateSource = "missing R2 metadata.json fallback nightly.0";
    console.log("[release-stable] R2 nightly metadata.json: not found; using nightly.0 fallback");
  } else {
    latestNightly = parseNightlyMetadataJson(latestMetadataJson);
    console.log(`[release-stable] R2 nightly metadata.json version: ${latestNightly.nightlyVersion}`);
  }

  const existingBase = parseStableVersion(latestNightly.baseVersion);
  if (existingBase == null) {
    fail(`invalid nightly base version in ${stateSource}: ${latestNightly.baseVersion}`);
  }

  const ordering = compareVersions(packagedParsed, existingBase);
  if (ordering < 0) {
    fail(`packaged base version ${packagedVersion} regressed below current nightly base version ${latestNightly.baseVersion}`);
  }
  if (ordering === 0) {
    nextNightlyNumber = latestNightly.nightlyNumber + 1;
  }

  nightlyNumber = String(nextNightlyNumber);
  releaseVersion = `${packagedVersion}.nightly.${nightlyNumber}`;
  releaseName = `Open Design Nightly ${releaseVersion}`;
  console.log(`[release-stable] latest nightly: ${latestNightly.nightlyVersion}`);
}

const commit = process.env.GITHUB_SHA ?? "";

console.log(`[release-stable] channel: ${channel}`);
console.log(`[release-stable] base version: ${packagedVersion}`);
console.log(`[release-stable] release version: ${releaseVersion}`);
if (channel === "stable") console.log(`[release-stable] version tag: ${versionTag}`);
console.log(`[release-stable] state source: ${stateSource}`);
if (latestStable != null) console.log(`[release-stable] previous stable: ${latestStable.value}`);

setOutput("base_version", packagedVersion);
setOutput("branch", branch);
setOutput("channel", channel);
setOutput("commit", commit);
setOutput("github_release_enabled", channel === "stable" ? "true" : "false");
setOutput("nightly_number", nightlyNumber);
setOutput("previous_stable", latestStable?.value ?? "");
setOutput("release_name", releaseName);
setOutput("release_version", releaseVersion);
setOutput("stable_version", packagedVersion);
setOutput("state_source", stateSource);
setOutput("version_tag", channel === "stable" ? versionTag : "");
