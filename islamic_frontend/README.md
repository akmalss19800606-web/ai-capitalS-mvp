# Frontend Этап 1 — Исламские финансы

## Структура файлов

### Страницы (app/)
- `islamic-finance/page.tsx` → Shell /islamic-finance
- `islamic-finance/zakat/page.tsx` → Закят
- `islamic-finance/screening/page.tsx` → Скрининг
- `islamic-finance/glossary/page.tsx` → Глоссарий
- `islamic-finance/glossary/[slug]/page.tsx` → Термин
- `islamic-finance/references/page.tsx` → Стандарты

### Компоненты (components/islamic/)
- `api.ts` → API клиент
- `IslamicModeSwitcher.tsx`
- `NisabCard.tsx`
- `ZakatCalculatorForm.tsx`
- `ZakatResultCard.tsx`
- `ZakatHistoryTable.tsx`
- `ShariahStatusBadge.tsx`
- `CompanySearchInput.tsx`
- `ScreeningResultCard.tsx`
- `GlossaryTermCard.tsx`
- `StandardRefBadge.tsx`
- `CurrencyDisplay.tsx`

## Команды копирования (из C:\ai-capitalS-mvp)

### Создать папки
```powershell
New-Item -ItemType Directory -Force -Path "frontend\app\islamic-finance"
New-Item -ItemType Directory -Force -Path "frontend\app\islamic-finance\zakat"
New-Item -ItemType Directory -Force -Path "frontend\app\islamic-finance\screening"
New-Item -ItemType Directory -Force -Path "frontend\app\islamic-finance\glossary\[slug]"
New-Item -ItemType Directory -Force -Path "frontend\app\islamic-finance\references"
New-Item -ItemType Directory -Force -Path "frontend\components\islamic"
```
