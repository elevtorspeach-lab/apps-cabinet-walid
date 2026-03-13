param(
  [int]$Port = 3000,
  [string]$HostAddress = "0.0.0.0"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $scriptDir "server"

if (-not (Test-Path (Join-Path $serverDir "index.js"))) {
  Write-Host "server/index.js ma tl9atch." -ForegroundColor Red
  exit 1
}

try {
  $null = Get-Command node -ErrorAction Stop
} catch {
  Write-Host "Node.js ma minstallach f had PC." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "IPv4 dyal had PC:" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*"
  } |
  Sort-Object InterfaceAlias, IPAddress |
  ForEach-Object {
    Write-Host (" - {0} ({1})" -f $_.IPAddress, $_.InterfaceAlias)
  }

Write-Host ""
Write-Host ("Ghadi ytbda server b had l3onwan: http://<IP>:{0}" -f $Port) -ForegroundColor Yellow

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
  $ruleName = "Cabinet App Port $Port"
  $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if (-not $existingRule) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
    Write-Host ("Firewall rule tzadat l port {0}." -f $Port) -ForegroundColor Green
  } else {
    Write-Host ("Firewall rule deja kayna l port {0}." -f $Port) -ForegroundColor Green
  }
} else {
  Write-Host "Shghal PowerShell b Run as administrator ila bghiti ythall firewall automatiquement." -ForegroundColor Yellow
}

Push-Location $serverDir
try {
  $env:HOST = $HostAddress
  $env:PORT = [string]$Port
  Write-Host ""
  Write-Host ("Server khdam daba: HOST={0} PORT={1}" -f $env:HOST, $env:PORT) -ForegroundColor Green
  Write-Host "F PC akhor, 7ell: http://<IP>:3000" -ForegroundColor Green
  node index.js
} finally {
  Pop-Location
}
