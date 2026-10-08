---
name: bm25-install
description: >
  Locate or install the bm25 CLI binary and return the absolute path an agent
  should invoke. Use this skill before running any bm25 command (index, search,
  cron) to guarantee the binary is available. It resolves in order: bm25 on
  PATH, then ~/.bm25/bin/bm25[.exe], then installs via the gh CLI when neither
  exists. Use even when the user only says "run bm25", "search my notes",
  "index this folder", or "bm25 isn't installed" — anytime a bm25 invocation
  path is needed. USE FOR: find bm25, locate bm25 binary, install bm25, bm25
  not found, resolve bm25 path, ensure bm25 available, bm25 command missing.
---

# bm25 Install / Locate

## Goal

Return the exact command path the agent should use to run the bm25 CLI,
installing it first if it is not already present. Prefer running the bundled
resolver script so the detection and install logic is applied consistently.

## Process

Pick the script matching the shell environment and run it. The resolved path is
printed to stdout; all diagnostics go to stderr.

- macOS / Linux / WSL: `bash scripts/resolve-bm25.sh`
- Windows (PowerShell): `pwsh -File scripts/resolve-bm25.ps1`

The script performs these steps in order and stops at the first success:

1. If `bm25` is on `PATH`, print `bm25`.
2. Else if `~/.bm25/bin/bm25` (or `bm25.exe` on Windows) exists, print that
   absolute path.
3. Else, verify the `gh` CLI is installed. If missing, exit non-zero with a
   message telling the user to install it from https://cli.github.com/manual/.
4. Else, run the published install script via `gh`, then re-check
   `~/.bm25/bin/bm25[.exe]` and print its path, or exit non-zero if the install
   did not produce the binary.

Capture stdout as the path to use. Use `--help` on either script to see flags
and exit codes.

## Doing it manually

If you cannot run the bundled script, replicate it exactly:

1. `command -v bm25` (or `Get-Command bm25`) — on success use `bm25`.
2. Check `~/.bm25/bin/bm25` (`$HOME\.bm25\bin\bm25.exe` on Windows).
3. `command -v gh` — if absent, STOP and tell the user:
   "The gh CLI is required to install bm25. Install it from
   https://cli.github.com/manual/ and re-run."
4. Run the platform install command, then verify and return the path:

   macOS / Linux / WSL:

   ```bash
   gh api "repos/dworthen/bm25/contents/scripts/install.sh" -H "Accept: application/vnd.github.raw" | bash
   ```

   Windows (PowerShell):

   ```powershell
   gh api "repos/dworthen/bm25/contents/scripts/install.ps1" -H "Accept: application/vnd.github.raw" | Out-String | iex
   ```

## Gotchas

- The install script places the binary at `~/.bm25/bin/`, which is NOT
  guaranteed to be on `PATH` in the current shell session. Always return the
  resolved path from the resolver rather than assuming `bm25` works after a
  fresh install.
- `gh` must be authenticated (`gh auth login`); an unauthenticated `gh` will
  fail the install step with an API error on stderr. Surface that to the user.
- On Windows the binary is `bm25.exe`; on all other platforms it is `bm25`.
- Do not fall back to installing without `gh`. The install path depends on it.

## Validation

Before reporting success, confirm the script exited 0 and printed a non-empty
path. If it exited non-zero, relay the stderr message to the user (most often:
install `gh`, or run `gh auth login`) and do not attempt to run bm25.
