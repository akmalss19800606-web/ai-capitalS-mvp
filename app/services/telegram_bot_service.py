"""
Telegram Bot Service — уведомления и команды через Telegram.

Фаза 3, TG-001:
  - /start — приветствие и привязка chat_id
  - /portfolio — краткая сводка портфеля
  - /alerts — настройка уведомлений
  - Отправка push-уведомлений (сделки, алерты, дайджест)

Зависимость: python-telegram-bot (добавлена в Dockerfile)
"""

import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Попытка импорта python-telegram-bot ─────────────────────
try:
    from telegram import Update, Bot
    from telegram.ext import (
        Application,
        CommandHandler,
        ContextTypes,
        MessageHandler,
        filters,
    )
    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False
    logger.warning("python-telegram-bot не установлен — Telegram-бот отключён")


class TelegramBotService:
    """Сервис Telegram-бота AI Capital Management."""

    def __init__(self, token: Optional[str] = None):
        self.token = token
        self._app: Optional[object] = None
        self._running = False
        # Хранилище привязок: {chat_id: user_info}
        self._subscribers: dict[int, dict] = {}

    async def start(self) -> bool:
        """Запуск бота (polling mode для MVP)."""
        if not TELEGRAM_AVAILABLE:
            logger.warning("Telegram Bot: библиотека не установлена, пропуск")
            return False

        if not self.token or self.token == "your-telegram-bot-token":
            logger.info("Telegram Bot: токен не настроен, пропуск")
            return False

        try:
            self._app = (
                Application.builder()
                .token(self.token)
                .build()
            )

            # Регистрация команд
            self._app.add_handler(CommandHandler("start", self._cmd_start))
            self._app.add_handler(CommandHandler("portfolio", self._cmd_portfolio))
            self._app.add_handler(CommandHandler("alerts", self._cmd_alerts))
            self._app.add_handler(CommandHandler("help", self._cmd_help))
            self._app.add_handler(
                MessageHandler(filters.TEXT & ~filters.COMMAND, self._on_message)
            )

            # Инициализация и запуск polling в фоне
            await self._app.initialize()
            await self._app.start()
            await self._app.updater.start_polling(drop_pending_updates=True)

            self._running = True
            logger.info("✅ Telegram Bot запущен (polling mode)")
            return True

        except Exception as e:
            logger.error(f"Ошибка запуска Telegram Bot: {e}")
            return False

    async def stop(self) -> None:
        """Остановка бота."""
        if self._app and self._running:
            try:
                await self._app.updater.stop()
                await self._app.stop()
                await self._app.shutdown()
                self._running = False
                logger.info("Telegram Bot остановлен")
            except Exception as e:
                logger.error(f"Ошибка при остановке Telegram Bot: {e}")

    # ── Команды ──────────────────────────────────────────────

    async def _cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /start — приветствие и регистрация."""
        chat_id = update.effective_chat.id
        user = update.effective_user

        self._subscribers[chat_id] = {
            "username": user.username or "unknown",
            "first_name": user.first_name or "",
            "registered_at": asyncio.get_event_loop().time(),
        }

        await update.message.reply_text(
            f"👋 Добро пожаловать в AI Capital Management!\n\n"
            f"Вы подписаны на уведомления.\n\n"
            f"Доступные команды:\n"
            f"/portfolio — сводка портфеля\n"
            f"/alerts — настройка уведомлений\n"
            f"/help — справка\n\n"
            f"💡 Для привязки к аккаунту используйте "
            f"настройки в веб-интерфейсе."
        )
        logger.info(f"Telegram: новый подписчик chat_id={chat_id} @{user.username}")

    async def _cmd_portfolio(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /portfolio — краткая сводка."""
        await update.message.reply_text(
            "📊 Сводка портфеля:\n\n"
            "Для просмотра полной аналитики перейдите в веб-интерфейс.\n\n"
            "💡 В следующих версиях здесь будет краткая сводка "
            "с ROI, распределением активов и топ-сделками."
        )

    async def _cmd_alerts(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /alerts — управление уведомлениями."""
        await update.message.reply_text(
            "🔔 Настройка уведомлений:\n\n"
            "• Новые сделки — ✅ Вкл\n"
            "• Изменения портфеля — ✅ Вкл\n"
            "• Ежедневный дайджест — ✅ Вкл\n"
            "• AI-рекомендации — ✅ Вкл\n\n"
            "💡 Детальная настройка доступна в веб-интерфейсе "
            "(Настройки → Уведомления)."
        )

    async def _cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /help — справка."""
        await update.message.reply_text(
            "ℹ️ AI Capital Management Bot\n\n"
            "Команды:\n"
            "/start — начало работы\n"
            "/portfolio — сводка портфеля\n"
            "/alerts — уведомления\n"
            "/help — эта справка\n\n"
            "🌐 Веб-интерфейс: настройки → Telegram"
        )

    async def _on_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка текстовых сообщений."""
        await update.message.reply_text(
            "Используйте команды для взаимодействия с ботом.\n"
            "Введите /help для списка команд."
        )

    # ── Отправка уведомлений ────────────────────────────────

    async def send_notification(
        self, chat_id: int, text: str, parse_mode: str = "HTML"
    ) -> bool:
        """Отправить уведомление конкретному пользователю."""
        if not self._app or not self._running:
            logger.warning("Telegram Bot не запущен, уведомление не отправлено")
            return False

        try:
            bot: Bot = self._app.bot
            await bot.send_message(
                chat_id=chat_id, text=text, parse_mode=parse_mode
            )
            return True
        except Exception as e:
            logger.error(f"Ошибка отправки Telegram: {e}")
            return False

    async def broadcast(self, text: str, parse_mode: str = "HTML") -> int:
        """Рассылка всем подписчикам. Возвращает кол-во успешных отправок."""
        sent = 0
        for chat_id in self._subscribers:
            if await self.send_notification(chat_id, text, parse_mode):
                sent += 1
        return sent

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    @property
    def is_running(self) -> bool:
        return self._running


# Глобальный экземпляр (инициализируется в lifespan)
telegram_bot: Optional[TelegramBotService] = None
