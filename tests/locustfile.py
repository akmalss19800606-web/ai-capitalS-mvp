"""
QA-002: Нагрузочное тестирование — Locust.

Классы пользователей:
  - WebUser: обычный просмотр (дашборд, портфели, курсы)
  - AnalyticsUser: тяжёлая AI аналитика
  - ApiUser: быстрые API-вызовы (калькулятор, DD)

Запуск: locust -f tests/locustfile.py --host http://localhost:8000
"""

import random
import string

from locust import HttpUser, between, task


def _random_email():
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"loadtest_{suffix}@example.com"


class _AuthMixin:
    """Общая логика регистрации/логина для получения токена."""

    token: str | None = None

    def _ensure_auth(self):
        if self.token:
            return
        email = _random_email()
        password = "LoadTest123!"
        # Регистрация
        self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "full_name": "Load Tester"},
            name="/auth/register",
        )
        # Логин
        resp = self.client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": password},
            name="/auth/login",
        )
        if resp.status_code == 200:
            self.token = resp.json().get("access_token", "")
        else:
            self.token = ""

    @property
    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}


class WebUser(_AuthMixin, HttpUser):
    """Обычный пользователь: дашборд, портфели, курсы валют, настройки."""

    wait_time = between(2, 5)
    weight = 5  # 50% трафика

    def on_start(self):
        self._ensure_auth()

    @task(3)
    def view_dashboard(self):
        self.client.get("/api/v1/dashboard/", headers=self._headers, name="/dashboard")

    @task(3)
    def list_portfolios(self):
        self.client.get("/api/v1/portfolios/", headers=self._headers, name="/portfolios")

    @task(2)
    def get_currency_rates(self):
        self.client.get("/api/v1/rates", headers=self._headers, name="/rates")

    @task(2)
    def list_decisions(self):
        self.client.get("/api/v1/decisions/", headers=self._headers, name="/decisions")

    @task(1)
    def view_business_cases(self):
        self.client.get(
            "/api/v1/business-cases", headers=self._headers, name="/business-cases"
        )

    @task(1)
    def health_check(self):
        self.client.get("/health", name="/health")

    @task(1)
    def create_portfolio(self):
        self.client.post(
            "/api/v1/portfolios/",
            json={
                "name": f"Load Test Portfolio {random.randint(1, 10000)}",
                "description": "Нагрузочное тестирование",
            },
            headers=self._headers,
            name="/portfolios [POST]",
        )


class AnalyticsUser(_AuthMixin, HttpUser):
    """Пользователь-аналитик: AI, Monte Carlo, XAI, бизнес-кейсы."""

    wait_time = between(3, 8)
    weight = 2  # 20% трафика

    def on_start(self):
        self._ensure_auth()

    @task(3)
    def run_monte_carlo(self):
        sectors = ["agriculture", "it_services", "trade", "construction", "manufacturing"]
        self.client.post(
            "/api/v1/analytics/monte-carlo-v2",
            json={
                "sector": random.choice(sectors),
                "initial_investment": random.randint(500_000, 5_000_000),
                "time_horizon_years": random.randint(2, 7),
            },
            headers=self._headers,
            name="/analytics/monte-carlo-v2",
        )

    @task(2)
    def xai_analyze(self):
        self.client.post(
            "/api/v1/xai/analyze",
            json={
                "sector": random.choice(["agriculture", "trade", "it_services"]),
                "investment_amount": random.randint(100_000, 2_000_000),
                "time_horizon_years": random.randint(1, 5),
                "language": "ru",
            },
            headers=self._headers,
            name="/xai/analyze",
        )

    @task(2)
    def validate_cases(self):
        self.client.post(
            "/api/v1/business-cases/validate",
            headers=self._headers,
            name="/business-cases/validate",
        )

    @task(1)
    def ai_provider_health(self):
        self.client.get(
            "/api/v1/ai-provider-health/status",
            headers=self._headers,
            name="/ai-provider-health/status",
        )

    @task(1)
    def list_xai_factors(self):
        self.client.get(
            "/api/v1/xai/factors", headers=self._headers, name="/xai/factors"
        )


class ApiUser(_AuthMixin, HttpUser):
    """API-пользователь: калькулятор, DD-скоринг, быстрые вызовы."""

    wait_time = between(1, 3)
    weight = 3  # 30% трафика

    def on_start(self):
        self._ensure_auth()

    @task(3)
    def calculator_npv(self):
        self.client.post(
            "/api/v1/calculator/npv",
            json={
                "cash_flows": [-1_000_000] + [random.randint(200_000, 500_000) for _ in range(4)],
                "discount_rate": round(random.uniform(0.08, 0.15), 2),
            },
            headers=self._headers,
            name="/calculator/npv",
        )

    @task(2)
    def calculator_irr(self):
        self.client.post(
            "/api/v1/calculator/irr",
            json={
                "cash_flows": [-500_000] + [random.randint(100_000, 300_000) for _ in range(3)],
            },
            headers=self._headers,
            name="/calculator/irr",
        )

    @task(2)
    def calculator_wacc(self):
        self.client.post(
            "/api/v1/calculator/wacc",
            json={
                "equity": random.randint(2_000_000, 10_000_000),
                "debt": random.randint(1_000_000, 5_000_000),
                "cost_equity": round(random.uniform(0.10, 0.18), 2),
                "cost_debt": round(random.uniform(0.06, 0.12), 2),
                "tax_rate": 0.15,
            },
            headers=self._headers,
            name="/calculator/wacc",
        )

    @task(2)
    def dd_scoring(self):
        companies = ["Uzum Market", "Artel Electronics", "Hamkorbank", "UzAuto Motors", "Humans.uz"]
        self.client.post(
            "/api/v1/dd/scoring",
            json={
                "company_name": random.choice(companies),
                "industry": random.choice(["tech", "manufacturing", "banking", "automotive"]),
                "geography": "UZ",
            },
            headers=self._headers,
            name="/dd/scoring",
        )

    @task(1)
    def calculator_full(self):
        self.client.post(
            "/api/v1/calculator/full",
            json={
                "cash_flows": [-2_000_000] + [random.randint(400_000, 800_000) for _ in range(5)],
                "discount_rate": 0.12,
                "equity": 5_000_000,
                "debt": 3_000_000,
                "cost_equity": 0.14,
                "cost_debt": 0.09,
                "tax_rate": 0.15,
                "terminal_growth": 0.03,
            },
            headers=self._headers,
            name="/calculator/full",
        )

    @task(1)
    def company_search(self):
        self.client.get(
            "/api/v1/companies/search?query=Uzum",
            headers=self._headers,
            name="/companies/search",
        )
