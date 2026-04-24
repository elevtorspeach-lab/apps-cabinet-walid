$ErrorActionPreference = 'Stop'

$serverDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $serverDir 'logs'
$stdoutLog = Join-Path $logDir 'server.stdout.log'
$stderrLog = Join-Path $logDir 'server.stderr.log'
$supervisorLog = Join-Path $logDir 'server.supervisor.log'

if (-not (Test-Path -LiteralPath $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Write-SupervisorLog {
  param([string]$Message)

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -LiteralPath $supervisorLog -Value "[$timestamp] $Message"
}

function Test-ServerPortListening {
  try {
    $listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop | Select-Object -First 1
    return $null -ne $listener
  } catch {
    return $false
  }
}

function Resolve-NodePath {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand -and $nodeCommand.Source) {
    return $nodeCommand.Source
  }

  $fallbacks = @(
    'C:\Program Files\nodejs\node.exe',
    'C:\Program Files (x86)\nodejs\node.exe'
  )

  foreach ($candidate in $fallbacks) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw 'Node.js executable not found.'
}

$nodePath = Resolve-NodePath
Write-SupervisorLog "Supervisor started with Node at $nodePath"

while ($true) {
  try {
    if (Test-ServerPortListening) {
      Write-SupervisorLog 'Port 3000 already in use. Waiting before retry.'
      Start-Sleep -Seconds 10
      continue
    }

    $process = Start-Process -FilePath $nodePath `
      -ArgumentList 'index.js' `
      -WorkingDirectory $serverDir `
      -WindowStyle Hidden `
      -RedirectStandardOutput $stdoutLog `
      -RedirectStandardError $stderrLog `
      -PassThru

    Write-SupervisorLog "Server started with PID $($process.Id)"
    $process.WaitForExit()
    Write-SupervisorLog "Server stopped with exit code $($process.ExitCode). Restarting in 3 seconds."
  } catch {
    Write-SupervisorLog "Supervisor error: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds 3
}
