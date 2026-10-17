@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-viewer.ps1" %*
if errorlevel 1 (
  echo.
  echo Please read START_HERE.md for setup and troubleshooting.
  pause
)
endlocal
