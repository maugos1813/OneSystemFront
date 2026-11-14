#!/bin/bash
# Prepares the iOS project as the OneTrack app (bundle id com.onesystec.onetrack): the same website in its own wrapper that announces itself as
# "OneTrackApp", so the GPS sections are all there is. Run it before opening ios/App/App.xcodeproj in Xcode (Product → Archive) or archiving
# from the command line. The iOS project is OneTrack's alone: OneSystec has no iPhone app.
#
# `cap sync` rewrites ios/App/App/capacitor.config.json from the root capacitor.config.json (OneSystec's), so it is corrected afterwards.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build
npx cap sync ios
python3 - <<'PY'
import json
path = "ios/App/App/capacitor.config.json"
config = json.load(open(path))
config.update({"appId": "com.onesystec.onetrack", "appName": "OneTrack"})
config["ios"] = {**config.get("ios", {}), "appendUserAgent": "OneTrackApp"}
json.dump(config, open(path, "w"), indent="\t")
open(path, "a").write("\n")
print("OneTrack iOS config:", config["appId"], config["ios"])
PY
