param(
  [string]$CertPath = ""
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($CertPath)) {
  $CertPath = Join-Path $scriptDir "ssl\\local.crt"
}

if (-not (Test-Path $CertPath)) {
  Write-Error "Certificat introuvable: $CertPath"
  exit 1
}

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Warning "Lance ce script avec Run as Administrator."
  exit 1
}

Import-Certificate -FilePath $CertPath -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
Write-Host ""
Write-Host "Certificat ajoute dans Trusted Root." -ForegroundColor Green
Write-Host "Redemarre Chrome/Edge/Firefox si besoin."
