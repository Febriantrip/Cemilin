$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path 'backend\.env')) {
    Write-Host '[ERROR] Jalankan Setup-Windows.ps1 terlebih dahulu.' -ForegroundColor Red
    exit 1
}
node .\scripts\start-dev.cjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
