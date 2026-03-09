"""
Модель CurrencyRate — хранение курсов валют ЦБ Узбекистана.
Этап 0, Сессия 0.2 — Валюта UZS.

Источник: https://cbu.uz/ru/arkhiv-kursov-valyut/json/
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, UniqueConstraint
from sqlalchemy.sql import func
from app.db.session import Base


class CurrencyRate(Base):
    __tablename__ = "currency_rates"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), nullable=False, index=True)      # USD, EUR, RUB
    ccy_name_ru = Column(String(100), nullable=True)            # Доллар США
    ccy_name_uz = Column(String(100), nullable=True)            # AQSh dollari
    nominal = Column(Integer, default=1)                         # 1, 100 (для JPY, KRW)
    rate = Column(Float, nullable=False)                         # Курс к UZS
    diff = Column(Float, default=0.0)                            # Изменение за день
    rate_date = Column(Date, nullable=False)                     # Дата курса

    fetched_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("code", "rate_date", name="uq_currency_rate_code_date"),
    )

    def __repr__(self):
        return f"<CurrencyRate {self.code} {self.rate} ({self.rate_date})>"
