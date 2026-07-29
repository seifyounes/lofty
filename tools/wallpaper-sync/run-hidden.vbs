' Launches the sync service with no console window at all.
' Task Scheduler's -Hidden still flashes a console for a console app on logon;
' WScript.Shell.Run with intWindowStyle 0 never does.
Option Explicit
Dim shell, here, node, script
Set shell = CreateObject("WScript.Shell")
here = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
node = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
script = here & "service.mjs"
shell.Run """" & node & """ """ & script & """", 0, False
