@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\stop-neurosprint.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Ne udalos ostanovit NeuroSprint. Okno ne zakroetsya, chtoby mozhno bylo prochitat oshibku.
  pause
)

exit /b %EXIT_CODE%
