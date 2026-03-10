"""
Email-сервис — SMTP + Jinja2-шаблоны для дайджестов и уведомлений.

Функционал:
  - Отправка email через SMTP (Gmail, Yandex, любой SMTP-сервер)
  - HTML-шаблоны через Jinja2
  - Дайджесты: ежедневный, еженедельный
  - Уведомления: смена статуса решения, алерты портфеля, AI-отчёты
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List
from pathlib import Path
from datetime import datetime, timedelta

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Jinja2 шаблонизатор ─────────────────────────────────────────────

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape

    _TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "email"
    _jinja_env = Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=select_autoescape(["html"]),
    )
    logger.info("Jinja2 шаблонизатор инициализирован: %s", _TEMPLATE_DIR)
except ImportError:
    _jinja_env = None
    logger.warning("Jinja2 не установлен — email-шаблоны недоступны")


# ─── Базовая отправка ────────────────────────────────────────────────

def _get_smtp_connection():
    """Создание SMTP-соединения по настройкам из .env."""
    host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
    port = getattr(settings, "SMTP_PORT", 587)
    user = getattr(settings, "SMTP_USER", "")
    password = getattr(settings, "SMTP_PASSWORD", "")
    use_tls = getattr(settings, "SMTP_TLS", True)

    if not user or not password:
        logger.warning("SMTP не настроен (SMTP_USER / SMTP_PASSWORD пусты)")
        return None

    try:
        server = smtplib.SMTP(host, port, timeout=15)
        if use_tls:
            server.starttls()
        server.login(user, password)
        return server
    except Exception as e:
        logger.error("Ошибка подключения к SMTP %s:%s — %s", host, port, e)
        return None


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    from_name: str = "AI Capital",
    attachments: Optional[List[dict]] = None,
) -> bool:
    """
    Отправка email.

    Args:
        to_email: Адрес получателя.
        subject: Тема письма.
        html_body: HTML-содержимое письма.
        from_name: Имя отправителя.
        attachments: Список вложений [{"filename": "...", "data": bytes}].

    Returns:
        True если отправлено, False при ошибке.
    """
    smtp_user = getattr(settings, "SMTP_USER", "")
    if not smtp_user:
        logger.warning("Email не отправлен — SMTP не настроен")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = to_email

    # Плейн-текст fallback
    plain_text = html_body.replace("<br>", "\n").replace("</p>", "\n")
    import re
    plain_text = re.sub(r"<[^>]+>", "", plain_text)

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # Вложения
    if attachments:
        for att in attachments:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(att["data"])
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{att["filename"]}"',
            )
            msg.attach(part)

    server = _get_smtp_connection()
    if not server:
        return False

    try:
        server.sendmail(smtp_user, to_email, msg.as_string())
        logger.info("Email отправлен: %s → %s", subject, to_email)
        return True
    except Exception as e:
        logger.error("Ошибка отправки email: %s", e)
        return False
    finally:
        server.quit()


# ─── Шаблонные письма ────────────────────────────────────────────────

def _render_template(template_name: str, context: dict) -> str:
    """Рендер Jinja2-шаблона или fallback на встроенный HTML."""
    if _jinja_env:
        try:
            tmpl = _jinja_env.get_template(template_name)
            return tmpl.render(**context)
        except Exception as e:
            logger.warning("Ошибка рендера шаблона %s: %s", template_name, e)

    # Fallback: встроенный HTML
    return _builtin_template(template_name, context)


def _builtin_template(template_name: str, ctx: dict) -> str:
    """Встроенные HTML-шаблоны (без Jinja2)."""
    header = """
    <div style="background:#1a2332; padding:20px; text-align:center;">
        <h1 style="color:#ffffff; margin:0; font-size:24px;">AI Capital</h1>
        <p style="color:#94a3b8; margin:5px 0 0; font-size:14px;">Investment Management Platform</p>
    </div>
    """
    footer = """
    <div style="background:#f1f5f9; padding:15px; text-align:center; font-size:12px; color:#64748b;">
        <p>© 2026 AI Capital Management. Ташкент, Узбекистан.</p>
        <p>Толиев Акмал Идиевич · Свидетельство №009932</p>
    </div>
    """

    if "digest" in template_name:
        items_html = ""
        for item in ctx.get("items", []):
            items_html += f"""
            <tr>
                <td style="padding:8px; border-bottom:1px solid #e2e8f0;">{item.get('title','')}</td>
                <td style="padding:8px; border-bottom:1px solid #e2e8f0;">{item.get('status','')}</td>
                <td style="padding:8px; border-bottom:1px solid #e2e8f0;">{item.get('detail','')}</td>
            </tr>
            """
        return f"""
        <html><body style="font-family:Arial,sans-serif; margin:0; padding:0;">
        {header}
        <div style="padding:20px;">
            <h2 style="color:#1e293b;">{ctx.get('title', 'Дайджест')}</h2>
            <p style="color:#475569;">{ctx.get('subtitle', '')}</p>
            <table style="width:100%; border-collapse:collapse; margin-top:15px;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:10px; text-align:left; border-bottom:2px solid #e2e8f0;">Событие</th>
                        <th style="padding:10px; text-align:left; border-bottom:2px solid #e2e8f0;">Статус</th>
                        <th style="padding:10px; text-align:left; border-bottom:2px solid #e2e8f0;">Детали</th>
                    </tr>
                </thead>
                <tbody>{items_html}</tbody>
            </table>
        </div>
        {footer}
        </body></html>
        """

    if "decision_status" in template_name:
        return f"""
        <html><body style="font-family:Arial,sans-serif; margin:0; padding:0;">
        {header}
        <div style="padding:20px;">
            <h2 style="color:#1e293b;">Изменение статуса решения</h2>
            <div style="background:#f8fafc; border-radius:8px; padding:15px; margin:15px 0;">
                <p><strong>Решение:</strong> {ctx.get('decision_title','')}</p>
                <p><strong>Статус:</strong>
                    <span style="color:#ef4444;">{ctx.get('old_status','')}</span> →
                    <span style="color:#22c55e;">{ctx.get('new_status','')}</span>
                </p>
                <p><strong>Изменено:</strong> {ctx.get('changed_by','')}</p>
                <p><strong>Дата:</strong> {ctx.get('changed_at','')}</p>
            </div>
        </div>
        {footer}
        </body></html>
        """

    if "portfolio_alert" in template_name:
        return f"""
        <html><body style="font-family:Arial,sans-serif; margin:0; padding:0;">
        {header}
        <div style="padding:20px;">
            <h2 style="color:#1e293b;">⚠ Алерт портфеля</h2>
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:15px; margin:15px 0;">
                <p><strong>Портфель:</strong> {ctx.get('portfolio_name','')}</p>
                <p><strong>Тип алерта:</strong> {ctx.get('alert_type','')}</p>
                <p><strong>Сообщение:</strong> {ctx.get('message','')}</p>
                <p><strong>Текущая стоимость:</strong> {ctx.get('current_value','')}</p>
            </div>
        </div>
        {footer}
        </body></html>
        """

    # Общий шаблон
    return f"""
    <html><body style="font-family:Arial,sans-serif; margin:0; padding:0;">
    {header}
    <div style="padding:20px;">
        <h2 style="color:#1e293b;">{ctx.get('title', 'Уведомление')}</h2>
        <p style="color:#475569;">{ctx.get('body', '')}</p>
    </div>
    {footer}
    </body></html>
    """


# ─── Публичные функции ───────────────────────────────────────────────

def send_daily_digest(
    to_email: str,
    user_name: str,
    decisions_changed: List[dict],
    portfolio_alerts: List[dict],
    ai_insights: List[dict],
) -> bool:
    """
    Ежедневный дайджест.

    Args:
        to_email: Адрес получателя.
        user_name: Имя пользователя.
        decisions_changed: Изменённые решения за день.
        portfolio_alerts: Алерты портфелей.
        ai_insights: AI-инсайты.

    Returns:
        True если отправлено.
    """
    items = []
    for d in decisions_changed:
        items.append({
            "title": f"Решение: {d.get('title', '')}",
            "status": d.get("new_status", ""),
            "detail": d.get("changed_by", ""),
        })
    for p in portfolio_alerts:
        items.append({
            "title": f"Портфель: {p.get('name', '')}",
            "status": p.get("alert_type", ""),
            "detail": p.get("message", ""),
        })
    for a in ai_insights:
        items.append({
            "title": "AI Insight",
            "status": a.get("provider", ""),
            "detail": a.get("summary", "")[:100],
        })

    today = datetime.now().strftime("%d.%m.%Y")
    html = _render_template("digest.html", {
        "title": f"Дайджест за {today}",
        "subtitle": f"Здравствуйте, {user_name}! Вот что произошло сегодня.",
        "items": items,
    })

    return send_email(
        to_email=to_email,
        subject=f"AI Capital — Дайджест за {today}",
        html_body=html,
    )


def send_decision_status_notification(
    to_email: str,
    decision_title: str,
    old_status: str,
    new_status: str,
    changed_by: str,
) -> bool:
    """Уведомление о смене статуса решения."""
    html = _render_template("decision_status.html", {
        "decision_title": decision_title,
        "old_status": old_status,
        "new_status": new_status,
        "changed_by": changed_by,
        "changed_at": datetime.now().strftime("%d.%m.%Y %H:%M"),
    })

    return send_email(
        to_email=to_email,
        subject=f"AI Capital — Решение «{decision_title}» → {new_status}",
        html_body=html,
    )


def send_portfolio_alert(
    to_email: str,
    portfolio_name: str,
    alert_type: str,
    message: str,
    current_value: str,
) -> bool:
    """Алерт портфеля."""
    html = _render_template("portfolio_alert.html", {
        "portfolio_name": portfolio_name,
        "alert_type": alert_type,
        "message": message,
        "current_value": current_value,
    })

    return send_email(
        to_email=to_email,
        subject=f"AI Capital — ⚠ Алерт: {portfolio_name}",
        html_body=html,
    )


def send_welcome_email(to_email: str, user_name: str) -> bool:
    """Приветственное письмо при регистрации."""
    html = _render_template("welcome.html", {
        "title": f"Добро пожаловать, {user_name}!",
        "body": (
            "Вы успешно зарегистрировались в AI Capital Management. "
            "Система готова к работе: создайте первый портфель, "
            "добавьте активы и получайте AI-рекомендации по инвестициям."
        ),
    })

    return send_email(
        to_email=to_email,
        subject="AI Capital — Добро пожаловать!",
        html_body=html,
    )
