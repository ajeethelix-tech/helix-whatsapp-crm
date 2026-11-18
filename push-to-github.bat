@echo off
setlocal
set "PATH=C:\Users\hp\AppData\Local\Programs\git\cmd;%PATH%"
cd /d "%~dp0"

echo ===================================================
echo   Pushing Helix WhatsApp CRM to GitHub
echo ===================================================
echo.
git push -u origin main
echo.
pause
