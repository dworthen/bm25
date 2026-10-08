<#
.SYNOPSIS
  Resolve the bm25 CLI path, installing it via the gh CLI if needed.

.DESCRIPTION
  Resolution order (stops at first success):
    1. If `bm25` is on PATH, print `bm25`.
    2. Else if ~\.bm25\bin\bm25.exe exists, print its absolute path.
    3. Else require `gh`; if missing, error and exit 2.
    4. Else run the published install script via gh, then verify
       ~\.bm25\bin\bm25.exe and print it, or exit 3 if not produced.

  The resolved path is written to stdout. Diagnostics go to stderr.

.PARAMETER Help
  Show this help and exit.

.NOTES
  Exit codes:
    0  success (path printed to stdout)
    2  gh CLI not installed
    3  install ran but binary not found

.LINK
  https://cli.github.com/manual/
#>
param(
  [switch] $Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
  Get-Help $PSCommandPath -Detailed
  exit 0
}

$repo = "dworthen/bm25"
$bin = Join-Path $HOME ".bm25\bin\bm25.exe"

# 1. bm25 already on PATH.
if (Get-Command bm25 -ErrorAction SilentlyContinue) {
  Write-Output "bm25"
  exit 0
}

# 2. Installed in the default location.
if (Test-Path -LiteralPath $bin) {
  Write-Output $bin
  exit 0
}

# 3. Need gh to install.
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  [Console]::Error.WriteLine("Error: the gh CLI is required to install bm25 but was not found.")
  [Console]::Error.WriteLine("Install it from https://cli.github.com/manual/ and re-run.")
  exit 2
}

# 4. Install, then verify.
[Console]::Error.WriteLine("bm25 not found; installing via gh...")
gh api "repos/$repo/contents/scripts/install.ps1" -H "Accept: application/vnd.github.raw" | Out-String | Invoke-Expression

if (Test-Path -LiteralPath $bin) {
  Write-Output $bin
  exit 0
}

[Console]::Error.WriteLine("Error: install completed but $bin was not found.")
[Console]::Error.WriteLine("Check the install output above (gh may need 'gh auth login').")
exit 3
