@echo off
title Helix BioFast Labs — WhatsApp CRM Software
set "PATH=C:\Users\hp\AppData\Local\Programs\nodejs;C:\Users\hp\AppData\Local\Programs\git\cmd;%PATH%"

echo ============================================================
echo   Helix BioFast Labs — WhatsApp CRM & Bot Engine
echo ============================================================
echo.
echo Starting WhatsApp CRM Server...
cd /d "%~dp0"
echo.
echo Open your web browser at: http://localhost:3000
echo.
node helix-bot.js
pause
