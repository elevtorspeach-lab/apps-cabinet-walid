param(
  [string]$BenchFixture,
  [string]$BrowserPath = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
  [int]$Managers = 2,
  [int]$Admins = 5,
  [int]$Clients = 5,
  [int]$TargetClients = 300,
  [int]$TargetDossiers = 25000,
  [int]$TargetAudience = 30000,
  [int]$TargetDiligence = 30000,
  [int]$DurationMs = 180000,
  [int]$BenchPort = 3620
)

$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $PSScriptRoot

if (-not $BenchFixture) {
  throw 'BenchFixture is required.'
}

$env:BENCH_FIXTURE = $BenchFixture
$env:BENCH_BROWSER_PATH = $BrowserPath
$env:PLAYWRIGHT_NODE_MODULES = Join-Path $rootDir 'node_modules'
$env:TOTAL_MANAGERS = [string]$Managers
$env:TOTAL_ADMINS = [string]$Admins
$env:TOTAL_CLIENTS = [string]$Clients
$env:TARGET_CLIENTS = [string]$TargetClients
$env:TARGET_DOSSIERS = [string]$TargetDossiers
$env:TARGET_AUDIENCE = [string]$TargetAudience
$env:TARGET_DILIGENCE = [string]$TargetDiligence
$env:BENCH_DURATION_MS = [string]$DurationMs
$env:BENCH_PORT = [string]$BenchPort
$env:BENCH_USE_FIXED_APP_USERS = '1'

node (Join-Path $PSScriptRoot 'real_concurrent_runner.js')
