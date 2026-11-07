#!/usr/bin/env bash
# Owned by the android agent. Called via ./project android <cmd>.
# Everything runs inside the devcontainer image via `indev` (exported by ./project).
set -euo pipefail
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

if ! declare -F indev >/dev/null; then
  # Called directly instead of via ./project: borrow indev from there.
  # shellcheck disable=SC1090
  source <(sed -n '/^IMAGE=/p;/^indev()/,/^}/p' "$ROOT/project")
  export ROOT
fi

GRADLE="cd /workspace/android && ./gradlew --no-daemon --console=plain"
APK_SRC="/workspace/android/app/build/outputs/apk/debug/app-debug.apk"
APK_DST="build/disroop-sensor-playground-debug.apk"

usage() {
  cat <<U
Usage: ./project android <command>

  test     unit tests (:protocol, :app incl. simulator smoke test) + Android lint
  build    assembleDebug -> $APK_DST
  screenshots  render the UI (simulator data) via Roborazzi/Robolectric -> docs/img/android-*.png
  badging  print package/permission/activity summary of the built APK (aapt2)
  clean    remove Gradle build outputs
U
}

# The Tennis game is bundled into the APK as assets (tennis/dist).
tennis_dist() { "$ROOT/scripts/tennis.sh" build; }

cmd="${1:-help}"
case "$cmd" in
  test)
    tennis_dist
    indev "$GRADLE test :app:lintDebug"
    ;;
  build)
    tennis_dist
    indev "$GRADLE :app:assembleDebug && mkdir -p /workspace/build && cp $APK_SRC /workspace/$APK_DST"
    ls -l "$ROOT/$APK_DST"
    ;;
  screenshots)
    rm -rf "$ROOT/android/app/build/screenshots"
    indev "$GRADLE -Pscreenshots :app:testDebugUnitTest && cp app/build/screenshots/android-*.png /workspace/docs/img/"
    ls -l "$ROOT"/docs/img/android-*.png
    ;;
  badging)
    indev "/opt/android-sdk/build-tools/*/aapt2 dump badging /workspace/$APK_DST | grep -E '^(package|minSdkVersion|targetSdkVersion|application-label:|launchable-activity|uses-permission|uses-feature)'"
    ;;
  clean)
    indev "$GRADLE clean" && rm -f "$ROOT/$APK_DST"
    ;;
  help|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
