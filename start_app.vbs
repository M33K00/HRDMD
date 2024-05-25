Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c start_app.bat", 0
Set WshShell = Nothing