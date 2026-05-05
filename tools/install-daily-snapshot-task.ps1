param(
  [string]$Time = "15:00",
  [string]$TaskName = "Cabinet Walid Daily Snapshot"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$NodePath = (Get-Command node).Source
$ScriptPath = Join-Path $RepoRoot "tools\create-daily-snapshot.cjs"

if (-not (Test-Path $ScriptPath)) {
  throw "Snapshot script not found: $ScriptPath"
}

$Action = New-ScheduledTaskAction `
  -Execute $NodePath `
  -Argument "`"$ScriptPath`" --label scheduled" `
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
  -Description "Creates a daily code and MySQL snapshot for Cabinet Walid." `
  -Force | Out-Null

Write-Host "Installed daily snapshot task '$TaskName' at $Time"
Write-Host "Backups will be stored in: $(Join-Path $RepoRoot 'backups\daily')"
