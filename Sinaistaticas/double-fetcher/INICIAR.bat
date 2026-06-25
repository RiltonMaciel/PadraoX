@echo off
title Blaze Excel Exporter
cd /d "%~dp0"
echo.
echo  ========================================
echo    Blaze Excel Exporter
echo    Abrindo em http://localhost:5000
echo  ========================================
echo.
start http://localhost:5000
node server.js
pause
