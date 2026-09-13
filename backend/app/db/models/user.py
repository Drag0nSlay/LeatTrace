"""User and authentication related database models."""

import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="investigator")  # admin, supervisor, investigator, analyst, auditor, readonly
    is_active = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True)
    department = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    refresh_token = Column(String, index=True, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)


class UserSecuritySettings(Base):
    __tablename__ = "user_security_settings"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    allowed_ip_ranges = Column(Text, nullable=False, default="")
    session_timeout_minutes = Column(Integer, nullable=False, default=480)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class OAuthClient(Base):
    __tablename__ = "oauth_clients"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, unique=True, index=True, nullable=False)
    client_secret_hash = Column(String, nullable=False)
    client_name = Column(String, nullable=True)
    redirect_uris = Column(Text, nullable=False)  # JSON array
    grant_types = Column(Text, default='{"authorization_code","refresh_token"}')  # JSON array
    scopes = Column(String, default="openid profile email roles")
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_confidential = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class AuthCode(Base):
    """
    OAuth 2.0 Authorization codes with PKCE support and TTL expiry.
    Replaces in-memory AUTH_CODES dict in oauth_server.py.
    """
    __tablename__ = "auth_codes"

    id                   = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code                 = Column(String, unique=True, nullable=False, index=True)
    client_id            = Column(String, nullable=False)
    user_id              = Column(String, nullable=False)
    code_challenge       = Column(String, nullable=True)     # PKCE
    code_challenge_method = Column(String, nullable=True)    # "S256" or "plain"
    scopes               = Column(String, nullable=True)
    expires_at           = Column(DateTime, nullable=False)  # 10-minute TTL
    used                 = Column(Boolean, default=False)    # single-use enforcement
    created_at           = Column(DateTime, default=datetime.datetime.utcnow)


class TrustedDevice(Base):
    __tablename__ = "trusted_devices"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    device_fingerprint = Column(String, index=True, nullable=False)
    device_name = Column(String, default="Unknown Device")
    os_name = Column(String, nullable=True)
    browser_name = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    last_used = Column(DateTime, default=datetime.datetime.utcnow)
    is_trusted = Column(Boolean, default=True)
    trust_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class RecoveryCode(Base):
    __tablename__ = "recovery_codes"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    code_hash = Column(String, nullable=False)
    is_used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PasswordHistory(Base):
    __tablename__ = "password_history"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    key_hash = Column(String, unique=True, nullable=False)
    key_prefix = Column(String, nullable=False)  # First 8 chars for identification
    name = Column(String, nullable=False)
    scopes = Column(String, default="read")
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SecurityPolicy(Base):
    __tablename__ = "security_policies"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    policy_name = Column(String, unique=True, nullable=False)
    policy_type = Column(String, nullable=False)  # abac, password, session, network
    policy_rules = Column(Text, nullable=False)  # JSON rules
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=100)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
