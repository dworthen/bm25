#!/usr/bin/env bash
# Resolve the bm25 CLI path, installing it via the gh CLI if needed.
#
# Usage:
#   resolve-bm25.sh [--help]
#
# Behavior (stops at first success):
#   1. If `bm25` is on PATH, print `bm25`.
#   2. Else if ~/.bm25/bin/bm25 exists, print its absolute path.
#   3. Else require `gh`; if missing, error and exit 2.
#   4. Else run the published install script via gh, then verify
#      ~/.bm25/bin/bm25 and print it, or exit 3 if not produced.
#
# Output: resolved path on stdout. Diagnostics on stderr.
#
# Exit codes:
#   0  success (path printed to stdout)
#   2  gh CLI not installed
#   3  install ran but binary not found
set -euo pipefail

REPO="dworthen/bm25"
BIN="$HOME/.bm25/bin/bm25"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

# 1. bm25 already on PATH.
if command -v bm25 >/dev/null 2>&1; then
  echo "bm25"
  exit 0
fi

# 2. Installed in the default location.
if [[ -x "$BIN" ]]; then
  echo "$BIN"
  exit 0
fi

# 3. Need gh to install.
if ! command -v gh >/dev/null 2>&1; then
  echo "Error: the gh CLI is required to install bm25 but was not found." >&2
  echo "Install it from https://cli.github.com/manual/ and re-run." >&2
  exit 2
fi

# 4. Install, then verify.
echo "bm25 not found; installing via gh..." >&2
gh api "repos/${REPO}/contents/scripts/install.sh" \
  -H "Accept: application/vnd.github.raw" | bash 1>&2

if [[ -x "$BIN" ]]; then
  echo "$BIN"
  exit 0
fi

echo "Error: install completed but $BIN was not found." >&2
echo "Check the install output above (gh may need 'gh auth login')." >&2
exit 3
