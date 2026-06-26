$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvPath = Join-Path $RepoRoot "server\.env"
$FilesDir = Join-Path $PSScriptRoot "fichiers"

function Import-EnvFile {
  param([string]$Path)
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $equalsIndex = $line.IndexOf("=")
    if ($equalsIndex -lt 1) { return }
    $key = $line.Substring(0, $equalsIndex).Trim()
    $value = $line.Substring($equalsIndex + 1).Trim().Trim('"').Trim("'")
    if ($key) { [Environment]::SetEnvironmentVariable($key, $value, "Process") }
  }
}

Import-EnvFile -Path $EnvPath

$to = $env:EXCEL_BACKUP_EMAIL_TO
$from = $env:EXCEL_BACKUP_EMAIL_FROM
$password = ($env:EXCEL_BACKUP_GMAIL_APP_PASSWORD -replace '\s+', '')
if (-not $to -or -not $from -or -not $password) {
  throw "Configuration email incomplete."
}

$attachments = @(Get-ChildItem -LiteralPath $FilesDir -Filter "*.xlsx" -File | Sort-Object Name)
if ($attachments.Count -lt 1) { throw "Aucun fichier Excel a envoyer." }
foreach ($file in $attachments) {
  if ($file.Length -lt 5000) { throw "Fichier Excel invalide ou trop petit: $($file.FullName)" }
}

[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
$message = New-Object System.Net.Mail.MailMessage
$smtpClient = $null
try {
  $message.From = $from
  $message.To.Add($to)
  $message.Subject = "Modeles Excel Import Cabinet Walid - Global, Audience et Diligence"
  $message.Body = @"
Bonjour,

Veuillez trouver ci-joint les modeles Excel professionnels et vides pour:
- Import Global
- Import Audience
- Les procedures disponibles dans Diligence

Les fichiers contiennent uniquement les en-tetes de colonnes compatibles avec l'import. Aucune donnee client ou dossier n'est incluse.

Cabinet Walid
"@
  foreach ($file in $attachments) {
    [void]$message.Attachments.Add((New-Object System.Net.Mail.Attachment($file.FullName)))
  }
  $smtpClient = New-Object System.Net.Mail.SmtpClient("smtp.gmail.com", 587)
  $smtpClient.EnableSsl = $true
  $smtpClient.UseDefaultCredentials = $false
  $smtpClient.Credentials = New-Object System.Net.NetworkCredential($from, $password)
  $smtpClient.Send($message)
} finally {
  if ($message) { $message.Dispose() }
  if ($smtpClient) { $smtpClient.Dispose() }
}

Write-Host "EMAIL_SENT_TO=$to"
Write-Host "ATTACHMENT_COUNT=$($attachments.Count)"
$attachments | ForEach-Object { Write-Host "$($_.Name)|$($_.Length)" }
