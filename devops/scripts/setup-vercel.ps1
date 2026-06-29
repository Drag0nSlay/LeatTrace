# LEATrace Vercel Cloud Onboarding Wizard
# Target: Windows Powershell

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "          LEATRACE VERCEL DEPLOYMENT CONFIG              " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Check if Vercel CLI is installed
$hasVercel = Get-Command "vercel" -ErrorAction SilentlyContinue
if ($hasVercel) {
    Write-Host "[VERCEL] Vercel CLI detected." -ForegroundColor Green
    Write-Host "  -> Run 'vercel login' to authenticate your account." -ForegroundColor White
    Write-Host "  -> Run 'vercel' in the frontend directory to link your project." -ForegroundColor White
} else {
    Write-Host "  [-] Vercel CLI is missing." -ForegroundColor Yellow
    Write-Host "  -> To install, run: npm install -g vercel" -ForegroundColor White
}

# Write env variables templates
$envTemplatePath = Join-Path $PSScriptRoot "..\..\frontend\.env.example"
$envContent = @"
VITE_API_URL=https://api.leatrace.cybercrime.gov.in
VITE_WS_URL=wss://api.leatrace.cybercrime.gov.in/api/streaming
"@
$envContent | Out-File $envTemplatePath -Encoding ascii -Force
Write-Host "  [+] Created Vercel environment variables template (.env.example)." -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
