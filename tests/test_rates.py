"""
Тесты курсов валют.
Этап 0, Сессия 0.4 — Базовые тесты.

Проверяет:
  - POST /rates/sync — синхронизация курсов (mock cbu.uz)
  - GET /rates — получение курсов
  - POST /rates/convert — конвертация валют
  - Auth guard: все эндпоинты требуют авторизацию
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import date
from fastapi.testclient import TestClient


# ── Мок-данные cbu.uz ──
MOCK_CBU_RESPONSE = [
    {
        "Ccy": "USD",
        "CcyNm_RU": "Доллар США",
        "CcyNm_UZ": "AQSH dollari",
        "Nominal": "1",
        "Rate": "12850.50",
        "Diff": "10.25",
        "Date": "09.03.2026",
    },
    {
        "Ccy": "EUR",
        "CcyNm_RU": "Евро",
        "CcyNm_UZ": "YEVRO",
        "Nominal": "1",
        "Rate": "13950.75",
        "Diff": "-5.30",
        "Date": "09.03.2026",
    },
    {
        "Ccy": "RUB",
        "CcyNm_RU": "Российский рубль",
        "CcyNm_UZ": "Rossiya rubli",
        "Nominal": "1",
        "Rate": "130.25",
        "Diff": "0.50",
        "Date": "09.03.2026",
    },
    {
        "Ccy": "GBP",
        "CcyNm_RU": "Фунт стерлингов",
        "CcyNm_UZ": "Funt sterling",
        "Nominal": "1",
        "Rate": "16200.00",
        "Diff": "15.00",
        "Date": "09.03.2026",
    },
    {
        "Ccy": "JPY",
        "CcyNm_RU": "Японская иена",
        "CcyNm_UZ": "Yaponiya iyenasi",
        "Nominal": "1",
        "Rate": "85.10",
        "Diff": "-0.20",
        "Date": "09.03.2026",
    },
]


class TestRatesSync:
    """Тесты POST /api/v1/rates/sync."""

    @pytest.mark.rates
    @patch("app.services.currency_service.fetch_rates_from_cbu")
    def test_sync_success(
        self, mock_fetch, client: TestClient, auth_headers: dict
    ):
        """Синхронизация курсов возвращает количество загруженных валют."""
        mock_fetch.return_value = MOCK_CBU_RESPONSE

        response = client.post("/api/v1/rates/sync", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert data["count"] == len(MOCK_CBU_RESPONSE)
        assert "message" in data

    @pytest.mark.rates
    @patch("app.services.currency_service.fetch_rates_from_cbu")
    def test_sync_empty_response(
        self, mock_fetch, client: TestClient, auth_headers: dict
    ):
        """Синхронизация при пустом ответе от cbu.uz возвращает 502."""
        mock_fetch.return_value = []

        response = client.post("/api/v1/rates/sync", headers=auth_headers)
        assert response.status_code == 502

    @pytest.mark.rates
    def test_sync_requires_auth(self, client: TestClient):
        """POST /rates/sync без авторизации возвращает 401."""
        response = client.post("/api/v1/rates/sync")
        assert response.status_code == 401


class TestRatesGet:
    """Тесты GET /api/v1/rates."""

    @pytest.mark.rates
    @patch("app.services.currency_service.fetch_rates_from_cbu")
    def test_get_rates_with_data(
        self, mock_fetch, client: TestClient, auth_headers: dict
    ):
        """GET /rates после sync возвращает курсы."""
        mock_fetch.return_value = MOCK_CBU_RESPONSE

        # Сначала sync
        client.post("/api/v1/rates/sync", headers=auth_headers)

        # Затем get
        response = client.get("/api/v1/rates", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert "rates" in data
        assert len(data["rates"]) > 0

    @pytest.mark.rates
    @patch("app.services.currency_service.fetch_rates_from_cbu")
    def test_get_rates_filter_by_codes(
        self, mock_fetch, client: TestClient, auth_headers: dict
    ):
        """GET /rates?codes=USD,EUR фильтрует по кодам."""
        mock_fetch.return_value = MOCK_CBU_RESPONSE

        client.post("/api/v1/rates/sync", headers=auth_headers)

        response = client.get(
            "/api/v1/rates?codes=USD,EUR", headers=auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        codes = [r["code"] for r in data["rates"]]
        assert "USD" in codes
        assert "EUR" in codes
        # Не должно быть RUB, GBP и т.д.
        assert "RUB" not in codes

    @pytest.mark.rates
    @patch("app.services.currency_service.fetch_rates_from_cbu")
    def test_get_rates_auto_sync(
        self, mock_fetch, client: TestClient, auth_headers: dict
    ):
        """GET /rates при пустой БД автоматически загружает с cbu.uz."""
        mock_fetch.return_value = MOCK_CBU_RESPONSE

        # Без предварительного sync — должен автоматически загрузить
        response = client.get("/api/v1/rates", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data["rates"]) > 0
        mock_fetch.assert_called()

    @pytest.mark.rates
    def test_get_rates_requires_auth(self, client: TestClient):
        """GET /rates без авторизации возвращает 401."""
        response = client.get("/api/v1/rates")
        assert response.status_code == 401


class TestRatesConvert:
    """Тесты POST /api/v1/rates/convert."""

    @pytest.mark.rates
    @patch("app.services.currency_service.fetch_rates_from_cbu")
    def test_convert_usd_to_uzs(
        self, mock_fetch, client: TestClient, auth_headers: dict
    ):
        """Конвертация USD -> UZS."""
        mock_fetch.return_value = MOCK_CBU_RESPONSE
        client.post("/api/v1/rates/sync", headers=auth_headers)

        response = client.post(
            "/api/v1/rates/convert",
            json={
                "amount": 100,
                "from_currency": "USD",
                "to_currency": "UZS",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200

        data = response.json()
        assert data["from_currency"] == "USD"
        assert data["to_currency"] == "UZS"
        assert data["amount"] == 100
        assert data["result"] > 0
        # 100 USD * 12850.50 = 1,285,050
        assert data["result"] == 1285050.0

    @pytest.mark.rates
    @patch("app.services.currency_service.fetch_rates_from_cbu")
    def test_convert_uzs_to_eur(
        self, mock_fetch, client: TestClient, auth_headers: dict
    ):
        """Конвертация UZS -> EUR."""
        mock_fetch.return_value = MOCK_CBU_RESPONSE
        client.post("/api/v1/rates/sync", headers=auth_headers)

        response = client.post(
            "/api/v1/rates/convert",
            json={
                "amount": 1000000,
                "from_currency": "UZS",
                "to_currency": "EUR",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200

        data = response.json()
        assert data["from_currency"] == "UZS"
        assert data["to_currency"] == "EUR"
        assert data["result"] > 0

    @pytest.mark.rates
    @patch("app.services.currency_service.fetch_rates_from_cbu")
    def test_convert_cross_usd_to_eur(
        self, mock_fetch, client: TestClient, auth_headers: dict
    ):
        """Кросс-конвертация USD -> EUR через UZS."""
        mock_fetch.return_value = MOCK_CBU_RESPONSE
        client.post("/api/v1/rates/sync", headers=auth_headers)

        response = client.post(
            "/api/v1/rates/convert",
            json={
                "amount": 100,
                "from_currency": "USD",
                "to_currency": "EUR",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200

        data = response.json()
        assert data["from_currency"] == "USD"
        assert data["to_currency"] == "EUR"
        assert data["result"] > 0
        # Кросс: 100 USD -> UZS -> EUR
        # 100 * 12850.50 / 13950.75 ≈ 92.11
        assert 90 < data["result"] < 95

    @pytest.mark.rates
    @patch("app.services.currency_service.fetch_rates_from_cbu")
    def test_convert_unknown_currency(
        self, mock_fetch, client: TestClient, auth_headers: dict
    ):
        """Конвертация с несуществующей валютой возвращает 404."""
        mock_fetch.return_value = MOCK_CBU_RESPONSE
        client.post("/api/v1/rates/sync", headers=auth_headers)

        response = client.post(
            "/api/v1/rates/convert",
            json={
                "amount": 100,
                "from_currency": "XYZ",
                "to_currency": "UZS",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.rates
    def test_convert_requires_auth(self, client: TestClient):
        """POST /rates/convert без авторизации возвращает 401."""
        response = client.post(
            "/api/v1/rates/convert",
            json={
                "amount": 100,
                "from_currency": "USD",
                "to_currency": "UZS",
            },
        )
        assert response.status_code == 401
