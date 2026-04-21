param(
  [string]$TaskName = 'CabinetWalidAraqiApi',
  [switch]$StartNow
)

$ErrorActionPreference = 'Stop'

$serverDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$starterScript = Join-Path $serverDir 'start-server-background.ps1'

if (-not (Test-Path -LiteralPath $starterScript)) {
  throw "Starter script not found: $starterScript"
}

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-ExecutionPolicy Bypass -File `"$starterScript`""

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0)

$principal = New-ScheduledTaskPrincipal `
  -UserId 'SYSTEM' `
  -LogonType ServiceAccount `
  -RunLevel Highest

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Auto-start Cabinet Walid Araqi API supervisor at Windows startup.' `
  | Out-Null

if ($StartNow) {
  Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-ExecutionPolicy', 'Bypass', '-File', $starterScript) `
    -WorkingDirectory $serverDir `
    -WindowStyle Hidden
}

Write-Output "Scheduled task '$TaskName' installed."
