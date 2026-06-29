# LEATrace Windows Restore Manager
# Target: Windows Powershell

$ErrorActionPreference = "Continue"

Write-Host "=========================================================" -ForegroundColor Red
Write-Host "          LEATRACE DATABASE RESTORATION                  " -ForegroundColor Red
Write-Host "=========================================================" -ForegroundColor Red

$backupDir = "C:\var\backups\leatrace"
if (-not (Test-Path $backupDir)) {
    Write-Host "  [-] Error: Backup directory not found." -ForegroundColor Red
    Exit 1
}

$latestBackup = Get-ChildItem $backupDir -Filter "leatrace_db_*.db" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($latestBackup) {
    Write-Host "  -> Restoring latest backup: $($latestBackup.FullName)" -ForegroundColor Green
    $sqliteDb = Join-Path $PSScriptRoot "..\..\backend\leatrace.db"
    Copy-Item -Path $latestBackup.FullName -Destination $sqliteDb -Force
    Write-Host "  [+] Restore completed successfully." -ForegroundColor Green
} else {
    Write-Host "  [-] No database backup archives found." -ForegroundColor Yellow
}

Write-Host "=========================================================" -ForegroundColor Red
