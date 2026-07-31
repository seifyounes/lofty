# Puts a "Fix Lofty Wallpaper" icon on the desktop.
#
#   powershell -ExecutionPolicy Bypass -File tools\wallpaper-sync\install-shortcut.ps1
#
# Clicking it runs repair.ps1: starts the sync service if it is down, restarts
# Lively if the wallpaper has been orphaned, then reports what it did. No admin
# rights needed. Re-running replaces the shortcut in place.
#
# ASCII only in this file: PowerShell 5.1 reads BOM-less UTF-8 as ANSI, and a
# multi-byte character inside a string can corrupt the parse of the whole block.

$ErrorActionPreference = "Stop"

$here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs     = Join-Path $here "repair-hidden.vbs"
$maker   = Join-Path $here "make-icon.mjs"
$homeDir = Join-Path $env:USERPROFILE ".lofty-sync"
$icon    = Join-Path $homeDir "lofty.ico"
$link    = Join-Path ([Environment]::GetFolderPath("Desktop")) "Fix Lofty Wallpaper.lnk"

if (-not (Test-Path $vbs)) { throw "repair-hidden.vbs not found at $vbs" }

New-Item -ItemType Directory -Force -Path $homeDir | Out-Null

# --- icon -------------------------------------------------------------------
# Generated rather than committed, so it always tracks the current brand art.
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = Join-Path $env:ProgramFiles "nodejs\node.exe" }
if (Test-Path $node) {
  & $node $maker $icon
} else {
  Write-Output "node not found - skipping icon (the shortcut will use the default one)"
}

# --- shortcut ---------------------------------------------------------------
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($link)
$sc.TargetPath       = Join-Path $env:SystemRoot "System32\wscript.exe"
$sc.Arguments        = '"{0}"' -f $vbs
$sc.WorkingDirectory = $here
$sc.Description      = "Reconnect the Lofty balloons to the desktop background"
if (Test-Path $icon) { $sc.IconLocation = "$icon,0" }
$sc.Save()

Write-Output ""
Write-Output "shortcut : $link"
Write-Output "runs     : $vbs"
Write-Output "icon     : $(if (Test-Path $icon) { $icon } else { 'default' })"
Write-Output ""
Write-Output "Double-click it any time the balloons are missing from the desktop."
