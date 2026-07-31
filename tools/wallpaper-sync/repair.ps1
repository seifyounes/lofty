# One-click repair for the Lofty desktop wallpaper.
#
# This is what the desktop shortcut runs. Safe to run at any time: when
# everything is already working it changes nothing and says so.
#
#   powershell -ExecutionPolicy Bypass -File tools\wallpaper-sync\repair.ps1
#   ... -Quiet     no dialog, console output only (for scripted/scheduled runs)
#
# It fixes the two ways the wallpaper goes dark:
#   1. the sync service is not running   -> start the logon task
#   2. Lively is orphaned or not running -> restart Lively
#
# ASCII only in this file: PowerShell 5.1 reads BOM-less UTF-8 as ANSI, and a
# multi-byte character inside a string can corrupt the parse of the whole block.

param([switch]$Quiet)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "lib-desktop.ps1")

$taskName = "LoftyWallpaperSync"
$config   = Join-Path $env:USERPROFILE ".lofty-sync\config.json"
$lively   = Join-Path $env:ProgramFiles "Lively Wallpaper\Lively.exe"
$steps    = @()
$problems = @()

function Note($text) { $script:steps += $text; Write-Output $text }
function Fail($text) { $script:problems += $text; Write-Output $text }

# --- 1. the sync service ----------------------------------------------------
if (-not (Test-Path $config)) {
  Fail "Sync is not installed yet - run install.ps1 first."
} else {
  $listening = Get-NetTCPConnection -LocalPort 47821 -State Listen -ErrorAction SilentlyContinue
  if ($listening) {
    Note "Sync service: already running."
  } else {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if (-not $task) {
      Fail "Sync service is down and the logon task is missing - run install.ps1."
    } else {
      Note "Sync service was down - starting it."
      Start-ScheduledTask -TaskName $taskName
      $waited = 0
      while ($waited -lt 20 -and -not (Get-NetTCPConnection -LocalPort 47821 -State Listen -ErrorAction SilentlyContinue)) {
        Start-Sleep -Seconds 2
        $waited += 2
      }
      if (Get-NetTCPConnection -LocalPort 47821 -State Listen -ErrorAction SilentlyContinue) {
        Note "Sync service: back up."
      } else {
        Fail "Sync service did not come up - see .lofty-sync\log.txt"
      }
    }
  }
}

# --- 2. the wallpaper on the desktop ----------------------------------------
# Note: "Lively.exe setwp --file ..." does NOT re-parent an orphaned player
# (this install ships no Livelycu.exe, so the command is silently ignored).
# A full restart is the only thing that works; Lively restores whatever is in
# WallpaperLayout.json on launch.
$state = Get-LoftyDesktopState

if ($state.Healthy) {
  Note "Wallpaper: already on the desktop."
} else {
  if (-not (Test-Path $lively)) {
    Fail "Lively Wallpaper is not installed at $lively"
  } else {
    if (-not $state.PlayerRunning) {
      Note "Wallpaper: Lively was not running - starting it."
    } elseif ($state.ExplorerNewer) {
      Note "Wallpaper: orphaned by an Explorer restart - restarting Lively."
    } else {
      Note "Wallpaper: running but not on the desktop - restarting Lively."
    }

    Get-Process -Name "Lively", "Lively.Player.WebView2", "Lively.Watchdog", "Lively.UI.WinUI" `
      -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 3
    Start-Process $lively

    $waited = 0
    do {
      Start-Sleep -Seconds 3
      $waited += 3
      $state = Get-LoftyDesktopState
    } while (-not $state.Healthy -and $waited -lt 30)

    if ($state.Healthy) {
      Note "Wallpaper: restored."
    } else {
      Fail "Lively restarted but the wallpaper is still not on the desktop. Open Lively and pick the Lofty wallpaper."
    }
  }
}

# --- 3. is it showing current ideas? ----------------------------------------
if (Test-Path $config) {
  try {
    $cfg = Get-Content $config -Raw | ConvertFrom-Json
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:47821/v1/ping?t=$($cfg.token)" -TimeoutSec 4
    if ($r.wallpaperClients -gt 0) {
      Note "Connected to your site: showing $($r.ideas) ideas (update $($r.generation))."
    } else {
      Note "Showing the last saved wall; it will reconnect on its own."
    }
  } catch {
    Fail "Could not reach the sync service to confirm."
  }
}

# --- report -----------------------------------------------------------------
if (-not $Quiet) {
  $ok = $problems.Count -eq 0
  $title = if ($ok) { "Lofty wallpaper" } else { "Lofty wallpaper - needs attention" }
  $icon = if ($ok) { "Information" } else { "Warning" }
  $body = (($steps + $problems) -join "`r`n")
  Add-Type -AssemblyName System.Windows.Forms
  [void][System.Windows.Forms.MessageBox]::Show($body, $title, "OK", $icon)
}

if ($problems.Count -gt 0) { exit 1 }
