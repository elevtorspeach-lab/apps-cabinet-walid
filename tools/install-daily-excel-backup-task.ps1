param(
  [string]$Time = "12:30",
  [string]$TaskName = "Cabinet Walid Daily Excel Backup"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$NodePath = (Get-Command node).Source
$ScriptPath = Join-Path $RepoRoot "tools\export-desktop-excel-backups.cjs"

if (-not (Test-Path $ScriptPath)) {
  throw "Excel backup script not found: $ScriptPath"
}

$Action = New-ScheduledTaskAction `
  -Execute $NodePath `
  -Argument "`"$ScriptPath`"" `
  -WorkingDirectory $RepoRoot

$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description "Creates daily Client and Diligence Excel backups on the Desktop for Cabinet Walid." `
  -Force | Out-Null

Write-Host "Installed daily Excel backup task '$TaskName' at $Time"
Write-Host "Excel files will be stored in: $([System.IO.Path]::Combine($env:USERPROFILE, 'Desktop', 'Sauvegarde Cabinet Excel'))"
