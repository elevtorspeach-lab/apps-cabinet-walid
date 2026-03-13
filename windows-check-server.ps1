param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Continue"

function Get-LocalIPv4Addresses {
  return @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    Sort-Object InterfaceAlias, IPAddress)
}

function Test-Url($url) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
    Write-Host ("OK   {0} -> {1}" -f $url, $response.StatusCode) -ForegroundColor Green
  } catch {
    Write-Host ("FAIL {0} -> {1}" -f $url, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "IPv4 dyal had PC:" -ForegroundColor Cyan
$ips = Get-LocalIPv4Addresses
$ips | ForEach-Object {
  Write-Host (" - {0} ({1})" -f $_.IPAddress, $_.InterfaceAlias) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Health checks:" -ForegroundColor Cyan
Test-Url ("http://127.0.0.1:{0}/api/health" -f $Port)
foreach ($entry in $ips) {
  Test-Url ("http://{0}:{1}/api/health" -f $entry.IPAddress, $Port)
}

Write-Host ""
Write-Host "Ila localhost khdam w IP la, rah lmochkil غالباً firewall/bind/IP." -ForegroundColor Yellow
