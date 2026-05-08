#!/usr/bin/env bash
set -euo pipefail

for name in BASE_VERSION ENABLE_LINUX ENABLE_MAC ENABLE_WIN GITHUB_STEP_SUMMARY RELEASE_CHANNEL RELEASE_SIGNED RELEASE_VERSION STATE_SOURCE; do
  if [ -z "${!name:-}" ]; then
    echo "$name is required" >&2
    exit 1
  fi
done

node --input-type=module <<'NODE' >> "$GITHUB_STEP_SUMMARY"
const env = process.env;
const enabled = (name) => env[name] === "true";
const optional = (name) => {
  const value = env[name];
  return value == null || value.length === 0 ? null : value;
};

const reportUrl = optional("R2_REPORT_URL");
const platformReport = (platform) => reportUrl == null ? null : {
  manifest: `${reportUrl}${platform}/manifest.json`,
  screenshot: `${reportUrl}${platform}/screenshots/open-design-${platform}-smoke.png`,
  vitestLog: `${reportUrl}${platform}/vitest.log`,
};

const platforms = {
  mac: {
    enabled: enabled("ENABLE_MAC"),
    signed: env.RELEASE_SIGNED === "true",
  },
  win: {
    enabled: enabled("ENABLE_WIN"),
    signed: false,
  },
  linux: {
    enabled: enabled("ENABLE_LINUX"),
    signed: false,
  },
};

if (platforms.mac.enabled) {
  platforms.mac.artifacts = {
    dmg: optional("R2_MAC_DMG_URL"),
    zip: optional("R2_MAC_ZIP_URL"),
  };
  platforms.mac.feed = optional("R2_MAC_FEED_URL");
  platforms.mac.e2e = platformReport("mac");
}
if (platforms.win.enabled) {
  platforms.win.artifacts = {
    installer: optional("R2_WIN_INSTALLER_URL"),
  };
  platforms.win.feed = optional("R2_WIN_FEED_URL");
  platforms.win.e2e = platformReport("win");
}
if (platforms.linux.enabled) {
  platforms.linux.artifacts = {
    appImage: optional("R2_LINUX_APPIMAGE_URL"),
  };
  platforms.linux.feed = null;
}

const githubReleaseEnabled = env.GITHUB_RELEASE_ENABLED === "true";
const versionTag = optional("VERSION_TAG");
const summary = {
  schemaVersion: 1,
  channel: env.RELEASE_CHANNEL,
  version: env.RELEASE_VERSION,
  baseVersion: env.BASE_VERSION,
  stateSource: env.STATE_SOURCE,
  r2: {
    versionPrefix: optional("R2_VERSION_PREFIX"),
    metadataUrl: optional("R2_METADATA_URL"),
    versionMetadataUrl: optional("R2_VERSION_METADATA_URL"),
    reportUrl,
  },
  platforms,
  github: {
    release: {
      enabled: githubReleaseEnabled,
      tag: githubReleaseEnabled ? versionTag : null,
    },
    tag: {
      enabled: githubReleaseEnabled,
      name: githubReleaseEnabled ? versionTag : null,
    },
  },
};

if (env.RELEASE_CHANNEL === "nightly") {
  summary.nightlyNumber = Number(env.NIGHTLY_NUMBER);
}

console.log(`## ${env.RELEASE_CHANNEL} release`);
console.log("");
console.log("```json");
console.log(JSON.stringify(summary, null, 2));
console.log("```");
NODE
