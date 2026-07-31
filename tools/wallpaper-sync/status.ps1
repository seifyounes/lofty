# Quick health check for the Lofty wallpaper sync service.
#   powershell -ExecutionPolicy Bypass -File tools\wallpaper-sync\status.ps1

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

# "wallpaper attached" above only means an SSE client is connected. When Explorer
# restarts it destroys the desktop window Lively parents the player into: the
# player keeps running and keeps receiving updates while painting into nothing,
# so every other line here still reads healthy and the desktop shows the plain
# Windows wallpaper. The only honest test is whether the player still owns a
# visible child window of Progman/WorkerW.
$player = Get-Process -Name "Lively.Player.WebView2" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $player) {
  Write-Output "desktop  : player NOT running - start Lively"
} else {
  if (-not ("LoftyDesk" -as [type])) {
    Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class LoftyDesk {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  public static string Cls(IntPtr h) { var sb = new StringBuilder(256); GetClassName(h, sb, 256); return sb.ToString(); }
}
"@
  }
  $hosts = @()
  $onTop = [LoftyDesk+EnumProc] {
    param($h, $l)
    $c = [LoftyDesk]::Cls($h)
    if ($c -eq "WorkerW" -or $c -eq "Progman") { $script:hosts += $h }
    return $true
  }
  [void][LoftyDesk]::EnumWindows($onTop, [IntPtr]::Zero)

  $script:attached = 0
  $pid0 = $player.Id
  foreach ($hw in $hosts) {
    $onChild = [LoftyDesk+EnumProc] {
      param($h, $l)
      $owner = 0
      [void][LoftyDesk]::GetWindowThreadProcessId($h, [ref]$owner)
      if ($owner -eq $pid0 -and [LoftyDesk]::IsWindowVisible($h)) { $script:attached++ }
      return $true
    }
    [void][LoftyDesk]::EnumChildWindows($hw, $onChild, $hw)
  }

  if ($script:attached -gt 0) {
    Write-Output "desktop  : painting ($($script:attached) visible windows on the desktop layer)"
  } else {
    $exp = Get-Process -Name "explorer" -ErrorAction SilentlyContinue | Select-Object -First 1
    $why = if ($exp -and $exp.StartTime -gt $player.StartTime) { " (Explorer restarted after Lively)" } else { "" }
    Write-Output "desktop  : ORPHANED - player is running but not on the desktop$why"
    Write-Output "           fix: Stop-Process -Name Lively* -Force; then start"
    Write-Output "           'C:\Program Files\Lively Wallpaper\Lively.exe'"
  }
}

Write-Output "log      : $(Join-Path $env:USERPROFILE '.lofty-sync\log.txt')"
