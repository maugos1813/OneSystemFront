#!/bin/bash
# Publishes a new Android app. Only needed when something NATIVE changes (a plugin, a permission, the icon):
# everything else is the website, which the apps load live, so they update by themselves with each deploy.
#
# Two apps come out of this project (android flavors), both loading the same website:
#   OneSystec (default): the whole workspace.     OneTrack (APP=onetrack): only the GPS sections.
#
#   scripts/release-android.sh <versionName> <versionCode> "what changed"
#   APP=onetrack scripts/release-android.sh 1.0 1 "Primera versión de OneTrack"
#
# versionCode must be higher than the last release of that app. It builds a signed release APK (needs
# android/keystore.properties and android/app/google-services.json on this machine), copies it to public/downloads/ and
# rewrites that app's release file (public/android-latest.json, or android-onetrack-latest.json). Commit and push both
# files: Vercel publishes them, and every installed app then offers the update in the bell.
set -euo pipefail

APP="${APP:-onesystec}"
NAME="${1:?versionName required, e.g. 1.2}"
CODE="${2:?versionCode required, e.g. 3}"
NOTES="${3:-}"

case "$APP" in
  onesystec) PREFIX=""; FILE="OneSystec"; MANIFEST="android-latest.json"; FLAVOR="onesystec"; TASK="assembleOnesystecRelease" ;;
  onetrack) PREFIX="ONETRACK_"; FILE="OneTrack"; MANIFEST="android-onetrack-latest.json"; FLAVOR="onetrack"; TASK="assembleOnetrackRelease" ;;
  *) echo "APP must be onesystec or onetrack" >&2; exit 1 ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PREVIOUS="$(python3 -c "import json;print(json.load(open('public/$MANIFEST'))['versionCode'])" 2>/dev/null || echo 0)"
if [ "$CODE" -le "$PREVIOUS" ]; then
  echo "versionCode $CODE must be higher than the published $PREVIOUS" >&2
  exit 1
fi
[ -f android/keystore.properties ] || { echo "android/keystore.properties is missing: without the signing key an app cannot update over the old one" >&2; exit 1; }
[ -f android/app/google-services.json ] || { echo "android/app/google-services.json is missing (push notifications would not work)" >&2; exit 1; }

export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

# The version of this app only: the other one keeps its own line in version.properties.
python3 - "$PREFIX" "$NAME" "$CODE" <<'PY'
import sys
prefix, name, code = sys.argv[1:]
path = "android/version.properties"
props = dict(line.strip().split("=", 1) for line in open(path) if "=" in line)
props[prefix + "VERSION_CODE"], props[prefix + "VERSION_NAME"] = code, name
open(path, "w").write("".join(f"{k}={v}\n" for k, v in props.items()))
PY

if [ "$APP" = onetrack ]; then
  # OneTrack tells the website who it is; without its package in google-services.json it also says push is not there.
  python3 - <<'PY'
import json
packages = [c["client_info"]["android_client_info"]["package_name"] for c in json.load(open("android/app/google-services.json"))["client"]]
agent = "OneTrackApp" + ("" if "com.onetrack.app" in packages else " NoPush")
config = {
    "appId": "com.onetrack.app", "appName": "OneTrack", "webDir": "dist",
    "server": {"url": "https://one-system-front-two.vercel.app", "cleartext": False},
    "android": {"allowMixedContent": False, "appendUserAgent": agent},
}
json.dump(config, open("android/app/src/onetrack/assets/capacitor.config.json", "w"), indent="\t")
open("android/app/src/onetrack/assets/capacitor.config.json", "a").write("\n")
print("OneTrack user agent:", agent)
PY
fi

npx cap sync android
(cd android && ./gradlew "$TASK" --no-daemon)

APK="android/app/build/outputs/apk/$FLAVOR/release/app-$FLAVOR-release.apk"
[ -f "$APK" ] || { echo "the release APK was not produced (is it signed?)" >&2; exit 1; }
BUILD_TOOLS="$(ls -d "$ANDROID_HOME"/build-tools/*/ | sort -V | tail -1)"
"${BUILD_TOOLS}apksigner" verify "$APK" >/dev/null

mkdir -p public/downloads
cp "$APK" "public/downloads/$FILE.apk"
python3 - "$NAME" "$CODE" "$NOTES" "$FILE" "$MANIFEST" <<'PY'
import json, sys
name, code, notes, file, manifest = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
path = f"public/{manifest}"
json.dump({"versionCode": code, "versionName": name, "url": f"/downloads/{file}.apk", "notes": notes or None},
          open(path, "w"), ensure_ascii=False, indent=2)
open(path, "a").write("\n")
PY
echo "Published $FILE $NAME ($CODE): public/downloads/$FILE.apk and public/$MANIFEST"
