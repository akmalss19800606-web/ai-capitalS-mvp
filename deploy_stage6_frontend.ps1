# Stage 6 Frontend: Portfolio Analytics + Sidebar + i18n
# Run from: C:\ai-capitalS-mvp
# powershell -ExecutionPolicy Bypass -File .\deploy_stage6_frontend.ps1

$ErrorActionPreference = "Stop"
$ROOT = "C:\ai-capitalS-mvp"

Write-Host "=== Stage 6 Frontend: Portfolio Analytics ===" -ForegroundColor Cyan
Write-Host ""

# 1. Run Python deploy script
Write-Host "[1/3] Running deploy script..." -ForegroundColor Yellow
Push-Location $ROOT
python3 deploy_stage6_frontend.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Trying with 'python' command..." -ForegroundColor Yellow
    python deploy_stage6_frontend.py
}
Pop-Location

# 2. Rebuild frontend
Write-Host ""
Write-Host "[2/3] Rebuilding frontend container..." -ForegroundColor Yellow
Push-Location $ROOT
docker compose build frontend
docker compose up -d
Pop-Location

# 3. Wait and check
Write-Host ""
Write-Host "[3/3] Waiting 25 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 25

$health = docker exec ai_capital_frontend curl -s http://localhost:3000 2>$null
if ($health) {
    Write-Host "  [OK] Frontend is up!" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Frontend may still be starting. Wait a few more seconds." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Open: http://localhost:10000/portfolio-analytics" -ForegroundColor White
Write-Host "Sidebar: Analytics > Portfolio Analytics" -ForegroundColor White
