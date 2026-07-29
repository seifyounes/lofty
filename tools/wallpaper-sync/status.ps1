# Quick health check for the Lofty wallpaper sync service.
#   powershell -ExecutionPolicy Bypass -File tools\wallpaper-sync\status.ps1

$config = Join-Path $env:USERPROFILE ".lofty-sync\config.json"
if (-not (Test-Path $config)) { Write-Output "not installed (no $config) — run install.ps1"; exit 1 }
$cfg = Get-Content $config -Raw | ConvertFrom-Json

$task = Get-ScheduledTask -TaskName "LoftyWallpaperSync" -ErrorAction SilentlyContinue
Write-Output "task     : $(if ($task) { $task.State } else { 'NOT REGISTERED' })"

$listen = Get-NetTCPConnection -LocalPort 47821 -State Listen -ErrorAction SilentlyContinue
Write-Output "port     : $(if ($listen) { '47821 listening' } else { 'not listening' })"

try {
  $r = Invoke-RestMethod -Uri "http://127.0.0.1:47821/v1/ping?t=$($cfg.token)" -TimeoutSec 4
  Write-Output "service  : ok — update $($r.generation), $($r.ideas) ideas, wallpaper attached: $($r.wallpaperClients -gt 0)"
  if ($r.lastError) { Write-Output "lastError: $($r.lastError)" }
} catch {
  Write-Output "service  : unreachable ($($_.Exception.Message))"
}
Write-Output "log      : $(Join-Path $env:USERPROFILE '.lofty-sync\log.txt')"
