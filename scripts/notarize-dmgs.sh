#!/bin/sh
# Notarize and staple each dmg electron-builder made for the current version.
# electron-builder 24 notarizes only the .app inside, but the dmg is the file
# people download, so it needs its own ticket to pass Gatekeeper.
# Needs APPLE_API_KEY (path to the .p8), APPLE_API_KEY_ID and APPLE_API_ISSUER.
set -eu

: "${APPLE_API_KEY:?path to the App Store Connect .p8 key}"
: "${APPLE_API_KEY_ID:?App Store Connect key ID}"
: "${APPLE_API_ISSUER:?App Store Connect issuer ID}"

version=$(node -p "require('./package.json').version")

for dmg in "dist-electron/Lightz-$version-arm64.dmg" "dist-electron/Lightz-$version.dmg"; do
  if [ ! -f "$dmg" ]; then
    echo "missing $dmg" >&2
    exit 1
  fi
  echo "notarizing $dmg"
  xcrun notarytool submit "$dmg" \
    --key "$APPLE_API_KEY" --key-id "$APPLE_API_KEY_ID" --issuer "$APPLE_API_ISSUER" \
    --wait
  xcrun stapler staple "$dmg"
done
