param(
  [switch]$SkipEmail
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$NodePath = (Get-Command node).Source
$ExportScriptPath = Join-Path $RepoRoot "tools\export-desktop-excel-backups.cjs"
$EnvPath = Join-Path $RepoRoot "server\.env"
$BaseOutputDir = [System.IO.Path]::Combine($env:USERPROFILE, "Desktop", "Sauvegarde Cabinet Excel")
$RunStamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
if ($env:EXCEL_BACKUP_OUTPUT_DIR) {
  $OutputDir = [System.IO.Path]::GetFullPath($env:EXCEL_BACKUP_OUTPUT_DIR)
} else {
  $OutputDir = Join-Path $BaseOutputDir $RunStamp
}
$ClientsPath = Join-Path $OutputDir "Sauvegarde Excel Clients.xlsx"
$DiligencePath = Join-Path $OutputDir "Sauvegarde Excel Diligence.xlsx"
$MinimumAttachmentBytes = 10000
$MaxExportAttempts = 3
$ExportRetryDelaySeconds = 20

if ($env:EXCEL_BACKUP_MAX_ATTEMPTS) {
  $parsedAttempts = 0
  if ([int]::TryParse($env:EXCEL_BACKUP_MAX_ATTEMPTS, [ref]$parsedAttempts) -and $parsedAttempts -gt 0) {
    $MaxExportAttempts = $parsedAttempts
  }
}

if ($env:EXCEL_BACKUP_RETRY_DELAY_SECONDS) {
  $parsedDelay = 0
  if ([int]::TryParse($env:EXCEL_BACKUP_RETRY_DELAY_SECONDS, [ref]$parsedDelay) -and $parsedDelay -ge 0) {
    $ExportRetryDelaySeconds = $parsedDelay
  }
}

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

function Assert-ExcelAttachment {
  param(
    [string]$Path,
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "$Label Excel backup file was not created: $Path"
  }

  $item = Get-Item -LiteralPath $Path
  if ($item.Length -lt $MinimumAttachmentBytes) {
    throw "$Label Excel backup looks empty ($($item.Length) bytes): $Path"
  }

  return $item.FullName
}

if (-not (Test-Path -LiteralPath $ExportScriptPath)) {
  throw "Excel backup script not found: $ExportScriptPath"
}

$env:EXCEL_BACKUP_OUTPUT_DIR = $OutputDir
$exportSucceeded = $false
$lastExportError = ""

for ($attempt = 1; $attempt -le $MaxExportAttempts; $attempt++) {
  try {
    Write-Host "Excel backup export attempt $attempt/$MaxExportAttempts..."
    & $NodePath $ExportScriptPath
    if ($LASTEXITCODE -ne 0) {
      throw "Excel backup export failed with exit code $LASTEXITCODE"
    }

    [void](Assert-ExcelAttachment -Path $ClientsPath -Label "Clients")
    [void](Assert-ExcelAttachment -Path $DiligencePath -Label "Diligence")
    $exportSucceeded = $true
    break
  } catch {
    $lastExportError = $_.Exception.Message
    if ($attempt -lt $MaxExportAttempts) {
      Write-Warning "Excel backup export attempt $attempt failed: $lastExportError. Retrying in $ExportRetryDelaySeconds seconds..."
      if ($ExportRetryDelaySeconds -gt 0) {
        Start-Sleep -Seconds $ExportRetryDelaySeconds
      }
    }
  }
}

if (-not $exportSucceeded) {
  throw "Excel backup export failed after $MaxExportAttempts attempt(s): $lastExportError"
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
} else {
  $password = $password -replace '\s+', ''
}

if (-not $password) {
  Write-Warning "Excel backups were created, but email was not sent. Add EXCEL_BACKUP_GMAIL_APP_PASSWORD to server\.env."
  exit 0
}

$attachments = [string[]]@(
  (Assert-ExcelAttachment -Path $ClientsPath -Label "Clients")
  (Assert-ExcelAttachment -Path $DiligencePath -Label "Diligence")
)

$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($from, $securePassword)
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

$message = New-Object System.Net.Mail.MailMessage
$smtpClient = $null
try {
  $message.From = $from
  $message.To.Add($to)
  $message.Subject = "Sauvegarde Excel Cabinet Walid - $stamp"
  $message.Body = "Bonjour,`n`nVeuillez trouver ci-joint les sauvegardes Excel Clients et Diligence generees automatiquement le $stamp.`n`nCabinet Walid"
  foreach ($attachment in $attachments) {
    [void]$message.Attachments.Add((New-Object System.Net.Mail.Attachment($attachment)))
  }

  $smtpClient = New-Object System.Net.Mail.SmtpClient("smtp.gmail.com", 587)
  $smtpClient.EnableSsl = $true
  $smtpClient.UseDefaultCredentials = $false
  $smtpClient.Credentials = New-Object System.Net.NetworkCredential($credential.UserName, $credential.GetNetworkCredential().Password)
  $smtpClient.Send($message)
} catch {
  $detail = $_.Exception.Message
  if ($_.Exception.InnerException) {
    $detail = "$detail Inner: $($_.Exception.InnerException.Message)"
  }
  throw "Excel backup email send failed: $detail"
} finally {
  if ($message) {
    $message.Dispose()
  }
  if ($smtpClient) {
    $smtpClient.Dispose()
  }
}

Write-Host "Excel backup email sent to $to with attachments:"
$attachments | ForEach-Object {
  $item = Get-Item -LiteralPath $_
  Write-Host " - $($item.FullName) ($($item.Length) bytes)"
}
