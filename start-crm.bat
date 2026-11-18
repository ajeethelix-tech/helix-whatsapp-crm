@echo off
title Helix BioFast Labs — WhatsApp CRM
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo =====================================================================
echo    HELIX BIOFAST LABS — WHATSAPP AUTOMATION ^& CRM SYSTEM
echo =====================================================================
echo.

:: Ensure Node is in PATH
set "PATH=C:\Users\hp\.gemini\antigravity\programs\nodejs;C:\Users\hp\AppData\Local\Programs\nodejs;C:\Users\hp\AppData\Local\Programs\git\cmd;%PATH%"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not found. Please install Node.js from https://nodejs.org
  pause
  exit /b 1
)

echo Starting Helix CRM Backend Server...
echo.
echo Desktop Screen Launcher : Run Start-Desktop-App.bat
echo Local Browser Access    : http://localhost:3000
echo.
echo Starting server...
node helix-bot.js
pause
