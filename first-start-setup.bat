@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js i npm ne naydeny.
  echo Ustanovite Node.js LTS, potom zapustite etot fail eshche raz.
  pause
  exit /b 1
)

echo Ustanovka zavisimostey NeuroSprint...
call npm install
set "EXIT_CODE=%ERRORLEVEL%"
echo.

if not "%EXIT_CODE%"=="0" (
  echo Ustanovka zavershilas s oshibkoy.
) else (
  echo Ustanovka zavershena. Teper mozhno zapuskat start-neurosprint.bat.
)

pause
exit /b %EXIT_CODE%
