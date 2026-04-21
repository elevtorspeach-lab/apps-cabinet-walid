param(
  [string]$TaskName = 'CabinetWalidAraqiApi'
)

$ErrorActionPreference = 'Stop'

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $existingTask) {
  Write-Output "Scheduled task '$TaskName' not found."
  exit 0
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Output "Scheduled task '$TaskName' removed."
