#!/usr/bin/env bash
#
# run-flow.sh — drive the DevYoga dev build on the booted iOS Simulator with a
# Maestro flow, then surface the screenshots + pass/fail so the agent can Read
# them back. This is the *action* half of the loop (ios-screenshot is the glance).
#
# Usage:
#   run-flow.sh <flow.yaml> [--udid <id>]
#
#   flow.yaml   Required. Path to a Maestro flow (absolute or relative to CWD).
#               Use the curated ones under flows/, or write an ad-hoc flow into
#               the gitignored scratch dir (mobile/.maestro/) and pass it here.
#   --udid <id> Optional. Target a specific simulator UDID. Defaults to the single
#               booted device. Required when more than one simulator is booted.
#
# Each run gets a timestamped dir under mobile/.maestro-artifacts/<stamp>/:
#   - any `takeScreenshot: name` step lands there as name.png (we cd into it),
#   - --debug-output captures the view hierarchy + command log under debug/.
# The script prints the run dir and every PNG path on stdout — Read those to bring
# the screens into context, exactly like ios-screenshot's capture.sh.
#
# Exit codes: 0 ok, 1 no booted sim, 2 ambiguous/bad args, 3 flow failed,
#             4 maestro not installed.

set -euo pipefail

# Maestro installs to ~/.maestro/bin; make sure it's reachable even if the
# calling shell didn't source it.
export PATH="$PATH:$HOME/.maestro/bin"
export MAESTRO_CLI_NO_ANALYTICS=1

# --- locate repo root (this script lives at mobile/e2e/scripts/) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ARTIFACT_ROOT="$REPO_ROOT/mobile/.maestro-artifacts"

# --- parse args ---
FLOW=""
UDID=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --udid)
      UDID="${2:-}"
      [[ -z "$UDID" ]] && { echo "error: --udid needs a value" >&2; exit 2; }
      shift 2
      ;;
    -*)
      echo "error: unrecognized option '$1'" >&2; exit 2
      ;;
    *)
      [[ -n "$FLOW" ]] && { echo "error: more than one flow path given" >&2; exit 2; }
      FLOW="$1"
      shift
      ;;
  esac
done

if [[ -z "$FLOW" ]]; then
  echo "usage: run-flow.sh <flow.yaml> [--udid <id>]" >&2
  exit 2
fi
if [[ ! -f "$FLOW" ]]; then
  echo "error: flow file not found: $FLOW" >&2
  exit 2
fi
FLOW="$(cd "$(dirname "$FLOW")" && pwd)/$(basename "$FLOW")"   # absolutize

# --- maestro present? ---
if ! command -v maestro >/dev/null 2>&1; then
  echo "error: maestro is not installed." >&2
  echo 'hint: install it →  curl -fsSL "https://get.maestro.mobile.dev" | bash' >&2
  exit 4
fi

# --- resolve target device (Maestro --device wants a real UDID) ---
# `simctl list devices booted` prints lines like:  iPhone 17 (UDID) (Booted)
BOOTED="$(xcrun simctl list devices booted | grep -E '\(Booted\)' || true)"
COUNT="$(printf '%s\n' "$BOOTED" | grep -c '(Booted)' || true)"

if [[ -z "$BOOTED" || "$COUNT" -eq 0 ]]; then
  echo "error: no booted iOS Simulator." >&2
  echo "hint: boot one and launch the dev build →  cd mobile && npm run ios" >&2
  exit 1
fi

if [[ -z "$UDID" ]]; then
  if [[ "$COUNT" -gt 1 ]]; then
    echo "error: multiple booted simulators — pass --udid <id> to pick one:" >&2
    printf '%s\n' "$BOOTED" >&2
    exit 2
  fi
  # Extract the UDID from the single booted line: text in the LAST "(...)" before "(Booted)".
  UDID="$(printf '%s\n' "$BOOTED" | sed -E 's/.*\(([0-9A-Fa-f-]{36})\) \(Booted\).*/\1/')"
fi

# --- run ---
STAMP="$(date -u +%Y%m%d-%H%M%S)"
RUN_DIR="$ARTIFACT_ROOT/$STAMP"
mkdir -p "$RUN_DIR/debug"

echo "→ running $(basename "$FLOW") on $UDID" >&2

set +e
( cd "$RUN_DIR" && maestro --device "$UDID" test --debug-output "$RUN_DIR/debug" "$FLOW" )
STATUS=$?
set -e

# --- report ---
echo ""
echo "run dir: $RUN_DIR"
SHOTS="$(find "$RUN_DIR" -maxdepth 2 -name '*.png' | sort || true)"
if [[ -n "$SHOTS" ]]; then
  echo "screenshots (Read these):"
  printf '%s\n' "$SHOTS"
else
  echo "screenshots: none captured (add 'takeScreenshot: name' steps to the flow)"
fi
echo "view hierarchy + logs: $RUN_DIR/debug"

if [[ "$STATUS" -eq 0 ]]; then
  echo "result: PASS"
  exit 0
else
  echo "result: FAIL (maestro exit $STATUS) — see the debug hierarchy to find the missing selector" >&2
  exit 3
fi
