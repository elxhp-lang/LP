param(
  [ValidateSet("milestone", "final")]
  [string]$Mode = "milestone"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Run-Step($title, $command, $workdir) {
  Write-Host ""
  Write-Host "==> $title" -ForegroundColor Cyan
  Push-Location $workdir
  try {
    Invoke-Expression $command
  } finally {
    Pop-Location
  }
}

Run-Step "Backend tests" ".\.venv\Scripts\python.exe -m pytest -q" "$root\core\backend"
Run-Step "Frontend build" "npm run build" "$root\web"

if ($Mode -eq "final") {
  Run-Step "Git status quick check" "git status --short" $root
}

Write-Host ""
Write-Host "Checkpoint [$Mode] passed." -ForegroundColor Green
