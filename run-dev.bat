@echo off
setlocal
cd /d "%~dp0"
echo JOZETH TRADING - starting the local demo...
if not exist "package.json" (
  echo ERROR: package.json was not found. Extract the entire project ZIP and run this file from the project folder.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed. Make sure Node.js and npm are installed and internet access is available.
    pause
    exit /b 1
  )
)
call npm.cmd run dev
if errorlevel 1 pause
endlocal
