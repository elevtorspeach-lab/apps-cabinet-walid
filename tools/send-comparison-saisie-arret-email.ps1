$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvPath = Join-Path $RepoRoot "server\.env"
$AttachmentPath = Join-Path $RepoRoot "comparaison-saisie-arret-manquants.xlsx"

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

function Assert-Attachment {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Attachment not found: $Path"
  }
  $item = Get-Item -LiteralPath $Path
  if ($item.Length -lt 1000) {
    throw "Attachment is too small to send safely: $Path ($($item.Length) bytes)"
  }
  return $item.FullName
}

Import-EnvFile -Path $EnvPath

$to = $env:EXCEL_BACKUP_EMAIL_TO
if (-not $to) {
  throw "Missing EXCEL_BACKUP_EMAIL_TO in server\.env"
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
  throw "Missing Gmail app password in server\.env"
}

$attachment = Assert-Attachment -Path $AttachmentPath
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($from, $securePassword)
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"

[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

$message = New-Object System.Net.Mail.MailMessage
$smtpClient = $null
try {
  $message.From = $from
  $message.To.Add($to)
  $message.Subject = "Comparaison Saisie Arret - dossiers manquants - $stamp"
  $message.Body = "Bonjour,`n`nVeuillez trouver ci-joint le fichier Excel des dossiers Saisie Arret presents dans les 3 fichiers source mais absents de la sauvegarde Excel Diligence Saisie Arret de l'application.`n`nResume: 55 lignes manquantes trouvees.`n`nCabinet Walid"
  [void]$message.Attachments.Add((New-Object System.Net.Mail.Attachment($attachment)))

  $smtpClient = New-Object System.Net.Mail.SmtpClient("smtp.gmail.com", 587)
  $smtpClient.EnableSsl = $true
  $smtpClient.UseDefaultCredentials = $false
  $smtpClient.Credentials = New-Object System.Net.NetworkCredential($credential.UserName, $credential.GetNetworkCredential().Password)
  $smtpClient.Send($message)
} finally {
  if ($message) {
    $message.Dispose()
  }
  if ($smtpClient) {
    $smtpClient.Dispose()
  }
}

Write-Host "Comparison email sent to $to"
Write-Host "Attachment: $attachment"
