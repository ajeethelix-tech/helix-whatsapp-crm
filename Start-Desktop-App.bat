@echo off
title Helix BioFast Labs — Desktop CRM
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo =====================================================================
echo    HELIX BIOFAST LABS — WHATSAPP AUTOMATION ^& CRM DESKTOP APP
echo =====================================================================
echo.

:: Ensure Node is in PATH
set "PATH=C:\Users\hp\.gemini\antigravity\programs\nodejs;C:\Users\hp\AppData\Local\Programs\nodejs;C:\Users\hp\AppData\Local\Programs\git\cmd;%PATH%"

:: Check if Node is available
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not found. Please install Node.js from https://nodejs.org
  pause
  exit /b 1
)

:: Check if server is already running on port 3000
netstat -ano | findstr ":3000" >nul 2>nul
if %errorlevel% neq 0 (
  echo [1/3] Starting Helix CRM Server in background...
  start "Helix CRM Backend" /min node helix-bot.js
  echo [2/3] Waiting for server engine to initialize...
  timeout /t 3 /nobreak >nul
) else (
  echo [1/3] Helix CRM Server is already running on port 3000.
)

echo [3/3] Launching Native Desktop Window...
echo.

:: Find Microsoft Edge (installed by default on Windows 10 & 11)
set "BROWSER_APP="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  set "BROWSER_APP=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  set "BROWSER_APP=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  set "BROWSER_APP=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  set "BROWSER_APP=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  set "BROWSER_APP=%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

if defined BROWSER_APP (
  start "" "!BROWSER_APP!" --app=http://localhost:3000 --window-size=1300,850
) else (
  start http://localhost:3000
)

echo =====================================================================
echo  CRM Running successfully!
echo  Desktop Screen: Opened
echo  Browser Access: http://localhost:3000
echo.
echo  Access from Any Computer / Mobile on Wi-Fi:
echo  Check Settings tab in the CRM or the top navbar for your Network Link
echo =====================================================================
echo.
timeout /t 5 >nul
exit /b 0
