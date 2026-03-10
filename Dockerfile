FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    sqlalchemy \
    psycopg2-binary \
    "pydantic[email]" \
    pydantic-settings \
    "passlib[bcrypt]" \
    "bcrypt<4.1" \
    "python-jose[cryptography]" \
    python-multipart \
    openai \
    httpx \
    alembic \
    redis \
    "numpy>=1.26.0" \
    "scipy>=1.12.0" \
    "scikit-learn>=1.4.0" \
        beautifulsoup4 \
    "google-generativeai>=0.8.0" \
    lxml \
    jinja2 \
    reportlab \
    PyPDF2 \
    python-docx \
    openpyxl \
    pdfplumber
COPY ./app /app/app
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
