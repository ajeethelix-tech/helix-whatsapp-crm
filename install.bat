@echo off
title Helix WhatsApp CRM — First Time Setup
set "PATH=C:\Users\hp\AppData\Local\Programs\nodejs;C:\Users\hp\AppData\Local\Programs\git\cmd;%PATH%"

echo ============================================================
echo   Helix BioFast Labs — WhatsApp CRM Software Setup
echo ============================================================
echo.
echo Checking Node.js and Git...
node -v
git --version
echo.
echo Installing Node.js dependencies (express, baileys, sqlite3, socket.io)...
echo Please wait 1-2 minutes...
echo.
cd /d "%~dp0"
call npm install
echo.
echo ============================================================
echo   Installation Complete!
echo   - To launch as Desktop App: Run Start-Desktop-App.bat
echo   - To launch in Browser:     Run start-crm.bat
echo ============================================================
pause
