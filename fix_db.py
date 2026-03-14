import os

# 1. Создаём app/db/session.py
session_content = '''"""
app/db/session.py — SQLAlchemy engine и SessionLocal.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
'''
with open('backend/app/db/session.py', 'w', encoding='utf-8') as f:
    f.write(session_content)
print('session.py created')

# 2. Создаём app/db/models/user.py если не существует
user_path = 'backend/app/db/models/user.py'
if not os.path.exists(user_path):
    user_content = '''"""
app/db/models/user.py — модель пользователя.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, default="")
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
'''
    with open(user_path, 'w', encoding='utf-8') as f:
        f.write(user_content)
    print('user.py created')
else:
    print('user.py already exists')
