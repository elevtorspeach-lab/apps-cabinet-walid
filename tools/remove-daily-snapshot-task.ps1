param(
  [string]$TaskName = "Cabinet Walid Daily Snapshot"
)

$ErrorActionPreference = "Stop"

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed daily snapshot task '$TaskName'"
