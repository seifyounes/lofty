# Shared probe: is Lively's wallpaper actually painting on the desktop?
#
# Dot-source this (. "$here\lib-desktop.ps1") to get Get-LoftyDesktopState.
#
# Why this exists: the service can be perfectly healthy while the wallpaper is
# invisible. When Explorer restarts it destroys the desktop window Lively
# parents its player into. The player process survives, keeps its SSE
# connection and keeps applying updates -- into a window attached to nothing.
# The only honest test is whether the player still owns a visible child window
# of Progman/WorkerW.
#
# ASCII only in this file: PowerShell 5.1 reads BOM-less UTF-8 as ANSI, and a
# multi-byte character inside a string can corrupt the parse of the whole block.

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

function Get-LoftyDesktopState {
  $player = Get-Process -Name "Lively.Player.WebView2" -ErrorAction SilentlyContinue | Select-Object -First 1
  $explorer = Get-Process -Name "explorer" -ErrorAction SilentlyContinue | Select-Object -First 1

  if (-not $player) {
    return [pscustomobject]@{
      PlayerRunning = $false; PlayerPid = 0; Attached = 0; ExplorerNewer = $false; Healthy = $false
    }
  }

  $explorerNewer = $false
  try {
    if ($explorer -and $explorer.StartTime -gt $player.StartTime) { $explorerNewer = $true }
  } catch { }

  # EnumWindows only walks top-level windows, and the wallpaper is a *child* of
  # the desktop host -- so collect the hosts first, then look inside them.
  $script:loftyHosts = @()
  $onTop = [LoftyDesk+EnumProc] {
    param($h, $l)
    $c = [LoftyDesk]::Cls($h)
    if ($c -eq "WorkerW" -or $c -eq "Progman") { $script:loftyHosts += $h }
    return $true
  }
  [void][LoftyDesk]::EnumWindows($onTop, [IntPtr]::Zero)

  $script:loftyHits = 0
  $script:loftyTarget = $player.Id
  foreach ($hw in $script:loftyHosts) {
    $onChild = [LoftyDesk+EnumProc] {
      param($h, $l)
      $owner = 0
      [void][LoftyDesk]::GetWindowThreadProcessId($h, [ref]$owner)
      if ($owner -eq $script:loftyTarget -and [LoftyDesk]::IsWindowVisible($h)) { $script:loftyHits++ }
      return $true
    }
    [void][LoftyDesk]::EnumChildWindows($hw, $onChild, $hw)
  }

  return [pscustomobject]@{
    PlayerRunning = $true
    PlayerPid     = $player.Id
    Attached      = $script:loftyHits
    ExplorerNewer = $explorerNewer
    Healthy       = ($script:loftyHits -gt 0)
  }
}
