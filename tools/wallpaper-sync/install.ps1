# Installs the Lofty wallpaper sync service as a logon task and prints the
# token to paste into the app's /settings page.
#
#   powershell -ExecutionPolicy Bypass -File tools\wallpaper-sync\install.ps1
#
# No admin rights needed. Re-running is safe: it replaces the task in place.

$ErrorActionPreference = "Stop"

$here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs     = Join-Path $here "run-hidden.vbs"
$service = Join-Path $here "service.mjs"
# NOT under AppData: Windows virtualizes AppData writes for packaged apps, so
# two processes can silently see two different config files (and two different
# tokens). The user-profile root is never redirected.
$homeDir = Join-Path $env:USERPROFILE ".lofty-sync"
$config  = Join-Path $homeDir "config.json"
$taskName = "LoftyWallpaperSync"

if (-not (Test-Path $service)) { throw "service.mjs not found at $service" }

New-Item -ItemType Directory -Force -Path $homeDir | Out-Null

# --- config + token ---------------------------------------------------------
if (Test-Path $config) {
  $cfg = Get-Content $config -Raw | ConvertFrom-Json
} else {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $token = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
  $cfg = [ordered]@{
    token     = $token
    livelyDir = Join-Path $env:LOCALAPPDATA "Lively Wallpaper\Library\wallpapers\lofty-galaxy"
    origins   = @("https://lofty-two.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000")
  }
  ($cfg | ConvertTo-Json -Depth 5) | Out-File -FilePath $config -Encoding utf8
  Write-Output "created $config"
}

# --- scheduled task ---------------------------------------------------------
# Every one of these settings overrides a default that would otherwise kill the
# service silently: the 3-day execution limit, and stopping when unplugged.
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument ('"{0}"' -f $vbs)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$trigger.Delay = "PT15S"
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 5 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew `
  -Hidden

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Settings $settings -Description "Mirrors the Lofty idea wall onto the desktop wallpaper." `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3

# --- report -----------------------------------------------------------------
$listening = Get-NetTCPConnection -LocalPort 47821 -State Listen -ErrorAction SilentlyContinue
Write-Output ""
Write-Output "task      : $taskName ($(if ($listening) { 'listening on 47821' } else { 'NOT listening yet' }))"
Write-Output "config    : $config"
Write-Output "lively    : $($cfg.livelyDir)"
Write-Output "log       : $(Join-Path $homeDir 'log.txt')"
Write-Output ""
Write-Output "Token (paste into /settings in the browser):"
Write-Output $cfg.token
