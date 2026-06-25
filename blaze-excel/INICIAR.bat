@echo off
title Blaze Excel Exporter
cd /d "%~dp0"
echo.
echo  ========================================
echo    Blaze Excel Exporter
echo    Abrindo em http://localhost:4000
echo  ========================================
echo.
start http://localhost:4000
node server.js
pause
