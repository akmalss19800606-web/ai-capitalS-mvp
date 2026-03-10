Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FIX: Remove false Article 179 tax claim"  -ForegroundColor Cyan
Write-Host "  FIX: Add Islamic Finance to Sidebar"       -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = "C:\ai-capitalS-mvp"

# ============================================================
# STEP 1: Fix backend — replace zakat_service.py
# ============================================================
Write-Host "[1/5] Deploying corrected zakat_service.py ..." -ForegroundColor Yellow

$pyScript = "$ROOT\fix_tax_deploy_backend.py"
if (Test-Path $pyScript) {
    docker cp $pyScript ai_capital_backend:/tmp/deploy_zakat.py
    docker exec ai_capital_backend python3 /tmp/deploy_zakat.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Backend zakat_service.py updated in container" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Backend deploy failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  [ERROR] $pyScript not found!" -ForegroundColor Red
    exit 1
}

# Also update host copy for git
docker cp ai_capital_backend:/app/app/services/zakat_service.py "$ROOT\app\services\zakat_service.py"
Write-Host "  [OK] Host copy updated: app\services\zakat_service.py" -ForegroundColor Green

# ============================================================
# STEP 2: Fix frontend — decode page.tsx via backend Python,
#         then copy to host frontend source dir
# ============================================================
Write-Host "[2/5] Deploying corrected islamic-finance/page.tsx ..." -ForegroundColor Yellow

$pyFrontScript = "$ROOT\fix_tax_deploy_frontend.py"
if (Test-Path $pyFrontScript) {
    # Use backend container (has Python) to decode base64 -> /tmp/page.tsx
    docker cp $pyFrontScript ai_capital_backend:/tmp/deploy_page.py
    docker exec ai_capital_backend python3 /tmp/deploy_page.py
    if ($LASTEXITCODE -eq 0) {
        # Copy decoded file from backend container to host
        $targetDir = "$ROOT\frontend\app\islamic-finance"
        if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
        docker cp ai_capital_backend:/tmp/page.tsx "$targetDir\page.tsx"
        Write-Host "  [OK] Frontend page.tsx copied to host" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Frontend decode failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  [ERROR] $pyFrontScript not found!" -ForegroundColor Red
    exit 1
}

# ============================================================
# STEP 3: Fix Sidebar — add Islamic Finance nav item
# ============================================================
Write-Host "[3/5] Adding Islamic Finance to sidebar ..." -ForegroundColor Yellow

# 3a. Sidebar.tsx
$sp = "$ROOT\frontend\components\Sidebar.tsx"
$sc = Get-Content $sp -Raw -Encoding UTF8
if ($sc -match "islamic-finance") {
    Write-Host "  [SKIP] already in Sidebar" -ForegroundColor DarkYellow
} else {
    $ni = "      { labelKey: 'islamicFinance', path: '/islamic-finance',`n        icon: <Icon paths={<><path d=""M12 2L2 7l10 5 10-5z""/><path d=""M2 17l10 5 10-5""/><path d=""M12 12v10""/><path d=""M7 9.5v7""/><path d=""M17 9.5v7""/></>} /> },"
    $sc = $sc.Replace("      { labelKey: 'marketUz',", "$ni`n      { labelKey: 'marketUz',")
    [System.IO.File]::WriteAllText($sp, $sc, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] Sidebar.tsx" -ForegroundColor Green
}

# 3b. en.ts
$enp = "$ROOT\frontend\lib\locales\en.ts"
$ec = Get-Content $enp -Raw -Encoding UTF8
if (-not ($ec -match "islamicFinance")) {
    $ec = $ec.Replace("stockExchange:", "islamicFinance: 'Islamic Finance',`n      stockExchange:")
    [System.IO.File]::WriteAllText($enp, $ec, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] en.ts" -ForegroundColor Green
}

# 3c. uz.ts
$uzp = "$ROOT\frontend\lib\locales\uz.ts"
$uc = Get-Content $uzp -Raw -Encoding UTF8
if (-not ($uc -match "islamicFinance")) {
    $uc = $uc.Replace("stockExchange:", "islamicFinance: 'Islom moliyasi',`n      stockExchange:")
    [System.IO.File]::WriteAllText($uzp, $uc, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] uz.ts" -ForegroundColor Green
}

# 3d. ru.ts
$rup = "$ROOT\frontend\lib\locales\ru.ts"
$rc = Get-Content $rup -Raw -Encoding UTF8
if (-not ($rc -match "islamicFinance")) {
    $label = [char]0x0418 + [char]0x0441 + [char]0x043B + [char]0x0430 + [char]0x043C + [char]0x0441 + [char]0x043A + [char]0x0438 + [char]0x0435 + " " + [char]0x0444 + [char]0x0438 + [char]0x043D + [char]0x0430 + [char]0x043D + [char]0x0441 + [char]0x044B
    $rc = $rc.Replace("stockExchange:", "islamicFinance: '$label',`n      stockExchange:")
    [System.IO.File]::WriteAllText($rup, $rc, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] ru.ts" -ForegroundColor Green
}

# ============================================================
# STEP 4: Rebuild frontend (source files changed on host)
# ============================================================
Write-Host "[4/5] Rebuilding frontend container ..." -ForegroundColor Yellow
Set-Location $ROOT
docker compose build frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Frontend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Frontend rebuilt" -ForegroundColor Green

# ============================================================
# STEP 5: Restart containers
# ============================================================
Write-Host "[5/5] Restarting containers ..." -ForegroundColor Yellow
docker compose up -d

Write-Host ""
Write-Host "Waiting 25 sec for containers to start ..." -ForegroundColor Yellow
Start-Sleep -Seconds 25

# ============================================================
# VERIFICATION
# ============================================================
Write-Host ""
Write-Host "========== VERIFICATION ==========" -ForegroundColor Cyan

Write-Host "Backend check:"
docker exec ai_capital_backend python3 -c "
with open('/app/app/services/zakat_service.py', 'r') as f:
    c = f.read()
ok = 0
if '179' not in c:
    print('  [OK] Article 179 removed')
    ok += 1
else:
    print('  [FAIL] Article 179 still present')
if 'uzbekistan_tax' not in c:
    print('  [OK] uzbekistan_tax removed')
    ok += 1
else:
    print('  [FAIL] uzbekistan_tax still present')
print(f'  Backend: {ok}/2 checks passed')
"

Write-Host ""
Write-Host "Frontend check:"
docker exec ai_capital_frontend node -e "
const fs = require('fs');
try {
  const files = require('child_process').execSync('find /app -name page.js -path *islamic-finance*').toString().trim().split('\n');
  console.log('  Found compiled pages: ' + files.length);
} catch(e) {}
"

Write-Host ""
Write-Host "API endpoint check:"
docker exec ai_capital_backend python3 -c "
import asyncio, json, sys
sys.path.insert(0, '/app')
from app.services.zakat_service import calculate_zakat
async def test():
    r = await calculate_zakat({'cash': 100000000}, currency='UZS')
    if 'uzbekistan_tax' in r:
        print('  [FAIL] API still returns uzbekistan_tax')
    else:
        print('  [OK] API no longer returns uzbekistan_tax')
    print(f'  Zakat amount: {r[\"zakat_display\"]}')
asyncio.run(test())
"

Write-Host ""
Write-Host "========== ALL DONE ==========" -ForegroundColor Green
Write-Host ""
Write-Host "Changes:" -ForegroundColor White
Write-Host "  1. Removed false Article 179 tax claim" -ForegroundColor White
Write-Host "  2. Removed tax benefits card from UI" -ForegroundColor White
Write-Host "  3. Added Islamic Finance to sidebar" -ForegroundColor White
Write-Host "  4. Updated locale files (ru, en, uz)" -ForegroundColor White
Write-Host ""
Write-Host "Test: http://localhost:10000/islamic-finance" -ForegroundColor Cyan
