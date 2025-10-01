#!/usr/bin/env pwsh
# Run the fetch_standings.py script and log output. Intended for Windows Task Scheduler.
try {
    $ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
} catch {
    $ScriptRoot = Split-Path -Parent $PSCommandPath
}

$Url = 'https://www.simracerhub.com/scoring/season_standings.php?series_id=10554&ifn=1'
$LogDir = Join-Path $ScriptRoot '..\logs'
New-Item -Path $LogDir -ItemType Directory -Force | Out-Null
$LogFile = Join-Path $LogDir ("update_standings_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

Write-Output "Starting standings update: $(Get-Date)" | Tee-Object -FilePath $LogFile
& python (Join-Path $ScriptRoot 'fetch_standings.py') $Url 2>&1 | Tee-Object -FilePath $LogFile
$LASTEXITCODE | Out-File -FilePath $LogFile -Append
Write-Output "Finished standings update: $(Get-Date)" | Tee-Object -FilePath $LogFile
