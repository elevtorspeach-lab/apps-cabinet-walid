@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\server\trust-local-ssl-windows.ps1"
pause
