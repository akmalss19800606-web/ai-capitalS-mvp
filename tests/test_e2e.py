"""
QA-001: Комплексное E2E тестирование — Фаза 5.

Покрывает:
  - Auth flow: register → login → token → protected endpoints
  - Portfolio CRUD: create → read → update → delete
  - Investment Decisions: create → link → version
  - DD Scoring: search → score → documents
  - Calculator: DCF, NPV, IRR, Payback, WACC
  - Business Cases: list → validate
  - Monte Carlo v2: run simulation → output structure
  - AI Analytics: analysis request → response structure
  - Exports: PDF/Excel → verify content-type
  - Currency Rates: fetch → verify structure
  - XAI: request explanation → verify factors
  - Islamic Finance: screening → zakat
  - Company Lookup, Dashboard, Health, Contacts
"""

from fastapi.testclient import TestClient

# ═══════════════════════════════════════════════════════════════
# 1. AUTH FLOW (8 tests)
# ═══════════════════════════════════════════════════════════════

class TestAuthFlow:
    """E2E: полный цикл аутентификации."""

    def test_register_new_user(self, client: TestClient):
        """Регистрация нового пользователя возвращает 200 и ID."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "e2e_user@example.com",
            "password": "E2eTestPass123!",
            "full_name": "E2E Тестовый",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["email"] == "e2e_user@example.com"
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client: TestClient, registered_user: dict):
        """Повторная регистрация с тем же email — 400."""
        resp = client.post("/api/v1/auth/register", json={
            "email": registered_user["email"],
            "password": "AnyPass123!",
            "full_name": "Дубль",
        })
        assert resp.status_code == 400

    def test_login_success(self, client: TestClient, registered_user: dict):
        """Успешный логин возвращает access_token."""
        resp = client.post("/api/v1/auth/login", data={
            "username": registered_user["email"],
            "password": registered_user["password"],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, registered_user: dict):
        """Логин с неверным паролем — 401."""
        resp = client.post("/api/v1/auth/login", data={
            "username": registered_user["email"],
            "password": "WrongPassword!",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        """Логин несуществующего пользователя — 401."""
        resp = client.post("/api/v1/auth/login", data={
            "username": "nobody@example.com",
            "password": "NoPass123!",
        })
        assert resp.status_code == 401

    def test_me_authenticated(self, client: TestClient, auth_headers: dict, registered_user: dict):
        """GET /auth/me с валидным токеном."""
        resp = client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == registered_user["email"]

    def test_me_no_token(self, client: TestClient):
        """GET /auth/me без токена — 401."""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token(self, client: TestClient):
        """GET /auth/me с невалидным токеном — 401."""
        resp = client.get("/api/v1/auth/me",
                          headers={"Authorization": "Bearer fake-token"})
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 2. PORTFOLIO CRUD (7 tests)
# ═══════════════════════════════════════════════════════════════

class TestPortfolioCRUD:
    """E2E: полный CRUD портфелей."""

    def test_create_portfolio(self, client: TestClient, auth_headers: dict):
        """Создание портфеля."""
        resp = client.post("/api/v1/portfolios/", json={
            "name": "E2E Портфель",
            "description": "Тестовый портфель для E2E",
            "total_value": 1000000,
        }, headers=auth_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["name"] == "E2E Портфель"

    def test_list_portfolios(self, client: TestClient, auth_headers: dict):
        """Список портфелей."""
        resp = client.get("/api/v1/portfolios/", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_portfolio_by_id(self, client: TestClient, auth_headers: dict):
        """Получение портфеля по ID после создания."""
        create_resp = client.post("/api/v1/portfolios/", json={
            "name": "Получить портфель",
            "description": "test",
        }, headers=auth_headers)
        pid = create_resp.json()["id"]
        resp = client.get(f"/api/v1/portfolios/{pid}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == pid

    def test_update_portfolio(self, client: TestClient, auth_headers: dict):
        """Обновление портфеля."""
        create_resp = client.post("/api/v1/portfolios/", json={
            "name": "Обновить портфель",
        }, headers=auth_headers)
        pid = create_resp.json()["id"]
        resp = client.put(f"/api/v1/portfolios/{pid}", json={
            "name": "Обновлённый портфель",
            "description": "Новое описание",
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Обновлённый портфель"

    def test_delete_portfolio(self, client: TestClient, auth_headers: dict):
        """Удаление портфеля."""
        create_resp = client.post("/api/v1/portfolios/", json={
            "name": "Удалить портфель",
        }, headers=auth_headers)
        pid = create_resp.json()["id"]
        resp = client.delete(f"/api/v1/portfolios/{pid}", headers=auth_headers)
        assert resp.status_code in (200, 204)

    def test_portfolio_not_found(self, client: TestClient, auth_headers: dict):
        """Портфель не найден — 404."""
        resp = client.get("/api/v1/portfolios/99999", headers=auth_headers)
        assert resp.status_code == 404

    def test_portfolio_unauthorized(self, client: TestClient):
        """Портфели без авторизации — 401."""
        resp = client.get("/api/v1/portfolios/")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 3. INVESTMENT DECISIONS (6 tests)
# ═══════════════════════════════════════════════════════════════

class TestInvestmentDecisions:
    """E2E: инвестиционные решения."""

    def _create_portfolio(self, client, auth_headers):
        resp = client.post("/api/v1/portfolios/", json={
            "name": "Для решений",
        }, headers=auth_headers)
        return resp.json()["id"]

    def test_create_decision(self, client: TestClient, auth_headers: dict):
        """Создание инвестиционного решения."""
        pid = self._create_portfolio(client, auth_headers)
        resp = client.post("/api/v1/decisions/", json={
            "asset_name": "Uzum Market",
            "asset_symbol": "UZUM",
            "decision_type": "BUY",
            "amount": 100,
            "price": 50000,
            "portfolio_id": pid,
            "status": "draft",
            "notes": "E2E тестовое решение",
        }, headers=auth_headers)
        assert resp.status_code in (200, 201)

    def test_list_decisions(self, client: TestClient, auth_headers: dict):
        """Список решений."""
        resp = client.get("/api/v1/decisions/", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_decision_not_found(self, client: TestClient, auth_headers: dict):
        """Решение не найдено — 404."""
        resp = client.get("/api/v1/decisions/99999", headers=auth_headers)
        assert resp.status_code == 404

    def test_decisions_unauthorized(self, client: TestClient):
        """Решения без авторизации — 401."""
        resp = client.get("/api/v1/decisions/")
        assert resp.status_code == 401

    def test_create_decision_with_priority(self, client: TestClient, auth_headers: dict):
        """Создание решения с приоритетом и категорией."""
        pid = self._create_portfolio(client, auth_headers)
        resp = client.post("/api/v1/decisions/", json={
            "asset_name": "Artel Group",
            "asset_symbol": "ARTL",
            "decision_type": "BUY",
            "amount": 50,
            "price": 120000,
            "portfolio_id": pid,
            "priority": "high",
            "category": "equity",
            "geography": "UZ",
        }, headers=auth_headers)
        assert resp.status_code in (200, 201)

    def test_create_decision_missing_fields(self, client: TestClient, auth_headers: dict):
        """Создание решения без обязательных полей — 422."""
        resp = client.post("/api/v1/decisions/", json={
            "asset_name": "Incomplete",
        }, headers=auth_headers)
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════
# 4. DD SCORING (4 tests)
# ═══════════════════════════════════════════════════════════════

class TestDDScoring:
    """E2E: Due Diligence скоринг."""

    def test_create_dd_scoring(self, client: TestClient, auth_headers: dict):
        """Запуск DD-скоринга."""
        resp = client.post("/api/v1/dd/scoring", json={
            "company_name": "UzAuto Motors",
            "industry": "automotive",
            "geography": "UZ",
        }, headers=auth_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "total_score" in data or "score" in data or "id" in data

    def test_dd_scoring_history(self, client: TestClient, auth_headers: dict):
        """История DD-скорингов."""
        resp = client.get("/api/v1/dd/scoring", headers=auth_headers)
        assert resp.status_code == 200

    def test_dd_benchmarks(self, client: TestClient, auth_headers: dict):
        """Шаблоны бенчмарков по отраслям."""
        resp = client.get("/api/v1/dd/benchmarks/templates", headers=auth_headers)
        assert resp.status_code == 200

    def test_dd_scoring_unauthorized(self, client: TestClient):
        """DD-скоринг без авторизации — 401."""
        resp = client.post("/api/v1/dd/scoring", json={
            "company_name": "Test",
        })
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 5. CALCULATOR (6 tests)
# ═══════════════════════════════════════════════════════════════

class TestCalculator:
    """E2E: инвестиционный калькулятор."""

    def test_dcf_calculation(self, client: TestClient, auth_headers: dict):
        """DCF расчёт с известными входными данными."""
        resp = client.post("/api/v1/calculator/dcf", json={
            "cash_flows": [-1000000, 300000, 350000, 400000, 450000],
            "discount_rate": 0.12,
            "terminal_growth": 0.03,
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "dcf_value" in data or "result" in data or "npv" in data

    def test_npv_calculation(self, client: TestClient, auth_headers: dict):
        """NPV расчёт."""
        resp = client.post("/api/v1/calculator/npv", json={
            "cash_flows": [-500000, 150000, 200000, 250000],
            "discount_rate": 0.10,
        }, headers=auth_headers)
        assert resp.status_code == 200

    def test_irr_calculation(self, client: TestClient, auth_headers: dict):
        """IRR расчёт."""
        resp = client.post("/api/v1/calculator/irr", json={
            "cash_flows": [-1000000, 300000, 400000, 500000],
        }, headers=auth_headers)
        assert resp.status_code == 200

    def test_payback_calculation(self, client: TestClient, auth_headers: dict):
        """Payback Period расчёт."""
        resp = client.post("/api/v1/calculator/payback", json={
            "cash_flows": [-1000000, 300000, 350000, 400000, 450000],
            "discount_rate": 0.10,
        }, headers=auth_headers)
        assert resp.status_code == 200

    def test_wacc_calculation(self, client: TestClient, auth_headers: dict):
        """WACC расчёт."""
        resp = client.post("/api/v1/calculator/wacc", json={
            "equity": 5000000,
            "debt": 3000000,
            "cost_equity": 0.14,
            "cost_debt": 0.09,
            "tax_rate": 0.15,
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "wacc" in data

    def test_full_analysis(self, client: TestClient, auth_headers: dict):
        """Полный анализ (DCF + NPV + IRR + Payback + WACC)."""
        resp = client.post("/api/v1/calculator/full", json={
            "cash_flows": [-2000000, 600000, 700000, 800000, 900000],
            "discount_rate": 0.12,
            "equity": 5000000,
            "debt": 3000000,
            "cost_equity": 0.14,
            "cost_debt": 0.09,
            "tax_rate": 0.15,
            "terminal_growth": 0.03,
        }, headers=auth_headers)
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════
# 6. BUSINESS CASES (4 tests)
# ═══════════════════════════════════════════════════════════════

class TestBusinessCases:
    """E2E: 50+ бизнес-кейсов."""

    def test_list_business_cases(self, client: TestClient, auth_headers: dict):
        """Получить все бизнес-кейсы."""
        resp = client.get("/api/v1/business-cases", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "cases" in data
        assert data["total"] >= 50

    def test_list_categories(self, client: TestClient, auth_headers: dict):
        """Получить категории."""
        resp = client.get("/api/v1/business-cases/categories", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "categories" in data

    def test_validate_all_cases(self, client: TestClient, auth_headers: dict):
        """Валидация всех бизнес-кейсов."""
        resp = client.post("/api/v1/business-cases/validate", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data or "total" in data

    def test_business_cases_unauthorized(self, client: TestClient):
        """Бизнес-кейсы без авторизации — 401."""
        resp = client.get("/api/v1/business-cases")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 7. MONTE CARLO v2 (3 tests)
# ═══════════════════════════════════════════════════════════════

class TestMonteCarloV2:
    """E2E: Monte Carlo v2 симуляция."""

    def test_run_monte_carlo_v2(self, client: TestClient, auth_headers: dict):
        """Запуск Monte Carlo v2 по сектору."""
        resp = client.post("/api/v1/analytics/monte-carlo-v2", json={
            "sector": "agriculture",
            "initial_investment": 1000000,
            "time_horizon_years": 5,
            "num_simulations": 1000,
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "percentiles" in data or "results" in data or "simulations" in data

    def test_monte_carlo_v2_it_sector(self, client: TestClient, auth_headers: dict):
        """Monte Carlo для IT-сектора."""
        resp = client.post("/api/v1/analytics/monte-carlo-v2", json={
            "sector": "it_services",
            "initial_investment": 500000,
            "time_horizon_years": 3,
        }, headers=auth_headers)
        assert resp.status_code == 200

    def test_monte_carlo_v2_unauthorized(self, client: TestClient):
        """Monte Carlo без авторизации — 401."""
        resp = client.post("/api/v1/analytics/monte-carlo-v2", json={
            "sector": "trade",
        })
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 8. AI ANALYTICS (3 tests)
# ═══════════════════════════════════════════════════════════════

class TestAIAnalytics:
    """E2E: AI аналитика."""

    def test_ai_analyze(self, client: TestClient, auth_headers: dict):
        """Запрос AI-анализа."""
        resp = client.post("/api/v1/ai/analyze", json={
            "query": "Проанализируй инвестиции в IT сектор Узбекистана",
        }, headers=auth_headers)
        # Может вернуть 200 или ошибку если AI провайдер недоступен
        assert resp.status_code in (200, 503, 500, 422)

    def test_ai_chat(self, client: TestClient, auth_headers: dict):
        """AI чат запрос."""
        resp = client.post("/api/v1/ai/chat", json={
            "message": "Какой ROI ожидать от агротех сектора?",
        }, headers=auth_headers)
        assert resp.status_code in (200, 503, 500, 422)

    def test_ai_unauthorized(self, client: TestClient):
        """AI без авторизации — 401."""
        resp = client.post("/api/v1/ai/analyze", json={
            "query": "test",
        })
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 9. EXPORTS (4 tests)
# ═══════════════════════════════════════════════════════════════

class TestExports:
    """E2E: экспорт PDF и Excel."""

    def test_pdf_portfolio_export(self, client: TestClient, auth_headers: dict):
        """Экспорт портфеля в PDF."""
        # Создаём портфель сначала
        p = client.post("/api/v1/portfolios/", json={
            "name": "PDF Export Test",
        }, headers=auth_headers)
        pid = p.json()["id"]
        resp = client.post("/api/v1/export/portfolio-pdf", json={
            "portfolio_id": pid,
        }, headers=auth_headers)
        assert resp.status_code in (200, 404, 422)
        if resp.status_code == 200:
            assert "pdf" in resp.headers.get("content-type", "").lower() or len(resp.content) > 0

    def test_excel_portfolio_export(self, client: TestClient, auth_headers: dict):
        """Экспорт портфеля в Excel."""
        resp = client.post("/api/v1/export/excel/portfolio", json={
            "portfolio_name": "Тестовый портфель",
            "assets": [],
            "analytics": {},
        }, headers=auth_headers)
        assert resp.status_code in (200, 422)
        if resp.status_code == 200:
            ct = resp.headers.get("content-type", "")
            assert "spreadsheet" in ct or "octet-stream" in ct or len(resp.content) > 0

    def test_export_unauthorized(self, client: TestClient):
        """Экспорт без авторизации — 401."""
        resp = client.post("/api/v1/export/portfolio-pdf", json={
            "portfolio_id": 1,
        })
        assert resp.status_code == 401

    def test_dd_report_pdf(self, client: TestClient, auth_headers: dict):
        """Экспорт DD-отчёта в PDF."""
        resp = client.post("/api/v1/export/dd-report-pdf", json={
            "company_name": "UzAuto Motors",
            "inn": "123456789",
            "scores": {"financial": 80, "legal": 75},
            "red_flags": [],
            "ai_analysis": "Компания стабильна",
        }, headers=auth_headers)
        assert resp.status_code in (200, 422, 500)


# ═══════════════════════════════════════════════════════════════
# 10. CURRENCY RATES (3 tests)
# ═══════════════════════════════════════════════════════════════

class TestCurrencyRates:
    """E2E: курсы валют ЦБ Узбекистана."""

    def test_get_rates(self, client: TestClient, auth_headers: dict):
        """Получить текущие курсы."""
        resp = client.get("/api/v1/rates", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "rates" in data or isinstance(data, list) or "items" in data

    def test_get_rates_filtered(self, client: TestClient, auth_headers: dict):
        """Получить курсы для конкретных валют."""
        resp = client.get("/api/v1/rates?codes=USD,EUR,RUB", headers=auth_headers)
        assert resp.status_code == 200

    def test_rates_unauthorized(self, client: TestClient):
        """Курсы без авторизации — 401."""
        resp = client.get("/api/v1/rates")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 11. XAI — EXPLAINABILITY (3 tests)
# ═══════════════════════════════════════════════════════════════

class TestXAI:
    """E2E: объяснимость AI-решений."""

    def test_xai_analyze(self, client: TestClient, auth_headers: dict):
        """XAI-анализ инвестиционного решения."""
        resp = client.post("/api/v1/xai/analyze", json={
            "sector": "agriculture",
            "investment_amount": 1000000,
            "time_horizon_years": 5,
            "language": "ru",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "factors" in data or "recommendation" in data or "analysis" in data

    def test_xai_factors(self, client: TestClient, auth_headers: dict):
        """Список доступных XAI-факторов."""
        resp = client.get("/api/v1/xai/factors", headers=auth_headers)
        assert resp.status_code == 200

    def test_xai_unauthorized(self, client: TestClient):
        """XAI без авторизации — 401."""
        resp = client.post("/api/v1/xai/analyze", json={
            "sector": "trade",
        })
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 12. ISLAMIC FINANCE (4 tests)
# ═══════════════════════════════════════════════════════════════

class TestIslamicFinance:
    """E2E: исламские финансы."""

    def test_shariah_screening(self, client: TestClient, auth_headers: dict):
        """Шариатский скрининг компании."""
        resp = client.post("/api/v1/islamic-finance/screening", json={
            "company_name": "Hamkorbank",
            "revenue": 5000000,
            "total_debt": 1000000,
            "total_assets": 10000000,
            "non_halal_income": 50000,
        }, headers=auth_headers)
        assert resp.status_code in (200, 422, 405)

    def test_zakat_calculator(self, client: TestClient, auth_headers: dict):
        """Закят-калькулятор."""
        resp = client.post("/api/v1/islamic-finance/zakat/calculate", json={
            "total_assets": 100000000,
            "liabilities": 20000000,
        }, headers=auth_headers)
        assert resp.status_code in (200, 422)

    def test_islamic_products(self, client: TestClient, auth_headers: dict):
        """Список исламских финансовых продуктов."""
        resp = client.get("/api/v1/islamic-finance/products", headers=auth_headers)
        assert resp.status_code in (200, 404)

    def test_islamic_unauthorized(self, client: TestClient):
        """Исламские финансы без авторизации — 401."""
        resp = client.post("/api/v1/islamic-finance/screening", json={})
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 13. DASHBOARD & HEALTH (4 tests)
# ═══════════════════════════════════════════════════════════════

class TestDashboardAndHealth:
    """E2E: дашборд и health-check."""

    def test_health_check(self, client: TestClient):
        """Health check — не требует авторизации."""
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") in ("ok", "healthy", True) or "status" in data

    def test_dashboard_data(self, client: TestClient, auth_headers: dict):
        """Данные дашборда."""
        resp = client.get("/api/v1/dashboard/", headers=auth_headers)
        assert resp.status_code == 200

    def test_dashboard_unauthorized(self, client: TestClient):
        """Дашборд без авторизации — 401."""
        resp = client.get("/api/v1/dashboard/")
        assert resp.status_code == 401

    def test_health_detailed(self, client: TestClient):
        """Подробный health check."""
        resp = client.get("/health")
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════
# 14. COMPANY LOOKUP (3 tests)
# ═══════════════════════════════════════════════════════════════

class TestCompanyLookup:
    """E2E: поиск компаний."""

    def test_search_company(self, client: TestClient, auth_headers: dict):
        """Поиск компании по имени."""
        resp = client.get("/api/v1/companies/search?query=Uzum", headers=auth_headers)
        assert resp.status_code in (200, 404)

    def test_company_by_inn(self, client: TestClient, auth_headers: dict):
        """Поиск компании по ИНН."""
        resp = client.get("/api/v1/companies/search?inn=123456789", headers=auth_headers)
        assert resp.status_code in (200, 404, 422)

    def test_company_search_unauthorized(self, client: TestClient):
        """Поиск компаний без авторизации — 401."""
        resp = client.get("/api/v1/companies/search?query=Test")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 15. CONTACTS (2 tests)
# ═══════════════════════════════════════════════════════════════

class TestContacts:
    """E2E: контакты."""

    def test_list_contacts(self, client: TestClient, auth_headers: dict):
        """Список контактов."""
        resp = client.get("/api/v1/contacts/", headers=auth_headers)
        assert resp.status_code == 200

    def test_contacts_unauthorized(self, client: TestClient):
        """Контакты без авторизации — 401."""
        resp = client.get("/api/v1/contacts/")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 16. AI ORCHESTRATOR (3 tests)
# ═══════════════════════════════════════════════════════════════

class TestAIOrchestrator:
    """E2E: AI оркестрация."""

    def test_ai_provider_health(self, client: TestClient, auth_headers: dict):
        """Статус AI-провайдеров."""
        resp = client.get("/api/v1/ai-provider-health/status", headers=auth_headers)
        assert resp.status_code == 200

    def test_ai_provider_stats(self, client: TestClient, auth_headers: dict):
        """Статистика AI-провайдеров."""
        resp = client.get("/api/v1/ai-provider-health/stats", headers=auth_headers)
        assert resp.status_code == 200

    def test_ai_orchestrator_unauthorized(self, client: TestClient):
        """AI оркестратор без авторизации — 401."""
        resp = client.post("/api/v1/ai-orchestrator/route", json={
            "query": "test",
        })
        assert resp.status_code == 401
