param(
  [string]$Replay = "replays/CkWVL6Qe.json",
  [string]$OpenfrontRoot = "OpenFrontIO",
  [int]$MaxTurns = 50
)

$ErrorActionPreference = "Stop"

$tsx = Join-Path $OpenfrontRoot "node_modules/.bin/tsx"
if (-not (Test-Path $tsx)) {
  throw "Missing tsx at $tsx. Install deps in $OpenfrontRoot or run `npm install` in this repo and use `npm run replay:analyze`."
}

& $tsx tools/replay-analyzer/analyzeReplay.ts $Replay --openfrontRoot $OpenfrontRoot --noInstall --maxTurns $MaxTurns --out tools/replay-analyzer/out/smoke.report.html

