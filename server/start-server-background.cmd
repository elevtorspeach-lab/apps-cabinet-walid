@echo off
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if exist "%PS_EXE%" (
  "%PS_EXE%" -ExecutionPolicy Bypass -File "%~dp0start-server-background.ps1"
) else (
  powershell -ExecutionPolicy Bypass -File "%~dp0start-server-background.ps1"
)
