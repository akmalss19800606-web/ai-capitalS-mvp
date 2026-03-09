"""
Модели безопасности и контроля доступа.
Фаза 3, Сессия 3 — MFA, SSO, управление сессиями, ABAC.
COLLAB-AUTH-001, COLLAB-ACCESS-001.
"""
from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, ForeignKey, Text, JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class MfaSettings(Base):
    """Настройки двухфакторной аутентификации пользователя (COLLAB-AUTH-001.1)."""
    __tablename__ = "mfa_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    is_enabled = Column(Boolean, default=False, nullable=False)
    totp_secret = Column(String(64), nullable=True)
    backup_codes = Column(JSON, nullable=True)  # list of hashed backup codes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="mfa_settings", uselist=False)


class SsoProvider(Base):
    """Конфигурация SSO-провайдеров — SAML 2.0, OAuth 2.0 / OIDC (COLLAB-AUTH-001.2)."""
    __tablename__ = "sso_providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)   # e.g. "Azure AD", "Google Workspace"
    protocol = Column(String(32), nullable=False)              # "saml" | "oidc"
    client_id = Column(String(256), nullable=True)
    client_secret = Column(String(512), nullable=True)
    issuer_url = Column(String(512), nullable=True)            # OIDC issuer
    metadata_url = Column(String(512), nullable=True)          # SAML metadata
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserSession(Base):
    """Активные сессии пользователей (COLLAB-AUTH-001.4)."""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_jti = Column(String(64), unique=True, nullable=False, index=True)  # JWT ID
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    device_info = Column(String(256), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="sessions")


class AbacPolicy(Base):
    """Политики ABAC — контроль доступа на основе атрибутов (COLLAB-ACCESS-001.1)."""
    __tablename__ = "abac_policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    resource_type = Column(String(64), nullable=False)   # "decision", "portfolio", "report", etc.
    action = Column(String(32), nullable=False)           # "read", "write", "delete", "approve"
    # Conditions as JSON — evaluated at runtime
    # Example: {"role_in": ["Admin", "Analyst"], "department_eq": "Investment"}
    conditions = Column(JSON, nullable=False, default=dict)
    effect = Column(String(8), default="allow", nullable=False)  # "allow" | "deny"
    priority = Column(Integer, default=0, nullable=False)  # higher = evaluated first
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CustomRole(Base):
    """Кастомные роли с гранулярными правами (COLLAB-ACCESS-001.4)."""
    __tablename__ = "custom_roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    # Permissions as JSON dict — module => list of actions
    # Example: {"decisions": ["read", "write"], "reports": ["read"], "analytics": ["read"]}
    permissions = Column(JSON, nullable=False, default=dict)
    is_system = Column(Boolean, default=False, nullable=False)  # system roles can't be deleted
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DecisionAccess(Base):
    """Гранулярный доступ к решениям — владелец / участник / зритель (COLLAB-ACCESS-001.2)."""
    __tablename__ = "decision_access"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    access_level = Column(String(16), nullable=False)  # "owner", "editor", "viewer"
    can_view_financials = Column(Boolean, default=False, nullable=False)  # COLLAB-ACCESS-001.3
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
