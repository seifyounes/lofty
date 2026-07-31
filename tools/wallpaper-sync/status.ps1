# Quick health check for the Lofty wallpaper sync service.
#   powershell -ExecutionPolicy Bypass -File tools\wallpaper-sync\status.ps1

$here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$config = Join-Path $env:USERPROFILE ".lofty-sync\config.json"
# ASCII only in this file: PowerShell 5.1 reads BOM-less UTF-8 as ANSI, and a
# multi-byte character inside a string can corrupt the parse of the whole block.
if (-not (Test-Path $config)) { Write-Output "not installed (no $config) - run install.ps1"; exit 1 }
$cfg = Get-Content $config -Raw | ConvertFrom-Json

$task = Get-ScheduledTask -TaskName "LoftyWallpaperSync" -ErrorAction SilentlyContinue
Write-Output "task     : $(if ($task) { $task.State } else { 'NOT REGISTERED' })"

$listen = Get-NetTCPConnection -LocalPort 47821 -State Listen -ErrorAction SilentlyContinue
Write-Output "port     : $(if ($listen) { '47821 listening' } else { 'not listening' })"

try {
  $r = Invoke-RestMethod -Uri "http://127.0.0.1:47821/v1/ping?t=$($cfg.token)" -TimeoutSec 4
  Write-Output "service  : ok - update $($r.generation), $($r.ideas) ideas, wallpaper attached: $($r.wallpaperClients -gt 0)"
  if ($r.lastError) { Write-Output "lastError: $($r.lastError)" }
} catch {
  Write-Output "service  : unreachable ($($_.Exception.Message))"
}

# "wallpaper attached" above only means an SSE client is connected, which stays
# true for a wallpaper nobody can see. Get-LoftyDesktopState checks the desktop
# layer itself -- see lib-desktop.ps1 for why that is the only honest test.
. (Join-Path $here "lib-desktop.ps1")
$desk = Get-LoftyDesktopState

if (-not $desk.PlayerRunning) {
  Write-Output "desktop  : player NOT running - double-click 'Fix Lofty Wallpaper'"
} elseif ($desk.Healthy) {
  Write-Output "desktop  : painting ($($desk.Attached) visible windows on the desktop layer)"
} else {
  $why = if ($desk.ExplorerNewer) { " (Explorer restarted after Lively)" } else { "" }
  Write-Output "desktop  : ORPHANED - player is running but not on the desktop$why"
  Write-Output "           fix: double-click 'Fix Lofty Wallpaper' on the desktop"
}

Write-Output "log      : $(Join-Path $env:USERPROFILE '.lofty-sync\log.txt')"
