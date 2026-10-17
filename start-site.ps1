param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
try {
 if (-not (Get-Command node -ErrorAction SilentlyContinue)) {throw 'Install Node.js LTS, then reopen this launcher.'}
 if (-not (Test-Path '.env')) {throw 'Complete START_HERE.md: configure MySQL and copy .env.example to .env.'}
 if (-not (Test-Path 'node_modules/express')) {throw 'Run npm ci once in this folder to install dependencies.'}
 if ((Get-Content .env -Raw) -match 'DB_PORT=3308' -and (Test-Path '.local-mysql/credentials.json')) { & node scripts/local-mysql.js; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE} }
 if($NoBrowser){& node server/server.js}else{& node server/server.js --open}
 exit $LASTEXITCODE
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
