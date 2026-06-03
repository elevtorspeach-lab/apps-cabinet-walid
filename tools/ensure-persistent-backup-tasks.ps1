param(
  [string]$SnapshotTime = "00:00",
  [string]$SnapshotTaskName = "Cabinet Walid Daily Snapshot",
  [string]$ExcelTime = "12:30",
  [string]$ExcelTaskName = "Cabinet Walid Daily Excel Backup"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$SnapshotInstallerPath = Join-Path $RepoRoot "tools\install-daily-snapshot-task.ps1"
$ExcelInstallerPath = Join-Path $RepoRoot "tools\install-daily-excel-backup-task.ps1"
$SnapshotScriptPath = Join-Path $RepoRoot "tools\create-daily-snapshot.cjs"
$ExcelScriptPath = Join-Path $RepoRoot "tools\export-and-email-excel-backups.ps1"

if (-not (Test-Path -LiteralPath $SnapshotInstallerPath)) {
  throw "Snapshot installer not found: $SnapshotInstallerPath"
}

if (-not (Test-Path -LiteralPath $ExcelInstallerPath)) {
  throw "Excel installer not found: $ExcelInstallerPath"
}

if (-not (Test-Path -LiteralPath $SnapshotScriptPath)) {
  throw "Snapshot script not found: $SnapshotScriptPath"
}

if (-not (Test-Path -LiteralPath $ExcelScriptPath)) {
  throw "Excel email script not found: $ExcelScriptPath"
}

function Normalize-TimeText {
  param([object]$Value)

  if ($Value -is [DateTime]) {
    return $Value.ToString("HH:mm")
  }

  return ([string]$Value).Trim()
}

function Test-SnapshotTaskHealthy {
  $task = Get-ScheduledTask -TaskName $SnapshotTaskName -ErrorAction SilentlyContinue
  if (-not $task) {
    Write-Host "Snapshot task missing: $SnapshotTaskName"
    return $false
  }

  $trigger = @($task.Triggers | Where-Object { $_.Enabled -and $_.DaysInterval -eq 1 }) | Select-Object -First 1
  if (-not $trigger) {
    Write-Host "Snapshot task has no enabled daily trigger."
    return $false
  }

  if ((Normalize-TimeText $trigger.StartBoundary).Length -gt 0) {
    try {
      $triggerTime = ([DateTime]$trigger.StartBoundary).ToString("HH:mm")
      if ($triggerTime -ne $SnapshotTime) {
        Write-Host "Snapshot task time is $triggerTime, expected $SnapshotTime."
        return $false
      }
    } catch {
      Write-Host "Snapshot task time could not be verified. Reinstalling."
      return $false
    }
  }

  $action = @($task.Actions) | Select-Object -First 1
  $expectedScript = [System.IO.Path]::GetFullPath($SnapshotScriptPath)
  $actualArgs = [string]($action.Arguments)
  if ($actualArgs -notlike "*$expectedScript*") {
    Write-Host "Snapshot task points to another script. Reinstalling."
    return $false
  }

  return $true
}

function Test-ExcelTaskHealthy {
  $task = Get-ScheduledTask -TaskName $ExcelTaskName -ErrorAction SilentlyContinue
  if (-not $task) {
    Write-Host "Excel task missing: $ExcelTaskName"
    return $false
  }

  $trigger = @($task.Triggers | Where-Object { $_.Enabled -and $_.DaysInterval -eq 1 }) | Select-Object -First 1
  if (-not $trigger) {
    Write-Host "Excel task has no enabled daily trigger."
    return $false
  }

  if ((Normalize-TimeText $trigger.StartBoundary).Length -gt 0) {
    try {
      $triggerTime = ([DateTime]$trigger.StartBoundary).ToString("HH:mm")
      if ($triggerTime -ne $ExcelTime) {
        Write-Host "Excel task time is $triggerTime, expected $ExcelTime."
        return $false
      }
    } catch {
      Write-Host "Excel task time could not be verified. Reinstalling."
      return $false
    }
  }

  $action = @($task.Actions) | Select-Object -First 1
  $expectedScript = [System.IO.Path]::GetFullPath($ExcelScriptPath)
  $actualArgs = [string]($action.Arguments)
  if ($actualArgs -notlike "*$expectedScript*") {
    Write-Host "Excel task points to another script. Reinstalling."
    return $false
  }

  return $true
}

$snapshotHealthy = Test-SnapshotTaskHealthy
if ($snapshotHealthy) {
  Write-Host "Snapshot task is already healthy: $SnapshotTaskName at $SnapshotTime"
} else {
  & $SnapshotInstallerPath -Time $SnapshotTime -TaskName $SnapshotTaskName
  Write-Host "Snapshot task enforced: $SnapshotTaskName at $SnapshotTime"
}

$excelHealthy = Test-ExcelTaskHealthy
if ($excelHealthy) {
  Write-Host "Excel task is already healthy: $ExcelTaskName at $ExcelTime"
} else {
  & $ExcelInstallerPath -Time $ExcelTime -TaskName $ExcelTaskName
  Write-Host "Excel task enforced: $ExcelTaskName at $ExcelTime"
}
