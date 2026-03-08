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
    redis
COPY ./app /app/app
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
