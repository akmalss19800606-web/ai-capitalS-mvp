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
    "python-jose[cryptography]" \
    python-multipart


COPY ./app /app/app

ENV PYTHONPATH=/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
