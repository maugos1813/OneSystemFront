#!/bin/bash
# Publishes a new Android app. Only needed when something NATIVE changes (a plugin, a permission, the icon):
# everything else is the website, which the app loads live, so it updates by itself with each deploy.
#
#   scripts/release-android.sh <versionName> <versionCode> "what changed"
#   e.g. scripts/release-android.sh 1.2 3 "Nuevo icono y notificaciones mejoradas"
#
# versionCode must be higher than the last release's. It builds a signed release APK (needs android/keystore.properties and
# android/app/google-services.json on this machine), copies it to public/downloads/ and rewrites public/android-latest.json.
# Commit and push both files: Vercel publishes them, and every installed app then offers the update in the bell
# and in Configuración → Aplicación Android.
set -euo pipefail

NAME="${1:?versionName required, e.g. 1.2}"
CODE="${2:?versionCode required, e.g. 3}"
NOTES="${3:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PREVIOUS="$(python3 -c "import json;print(json.load(open('public/android-latest.json'))['versionCode'])" 2>/dev/null || echo 0)"
if [ "$CODE" -le "$PREVIOUS" ]; then
  echo "versionCode $CODE must be higher than the published $PREVIOUS" >&2
  exit 1
fi
[ -f android/keystore.properties ] || { echo "android/keystore.properties is missing: without the signing key an app cannot update over the old one" >&2; exit 1; }
[ -f android/app/google-services.json ] || { echo "android/app/google-services.json is missing (push notifications would not work)" >&2; exit 1; }

export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

printf 'VERSION_CODE=%s\nVERSION_NAME=%s\n' "$CODE" "$NAME" > android/version.properties
npx cap sync android
(cd android && ./gradlew assembleRelease --no-daemon)

APK="android/app/build/outputs/apk/release/app-release.apk"
[ -f "$APK" ] || { echo "the release APK was not produced (is it signed?)" >&2; exit 1; }
BUILD_TOOLS="$(ls -d "$ANDROID_HOME"/build-tools/*/ | sort -V | tail -1)"
"${BUILD_TOOLS}apksigner" verify "$APK" >/dev/null

mkdir -p public/downloads
cp "$APK" public/downloads/OneSystec.apk
python3 - "$NAME" "$CODE" "$NOTES" <<'PY'
import json, sys
name, code, notes = sys.argv[1], int(sys.argv[2]), sys.argv[3]
json.dump({"versionCode": code, "versionName": name, "url": "/downloads/OneSystec.apk", "notes": notes or None},
          open("public/android-latest.json", "w"), ensure_ascii=False, indent=2)
open("public/android-latest.json", "a").write("\n")
PY
echo "Published OneSystec $NAME ($CODE): public/downloads/OneSystec.apk and public/android-latest.json"
