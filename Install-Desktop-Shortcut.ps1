# Creates a "Quick Reading Viewer" shortcut on your desktop that runs Start-Viewer.ps1.
# Run once:  powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Desktop-Shortcut.ps1
$ErrorActionPreference = 'Stop'
$target  = Join-Path $PSScriptRoot 'Start-Viewer.ps1'
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk     = Join-Path $desktop 'Quick Reading Viewer.lnk'
$shell = New-Object -ComObject WScript.Shell
$s = $shell.CreateShortcut($lnk)
$s.TargetPath       = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$s.Arguments        = "-NoProfile -ExecutionPolicy Bypass -File `"$target`""
$s.WorkingDirectory = $PSScriptRoot
$s.WindowStyle      = 7   # start minimised
$s.IconLocation     = (Join-Path $env:SystemRoot 'System32\imageres.dll') + ',112'
$s.Description      = 'Start the Quick Reading of Courseware viewer'
$s.Save()
Write-Host "Shortcut created: $lnk" -ForegroundColor Green
