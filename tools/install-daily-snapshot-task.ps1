param(
  [string]$Time = "00:00",
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
  -Description "Creates a daily code and MySQL snapshot for Cabinet Walid." `
  -Force | Out-Null

Write-Host "Installed daily snapshot task '$TaskName' at $Time"
Write-Host "Backups will be stored in: $(Join-Path $RepoRoot 'backups\daily')"
