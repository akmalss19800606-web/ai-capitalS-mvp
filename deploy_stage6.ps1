Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  STAGE 6: Portfolio Analytics Engine"        -ForegroundColor Cyan
Write-Host "  DCF/NPV/IRR + What-If + Monte Carlo"       -ForegroundColor Cyan
Write-Host "  + 52 Business Cases for Uzbekistan"         -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = "C:\ai-capitalS-mvp"

# ============================================================
# STEP 1: Deploy backend files
# ============================================================
Write-Host "[1/4] Deploying backend files ..." -ForegroundColor Yellow

$deployScript = "$ROOT\deploy_stage6.py"
if (-not (Test-Path $deployScript)) {
    Write-Host "  [ERROR] deploy_stage6.py not found at $deployScript" -ForegroundColor Red
    exit 1
}

docker cp $deployScript ai_capital_backend:/tmp/deploy_stage6.py
docker exec ai_capital_backend python3 /tmp/deploy_stage6.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Backend deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Backend files deployed + main.py patched" -ForegroundColor Green

# ============================================================
# STEP 2: Copy to host for git
# ============================================================
Write-Host "[2/4] Updating host files ..." -ForegroundColor Yellow

# Copy files from container to host
$svcDir = "$ROOT\app\services"
$routerDir = "$ROOT\app\api\v1\routers"

docker cp ai_capital_backend:/app/app/services/portfolio_analytics_service.py "$svcDir\portfolio_analytics_service.py"
docker cp ai_capital_backend:/app/app/api/v1/routers/portfolio_analytics.py "$routerDir\portfolio_analytics.py"
docker cp ai_capital_backend:/app/app/main.py "$ROOT\app\main.py"

Write-Host "  [OK] Host files updated" -ForegroundColor Green

# ============================================================
# STEP 3: Rebuild backend (main.py changed)
# ============================================================
Write-Host "[3/4] Rebuilding backend ..." -ForegroundColor Yellow
Set-Location $ROOT
docker compose build backend
docker compose up -d

Write-Host ""
Write-Host "Waiting 15 sec ..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# ============================================================
# STEP 4: Run tests
# ============================================================
Write-Host "[4/4] Running tests ..." -ForegroundColor Yellow

$testScript = "$ROOT\test_stage6.py"
if (Test-Path $testScript) {
    docker cp $testScript ai_capital_backend:/tmp/test_stage6.py
    docker exec ai_capital_backend python3 /tmp/test_stage6.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] All tests passed!" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Some tests failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [SKIP] test_stage6.py not found" -ForegroundColor DarkYellow
}

# ============================================================
# API CHECK
# ============================================================
Write-Host ""
Write-Host "========== API CHECK ==========" -ForegroundColor Cyan

docker exec ai_capital_backend python3 -c "
import requests
base = 'http://localhost:8000/api/v1'

# Check business cases
try:
    # Use internal import instead of HTTP
    import sys
    sys.path.insert(0, '/app')
    from app.services.portfolio_analytics_service import get_business_cases
    cases = get_business_cases()
    print(f'  Business cases: {len(cases)}')
    cats = set(c[\"category\"] for c in cases)
    for cat in sorted(cats):
        n = sum(1 for c in cases if c[\"category\"] == cat)
        print(f'    {cat}: {n}')
except Exception as e:
    print(f'  Error: {e}')
"

Write-Host ""
Write-Host "========== DONE ==========" -ForegroundColor Green
Write-Host ""
Write-Host "Stage 6 deployed:" -ForegroundColor White
Write-Host "  - DCF/NPV/IRR calculator" -ForegroundColor White
Write-Host "  - What-If scenario analysis" -ForegroundColor White
Write-Host "  - Monte Carlo simulation (UZ calibrated)" -ForegroundColor White
Write-Host "  - 52 business cases for Uzbekistan" -ForegroundColor White
Write-Host ""
Write-Host "API endpoints:" -ForegroundColor Cyan
Write-Host "  POST /api/v1/portfolio-analytics/dcf" -ForegroundColor White
Write-Host "  POST /api/v1/portfolio-analytics/what-if" -ForegroundColor White
Write-Host "  POST /api/v1/portfolio-analytics/monte-carlo" -ForegroundColor White
Write-Host "  GET  /api/v1/portfolio-analytics/business-cases" -ForegroundColor White
Write-Host "  GET  /api/v1/portfolio-analytics/business-cases/{id}" -ForegroundColor White
Write-Host "  POST /api/v1/portfolio-analytics/business-cases/{id}/calculate" -ForegroundColor White
Write-Host ""
Write-Host "Swagger: http://localhost:8000/docs" -ForegroundColor Cyan
