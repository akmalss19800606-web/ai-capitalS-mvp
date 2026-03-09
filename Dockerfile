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
    pytest \
    pytest-asyncio
COPY ./app /app/app
COPY ./migrations /app/migrations
COPY ./alembic.ini /app/alembic.ini
COPY ./pytest.ini /app/pytest.ini
COPY ./tests /app/tests
ENV PYTHONPATH=/app
ENV BACKEND_URL=http://ai_capital_backend:8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
