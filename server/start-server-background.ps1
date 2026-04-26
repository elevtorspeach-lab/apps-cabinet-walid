$ErrorActionPreference = 'Stop'

$serverDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$supervisorScript = Join-Path $serverDir 'server-supervisor.ps1'
$logDir = Join-Path $serverDir 'logs'
$stdoutLog = Join-Path $logDir 'server.stdout.log'
$stderrLog = Join-Path $logDir 'server.stderr.log'
$powerShellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

if (-not (Test-Path $powerShellPath)) {
  $powerShellPath = 'powershell.exe'
}

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  Write-Output "Cabinet API already listening on port 3000."
  exit 0
}

$supervisorRunning = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue `
  | Where-Object {
    $_.Name -match '^powershell' -and $_.CommandLine -like "*server-supervisor.ps1*"
  } `
  | Select-Object -First 1

if ($supervisorRunning) {
  Write-Output "Cabinet API supervisor already running."
  exit 0
}

Start-Process -FilePath $powerShellPath `
  -ArgumentList @('-ExecutionPolicy', 'Bypass', '-File', $supervisorScript) `
  -WorkingDirectory $serverDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog

Write-Output 'Cabinet API supervisor start requested.'
