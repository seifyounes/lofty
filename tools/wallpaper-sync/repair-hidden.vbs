' Runs repair.ps1 with no console window at all.
' powershell.exe -WindowStyle Hidden still flashes a console for a moment;
' WScript.Shell.Run with intWindowStyle 0 never does. The result dialog that
' repair.ps1 shows at the end is a GUI window, so it still appears.
Option Explicit
Dim shell, here, cmd
Set shell = CreateObject("WScript.Shell")
here = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & here & "repair.ps1"""
shell.Run cmd, 0, False
