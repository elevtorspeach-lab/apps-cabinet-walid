param(
  [string]$Time = "00:30",
  [string]$TaskName = "Cabinet Walid Daily Excel Backup"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$ScriptPath = Join-Path $RepoRoot "tools\export-and-email-excel-backups.ps1"

if (-not (Test-Path $ScriptPath)) {
  throw "Excel backup email script not found: $ScriptPath"
}

$Action = New-ScheduledTaskAction `
  -Execute $PowerShellPath `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
  -WorkingDirectory $RepoRoot

$TriggerTime = [DateTime]::ParseExact($Time, "HH:mm", [Globalization.CultureInfo]::InvariantCulture)
$Trigger = New-ScheduledTaskTrigger -Daily -At $TriggerTime
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0)

$Principal = New-ScheduledTaskPrincipal `
  -UserId "SYSTEM" `
  -LogonType ServiceAccount `
  -RunLevel Highest

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Principal $Principal `
  -Description "Creates daily Client and Diligence Excel backups on the Desktop and emails them for Cabinet Walid." `
  -Force | Out-Null

Write-Host "Installed daily Excel backup task '$TaskName' at $Time"
Write-Host "Excel files will be stored in: $([System.IO.Path]::Combine($env:USERPROFILE, 'Desktop', 'Sauvegarde Cabinet Excel'))"
Write-Host "Email recipient is configured with EXCEL_BACKUP_EMAIL_TO in server\.env"
