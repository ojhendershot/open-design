#!/usr/bin/env bash
set -euo pipefail

for name in CLOUDFLARE_R2_RELEASES_PUBLIC_ORIGIN RELEASE_CHANNEL RELEASE_VERSION RUNNER_TEMP TOOLS_PACK_NAMESPACE; do
  if [ -z "${!name:-}" ]; then
    echo "$name is required" >&2
    exit 1
  fi
done

asset_suffix="${ASSET_VERSION_SUFFIX:-}"
release_dir="$RUNNER_TEMP/release-assets"
mkdir -p "$release_dir"

source_dmg="$RUNNER_TEMP/tools-pack/out/mac/namespaces/$TOOLS_PACK_NAMESPACE/dmg/Open Design-$TOOLS_PACK_NAMESPACE.dmg"
source_zip="$RUNNER_TEMP/tools-pack/out/mac/namespaces/$TOOLS_PACK_NAMESPACE/zip/Open Design-$TOOLS_PACK_NAMESPACE.zip"
if [ ! -f "$source_dmg" ]; then
  echo "expected dmg not found at $source_dmg" >&2
  exit 1
fi
if [ ! -f "$source_zip" ]; then
  echo "expected zip not found at $source_zip" >&2
  exit 1
fi

versioned_dmg="open-design-${RELEASE_VERSION}${asset_suffix}-mac-arm64.dmg"
versioned_zip="open-design-${RELEASE_VERSION}${asset_suffix}-mac-arm64.zip"
dmg_checksum_file="$versioned_dmg.sha256"
zip_checksum_file="$versioned_zip.sha256"

cp "$source_dmg" "$release_dir/$versioned_dmg"
cp "$source_zip" "$release_dir/$versioned_zip"
(
  cd "$release_dir"
  shasum -a 256 "$versioned_dmg" > "$dmg_checksum_file"
  shasum -a 256 "$versioned_zip" > "$zip_checksum_file"
)

zip_sha512="$(openssl dgst -sha512 -binary "$release_dir/$versioned_zip" | openssl base64 -A)"
zip_size="$(stat -f%z "$release_dir/$versioned_zip")"
public_origin="${CLOUDFLARE_R2_RELEASES_PUBLIC_ORIGIN%/}"
version_prefix="${RELEASE_VERSION_PREFIX:-$RELEASE_CHANNEL/versions/$RELEASE_VERSION$asset_suffix}"
zip_url="$public_origin/$version_prefix/$versioned_zip"
release_date="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
release_notes="${RELEASE_NOTES:-Open Design $RELEASE_VERSION$asset_suffix}"
cat > "$release_dir/latest-mac.yml" <<EOF
version: "$RELEASE_VERSION"
files:
  - url: "$zip_url"
    sha512: "$zip_sha512"
    size: $zip_size
path: "$zip_url"
sha512: "$zip_sha512"
releaseDate: "$release_date"
releaseNotes: "$release_notes"
EOF
