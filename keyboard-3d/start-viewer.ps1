param([ValidateRange(1024,65535)][int]$Port=8080,[switch]$NoBrowser,[switch]$Smoke)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host "KlayKeys local viewer" -ForegroundColor Magenta
Write-Host "URL: http://127.0.0.1:$Port/viewer/index.html"
Write-Host 'Keep this command window open. Press Ctrl+C here to stop.'
try {
    $nodeCommand=Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand) { throw 'Node.js is missing. Install Node.js 20 or newer from https://nodejs.org/ then reopen this launcher.' }
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\three\package.json'))) {
        throw 'Dependencies are missing. Open PowerShell in this folder and run: npm ci. Then double-click start-viewer.bat again.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'exports\keyboard_manifest.json'))) { throw 'Assets are missing. Follow the regeneration command in START_HERE.md.' }
    $viewerArguments=@('scripts/serve.mjs','--port',"$Port")
    if (-not $NoBrowser -and -not $Smoke) { $viewerArguments+='--open' }
    if ($Smoke) { $viewerArguments+='--smoke' }
    & $nodeCommand.Source @viewerArguments
    exit $LASTEXITCODE
} catch {
    Write-Host "Could not start the viewer: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
