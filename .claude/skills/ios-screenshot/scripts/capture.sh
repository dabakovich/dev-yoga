#!/usr/bin/env bash
#
# capture.sh — grab a screenshot of the booted iOS Simulator for visual feedback.
#
# Usage:
#   capture.sh [deep-link] [--udid <id>]
#
#   deep-link   Optional. A devyoga:// URL to navigate to BEFORE capturing,
#               e.g. devyoga:///new. Opens it via simctl, then waits for the
#               transition to settle.
#   --udid <id> Optional. Target a specific simulator UDID. Defaults to "booted"
#               (the single booted device). Required when more than one is booted.
#
# Prints the absolute path of the saved PNG on stdout. That path is the only thing
# the agent needs — Read it to bring the image into context.
#
# Exit codes: 0 ok, 1 no booted sim, 2 ambiguous (multiple booted, no --udid),
#             3 capture failed.

set -euo pipefail

# --- locate repo root (this script lives at .claude/skills/ios-screenshot/scripts/) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SHOT_DIR="$REPO_ROOT/mobile/.screenshots"

# --- parse args ---
DEEPLINK=""
TARGET="booted"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --udid)
      TARGET="${2:-}"
      [[ -z "$TARGET" ]] && { echo "error: --udid needs a value" >&2; exit 2; }
      shift 2
      ;;
    devyoga://*|http://*|https://*)
      DEEPLINK="$1"
      shift
      ;;
    *)
      echo "error: unrecognized argument '$1' (expected a deep link or --udid <id>)" >&2
      exit 2
      ;;
  esac
done

# --- inspect booted simulators ---
# `simctl list devices booted` prints lines like:
#   iPhone 17 (UDID) (Booted)
BOOTED="$(xcrun simctl list devices booted | grep -E '\(Booted\)' || true)"
COUNT="$(printf '%s\n' "$BOOTED" | grep -c '(Booted)' || true)"

if [[ -z "$BOOTED" || "$COUNT" -eq 0 ]]; then
  echo "error: no booted iOS Simulator." >&2
  echo "hint: boot one and launch the dev build →  cd mobile && npm run ios" >&2
  exit 1
fi

if [[ "$COUNT" -gt 1 && "$TARGET" == "booted" ]]; then
  echo "error: multiple booted simulators — pass --udid <id> to pick one:" >&2
  printf '%s\n' "$BOOTED" >&2
  exit 2
fi

# --- optional deep-link navigation ---
if [[ -n "$DEEPLINK" ]]; then
  xcrun simctl openurl "$TARGET" "$DEEPLINK" >/dev/null
  sleep 1.2   # let the navigation transition settle before the shot
fi

# --- capture ---
mkdir -p "$SHOT_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$SHOT_DIR/$STAMP.png"

if ! xcrun simctl io "$TARGET" screenshot "$OUT" >/dev/null 2>&1; then
  echo "error: screenshot capture failed for target '$TARGET'." >&2
  exit 3
fi

echo "$OUT"
