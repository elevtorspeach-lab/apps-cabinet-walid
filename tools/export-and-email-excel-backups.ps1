param(
  [switch]$SkipEmail
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$NodePath = (Get-Command node).Source
$ExportScriptPath = Join-Path $RepoRoot "tools\export-desktop-excel-backups.cjs"
$EnvPath = Join-Path $RepoRoot "server\.env"
$OutputDir = [System.IO.Path]::Combine($env:USERPROFILE, "Desktop", "Sauvegarde Cabinet Excel")
$ClientsPath = Join-Path $OutputDir "Sauvegarde Excel Clients.xlsx"
$DiligencePath = Join-Path $OutputDir "Sauvegarde Excel Diligence.xlsx"

function Import-EnvFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $equalsIndex = $line.IndexOf("=")
    if ($equalsIndex -lt 1) {
      return
    }

    $key = $line.Substring(0, $equalsIndex).Trim()
    $value = $line.Substring($equalsIndex + 1).Trim().Trim('"').Trim("'")
    if ($key) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

if (-not (Test-Path -LiteralPath $ExportScriptPath)) {
  throw "Excel backup script not found: $ExportScriptPath"
}

& $NodePath $ExportScriptPath
if ($LASTEXITCODE -ne 0) {
  throw "Excel backup export failed with exit code $LASTEXITCODE"
}

if ($SkipEmail) {
  Write-Host "Email skipped by request."
  exit 0
}

Import-EnvFile -Path $EnvPath

$to = $env:EXCEL_BACKUP_EMAIL_TO
if (-not $to) {
  $to = "appswalid058@gmail.com"
}

$from = $env:EXCEL_BACKUP_EMAIL_FROM
if (-not $from) {
  $from = $to
}

$password = $env:EXCEL_BACKUP_GMAIL_APP_PASSWORD
if (-not $password) {
  $password = $env:EXCEL_BACKUP_EMAIL_PASSWORD
}

if (-not $password) {
  Write-Warning "Excel backups were created, but email was not sent. Add EXCEL_BACKUP_GMAIL_APP_PASSWORD to server\.env."
  exit 0
}

$attachments = @($ClientsPath, $DiligencePath) | Where-Object { Test-Path -LiteralPath $_ }
if ($attachments.Count -lt 2) {
  throw "Expected Excel backup files were not found in $OutputDir"
}

$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($from, $securePassword)
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"

Send-MailMessage `
  -SmtpServer "smtp.gmail.com" `
  -Port 587 `
  -UseSsl `
  -Credential $credential `
  -From $from `
  -To $to `
  -Subject "Sauvegarde Excel Cabinet Walid - $stamp" `
  -Body "Bonjour,`n`nVeuillez trouver ci-joint les sauvegardes Excel Clients et Diligence generees automatiquement a 12:30.`n`nCabinet Walid" `
  -Attachments $attachments `
  -Encoding UTF8

Write-Host "Excel backup email sent to $to"
