Write-Host "=== Git Commit: Stage 5 fixes ===" -ForegroundColor Cyan
Set-Location "C:\ai-capitalS-mvp"

git add app/services/zakat_service.py
git add frontend/app/islamic-finance/page.tsx
git add frontend/components/Sidebar.tsx
git add frontend/lib/locales/ru.ts
git add frontend/lib/locales/en.ts
git add frontend/lib/locales/uz.ts

git status

Write-Host ""
$msg = "Stage 5 fixes: remove false Art.179 tax claim, add Islamic Finance to sidebar"
git commit -m $msg
git push origin main

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
