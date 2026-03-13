param(
  [int]$Port = 3000,
  [string]$HostAddress = "0.0.0.0"
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host ""
  Write-Host ("== {0} ==" -f $message) -ForegroundColor Cyan
}

function Get-LocalIPv4Addresses {
  $addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    Sort-Object InterfaceAlias, IPAddress

  if (-not $addresses) {
    $addresses = Get-CimInstance Win32_NetworkAdapterConfiguration |
      Where-Object { $_.IPEnabled -eq $true } |
      ForEach-Object {
        foreach ($ip in @($_.IPAddress)) {
          if ($ip -match '^\d+\.\d+\.\d+\.\d+$' -and $ip -notlike '127.*' -and $ip -notlike '169.254.*') {
            [pscustomobject]@{
              IPAddress = $ip
              InterfaceAlias = $_.Description
            }
          }
        }
      }
  }

  return @($addresses)
}

function Test-Url($url) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
    return [pscustomobject]@{
      Ok = $true
      StatusCode = [int]$response.StatusCode
      Url = $url
    }
  } catch {
    return [pscustomobject]@{
      Ok = $false
      StatusCode = 0
      Url = $url
      Error = $_.Exception.Message
    }
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $scriptDir "server"
$serverIndex = Join-Path $serverDir "index.js"
$packageJson = Join-Path $serverDir "package.json"

if (-not (Test-Path $serverIndex)) {
  Write-Host "server/index.js ma tl9atch." -ForegroundColor Red
  exit 1
}

try {
  $nodeVersion = node -v
  $npmVersion = npm -v
} catch {
  Write-Host "Node.js/NPM ma minstallach f had PC." -ForegroundColor Red
  exit 1
}

Write-Step "Node.js"
Write-Host ("Node: {0}" -f $nodeVersion) -ForegroundColor Green
Write-Host ("NPM : {0}" -f $npmVersion) -ForegroundColor Green

Write-Step "NPM Install"
Push-Location $serverDir
try {
  npm install
} finally {
  Pop-Location
}

Write-Step "IPv4 الحالي"
$ipEntries = Get-LocalIPv4Addresses
if (-not $ipEntries.Count) {
  Write-Host "ما لقيتش IPv4 صالح فهاد PC." -ForegroundColor Red
  exit 1
}

$ipEntries | ForEach-Object {
  Write-Host (" - {0} ({1})" -f $_.IPAddress, $_.InterfaceAlias) -ForegroundColor Yellow
}

$primaryIp = [string]$ipEntries[0].IPAddress
Write-Host ("IP اللي غادي تجرب به: {0}" -f $primaryIp) -ForegroundColor Green

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Step "Firewall"
if ($isAdmin) {
  $ruleName = "Cabinet App Port $Port"
  $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if (-not $existingRule) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
    Write-Host ("Firewall t7ell l port {0}." -f $Port) -ForegroundColor Green
  } else {
    Write-Host ("Firewall deja ma7loul l port {0}." -f $Port) -ForegroundColor Green
  }
} else {
  Write-Host "Run as Administrator باش يتحل firewall automatiquement." -ForegroundColor Yellow
}

Write-Step "تشغيل السيرفر"
Write-Host ("Ghadi nchghlou server b HOST={0} PORT={1}" -f $HostAddress, $Port) -ForegroundColor Green
Write-Host ("Mn b3d jarrab:" ) -ForegroundColor Yellow
Write-Host (" - http://127.0.0.1:{0}" -f $Port) -ForegroundColor Yellow
Write-Host (" - http://{0}:{1}" -f $primaryIp, $Port) -ForegroundColor Yellow
Write-Host ""
Write-Host "خلي هاد الwindow محلولة." -ForegroundColor Yellow

Push-Location $serverDir
try {
  $env:HOST = $HostAddress
  $env:PORT = [string]$Port
  node index.js
} finally {
  Pop-Location
}
