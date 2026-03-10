"""
Брендированный экспорт PDF — отчёты с логотипом AI Capital.

Функционал:
  - Генерация PDF с шапкой AI Capital (логотип, название, дата)
  - Шаблоны: Portfolio Summary, Due Diligence Report, Decision Memo
  - Таблицы, графики (описательные), водяные знаки
  - Используется reportlab (стандартная библиотека PDF для Python)
"""

import io
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# ─── Попытка импорта reportlab ────────────────────────────────────────

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm, cm
    from reportlab.lib.colors import HexColor, black, white, gray
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, HRFlowable,
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

    REPORTLAB_AVAILABLE = True
    logger.info("reportlab доступен — брендированный PDF включён")
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("reportlab не установлен — брендированный PDF через fallback")


# ─── Цвета бренда ────────────────────────────────────────────────────

BRAND_DARK = "#1a2332"
BRAND_PRIMARY = "#3b82f6"
BRAND_GREEN = "#22c55e"
BRAND_RED = "#ef4444"
BRAND_GRAY = "#64748b"
BRAND_LIGHT = "#f8fafc"


# ─── Стили ───────────────────────────────────────────────────────────

def _get_styles():
    """Стили для PDF-документа."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "BrandTitle",
        parent=styles["Heading1"],
        fontSize=22,
        textColor=HexColor(BRAND_DARK),
        spaceAfter=6 * mm,
    ))
    styles.add(ParagraphStyle(
        "BrandSubtitle",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=HexColor(BRAND_PRIMARY),
        spaceAfter=4 * mm,
    ))
    styles.add(ParagraphStyle(
        "BrandBody",
        parent=styles["Normal"],
        fontSize=10,
        textColor=HexColor("#1e293b"),
        leading=14,
        spaceAfter=3 * mm,
    ))
    styles.add(ParagraphStyle(
        "BrandCaption",
        parent=styles["Normal"],
        fontSize=8,
        textColor=HexColor(BRAND_GRAY),
    ))
    styles.add(ParagraphStyle(
        "BrandHeader",
        parent=styles["Normal"],
        fontSize=10,
        textColor=white,
        alignment=TA_CENTER,
    ))

    return styles


# ─── Построение PDF ──────────────────────────────────────────────────

def _add_header(story, styles, title: str, subtitle: str = ""):
    """Добавить брендированную шапку."""
    # Заголовок
    header_data = [[
        Paragraph(
            f'<font size="18" color="{BRAND_DARK}"><b>AI Capital</b></font>',
            styles["BrandBody"],
        ),
        Paragraph(
            f'<font size="8" color="{BRAND_GRAY}">Investment Management Platform</font>',
            styles["BrandCaption"],
        ),
    ]]
    header_table = Table(header_data, colWidths=[120 * mm, 60 * mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    story.append(header_table)

    # Линия
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor(BRAND_PRIMARY)))
    story.append(Spacer(1, 4 * mm))

    # Название отчёта
    story.append(Paragraph(title, styles["BrandTitle"]))
    if subtitle:
        story.append(Paragraph(subtitle, styles["BrandSubtitle"]))

    # Дата
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    story.append(Paragraph(f"Дата формирования: {now}", styles["BrandCaption"]))
    story.append(Spacer(1, 6 * mm))


def _draw_brand_header(canvas, doc):
    """
    Брендированная шапка на каждой странице (Phase 3, EXPORT-001).

    Рисует: лого-область (синий квадрат) + "AI Capital Management" + дата.
    """
    canvas.saveState()
    page_width = A4[0]

    # Синяя полоса сверху
    canvas.setFillColor(HexColor(BRAND_DARK))
    canvas.rect(0, A4[1] - 15 * mm, page_width, 15 * mm, fill=True, stroke=False)

    # Лого-область (квадрат с буквами "AC")
    canvas.setFillColor(HexColor(BRAND_PRIMARY))
    canvas.roundRect(15 * mm, A4[1] - 13 * mm, 11 * mm, 11 * mm, 2 * mm, fill=True, stroke=False)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawCentredString(20.5 * mm, A4[1] - 10 * mm, "AC")

    # Название компании
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(30 * mm, A4[1] - 10 * mm, "AI Capital Management")

    # Дата справа
    now = datetime.now().strftime("%d.%m.%Y")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(page_width - 15 * mm, A4[1] - 10 * mm, now)

    # Тонкая синяя линия под шапкой
    canvas.setStrokeColor(HexColor(BRAND_PRIMARY))
    canvas.setLineWidth(0.5)
    canvas.line(15 * mm, A4[1] - 16 * mm, page_width - 15 * mm, A4[1] - 16 * mm)

    canvas.restoreState()


def _draw_brand_footer(canvas, doc):
    """
    Брендированный футер: номер страницы + конфиденциальность (Phase 3, EXPORT-001).
    """
    canvas.saveState()
    page_width = A4[0]

    # Тонкая линия
    canvas.setStrokeColor(HexColor("#e2e8f0"))
    canvas.setLineWidth(0.5)
    canvas.line(15 * mm, 14 * mm, page_width - 15 * mm, 14 * mm)

    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(HexColor(BRAND_GRAY))

    # Левая часть: конфиденциальность
    canvas.drawString(
        15 * mm, 9 * mm,
        "Конфиденциально | AI Capital Management · Толиев Акмал Идиевич · Свидетельство №009932",
    )

    # Правая часть: номер страницы
    canvas.drawRightString(
        page_width - 15 * mm, 9 * mm,
        f"Стр. {doc.page}",
    )

    # Время генерации (мелко по центру)
    now = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    canvas.setFont("Helvetica", 5.5)
    canvas.setFillColor(HexColor("#94a3b8"))
    canvas.drawCentredString(page_width / 2, 5 * mm, f"Сформировано: {now}")

    canvas.restoreState()


def _draw_watermark(canvas, doc):
    """Водяной знак 'AI CAPITAL' по диагонали (Phase 3, EXPORT-001)."""
    canvas.saveState()
    canvas.setFillColor(HexColor("#e2e8f0"))
    canvas.setFont("Helvetica-Bold", 60)
    canvas.translate(A4[0] / 2, A4[1] / 2)
    canvas.rotate(45)
    canvas.drawCentredString(0, 0, "AI CAPITAL")
    canvas.restoreState()


def _on_first_page(canvas, doc):
    """Callback для первой страницы: header + footer."""
    _draw_brand_header(canvas, doc)
    _draw_brand_footer(canvas, doc)


def _on_later_pages(canvas, doc):
    """Callback для последующих страниц: header + footer."""
    _draw_brand_header(canvas, doc)
    _draw_brand_footer(canvas, doc)


def _on_first_page_watermark(canvas, doc):
    """Callback с водяным знаком."""
    _draw_brand_header(canvas, doc)
    _draw_brand_footer(canvas, doc)
    _draw_watermark(canvas, doc)


# Legacy compatibility
def _add_footer(canvas, doc):
    """Legacy footer — теперь использует новые функции."""
    _draw_brand_header(canvas, doc)
    _draw_brand_footer(canvas, doc)


def _make_table(headers: List[str], rows: List[List], col_widths=None):
    """Создать стилизованную таблицу."""
    data = [headers] + rows
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # Шапка
        ("BACKGROUND", (0, 0), (-1, 0), HexColor(BRAND_DARK)),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, 0), 3 * mm),
        # Строки
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 2 * mm),
        ("TOPPADDING", (0, 1), (-1, -1), 2 * mm),
        # Зебра
        *[
            ("BACKGROUND", (0, i), (-1, i), HexColor(BRAND_LIGHT))
            for i in range(2, len(data), 2)
        ],
        # Границы
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return table


# ─── Публичные функции генерации ─────────────────────────────────────

def generate_portfolio_summary_pdf(
    portfolio_name: str,
    total_value: str,
    currency: str,
    assets: List[Dict[str, Any]],
    ai_recommendation: str = "",
    owner_name: str = "",
) -> bytes:
    """
    Генерация PDF-отчёта «Сводка по портфелю».

    Returns:
        bytes — содержимое PDF-файла.
    """
    if not REPORTLAB_AVAILABLE:
        return _fallback_pdf(f"Сводка по портфелю: {portfolio_name}")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
    )
    styles = _get_styles()
    story = []

    _add_header(story, styles, f"Сводка по портфелю", portfolio_name)

    # KPI
    kpi_data = [
        ["Стоимость портфеля", "Валюта", "Количество активов", "Владелец"],
        [total_value, currency, str(len(assets)), owner_name or "—"],
    ]
    story.append(_make_table(kpi_data[0], [kpi_data[1]]))
    story.append(Spacer(1, 6 * mm))

    # Таблица активов
    if assets:
        story.append(Paragraph("Состав портфеля", styles["BrandSubtitle"]))
        headers = ["Актив", "Тикер", "Кол-во", "Цена", "Стоимость", "Доля %"]
        rows = []
        for a in assets:
            rows.append([
                str(a.get("name", "")),
                str(a.get("symbol", "")),
                str(a.get("quantity", "")),
                str(a.get("price", "")),
                str(a.get("value", "")),
                str(a.get("weight", "")),
            ])
        story.append(_make_table(headers, rows))
        story.append(Spacer(1, 6 * mm))

    # AI-рекомендация
    if ai_recommendation:
        story.append(Paragraph("AI-рекомендация", styles["BrandSubtitle"]))
        story.append(Paragraph(ai_recommendation, styles["BrandBody"]))

    doc.build(story, onFirstPage=_add_footer, onLaterPages=_add_footer)
    return buffer.getvalue()


def generate_dd_report_pdf(
    company_name: str,
    inn: str = "",
    scores: Dict[str, Any] = None,
    red_flags: List[str] = None,
    ai_analysis: str = "",
) -> bytes:
    """Генерация PDF «Due Diligence заключение»."""
    if not REPORTLAB_AVAILABLE:
        return _fallback_pdf(f"Due Diligence: {company_name}")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm)
    styles = _get_styles()
    story = []

    _add_header(story, styles, "Due Diligence заключение", company_name)

    # ИНН
    if inn:
        story.append(Paragraph(f"<b>ИНН:</b> {inn}", styles["BrandBody"]))

    # Скоринг
    if scores:
        story.append(Paragraph("Оценка по категориям", styles["BrandSubtitle"]))
        headers = ["Категория", "Оценка (1-10)", "Статус"]
        rows = []
        for cat, score in scores.items():
            s = int(score) if isinstance(score, (int, float)) else 0
            status = "Низкий риск" if s >= 7 else ("Средний риск" if s >= 4 else "Высокий риск")
            rows.append([cat, str(s), status])
        story.append(_make_table(headers, rows))
        story.append(Spacer(1, 4 * mm))

    # Red flags
    if red_flags:
        story.append(Paragraph("Выявленные риски (Red Flags)", styles["BrandSubtitle"]))
        for i, flag in enumerate(red_flags, 1):
            story.append(Paragraph(f"{i}. {flag}", styles["BrandBody"]))
        story.append(Spacer(1, 4 * mm))

    # AI-анализ
    if ai_analysis:
        story.append(Paragraph("AI-анализ", styles["BrandSubtitle"]))
        story.append(Paragraph(ai_analysis, styles["BrandBody"]))

    doc.build(story, onFirstPage=_add_footer, onLaterPages=_add_footer)
    return buffer.getvalue()


def generate_decision_memo_pdf(
    decision_title: str,
    status: str,
    description: str,
    portfolio_name: str = "",
    ai_recommendation: str = "",
    history: List[Dict] = None,
) -> bytes:
    """Генерация PDF «Меморандум по решению»."""
    if not REPORTLAB_AVAILABLE:
        return _fallback_pdf(f"Решение: {decision_title}")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm)
    styles = _get_styles()
    story = []

    _add_header(story, styles, "Инвестиционное решение", decision_title)

    story.append(Paragraph(f"<b>Статус:</b> {status}", styles["BrandBody"]))
    if portfolio_name:
        story.append(Paragraph(f"<b>Портфель:</b> {portfolio_name}", styles["BrandBody"]))
    story.append(Spacer(1, 3 * mm))

    story.append(Paragraph("Описание", styles["BrandSubtitle"]))
    story.append(Paragraph(description or "Нет описания", styles["BrandBody"]))
    story.append(Spacer(1, 4 * mm))

    if ai_recommendation:
        story.append(Paragraph("AI-рекомендация", styles["BrandSubtitle"]))
        story.append(Paragraph(ai_recommendation, styles["BrandBody"]))
        story.append(Spacer(1, 4 * mm))

    if history:
        story.append(Paragraph("История изменений", styles["BrandSubtitle"]))
        headers = ["Дата", "Действие", "Кем"]
        rows = [[str(h.get("date", "")), str(h.get("action", "")), str(h.get("by", ""))] for h in history]
        story.append(_make_table(headers, rows))

    doc.build(story, onFirstPage=_add_footer, onLaterPages=_add_footer)
    return buffer.getvalue()


# ─── Fallback (без reportlab) ────────────────────────────────────────

def _fallback_pdf(title: str) -> bytes:
    """Минимальный PDF без reportlab (plain text)."""
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    content = f"""AI Capital Management
{title}
Дата: {now}

Для полноценного PDF-экспорта установите reportlab:
  pip install reportlab

© 2026 AI Capital Management
Толиев Акмал Идиевич · Свидетельство №009932
"""
    # Минимальный валидный PDF
    pdf = f"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length {len(content) + 50}>>
stream
BT /F1 12 Tf 50 780 Td ({content.replace(chr(10), ') Tj T* (')}) Tj ET
endstream
endobj
xref
0 6
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%EOF"""
    return pdf.encode("latin-1")
