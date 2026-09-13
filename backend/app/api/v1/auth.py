import uuid
import datetime
import hashlib
import ipaddress
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...db import models, schemas
from ...core import security
from ...core.event_broker import broker
from ...services.intel.siem_exporter import log_security_event
from ...services.risk.anomaly_detector import detect_login_brute_force

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def user_payload(user: models.User) -> dict:
    """Return the identity fields consumed by the frontend without exposing password data."""
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
        "mfa_enabled": user.mfa_enabled,
        "department": user.department,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }


def get_security_settings(db: Session, user_id: str):
    settings = db.query(models.UserSecuritySettings).filter(
        models.UserSecuritySettings.user_id == user_id
    ).first()
    if settings is None:
        settings = models.UserSecuritySettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def ip_allowed(client_ip: str, ranges: str) -> bool:
    configured = [item.strip() for item in ranges.split(",") if item.strip()]
    if not configured:
        return True
    try:
        address = ipaddress.ip_address(client_ip)
        return any(address in ipaddress.ip_network(item, strict=False) for item in configured)
    except ValueError:
        return False

@router.post("/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Find user by username or email
    user = db.query(models.User).filter(
        (models.User.email == form_data.username) | 
        (models.User.username == form_data.username)
    ).first()

    ip_address = request.client.host if request.client else "127.0.0.1"

    if user:
        security_settings = get_security_settings(db, user.id)
        if not ip_allowed(ip_address, security_settings.allowed_ip_ranges):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Login blocked: this IP address is outside the allowed gateway ranges")

    if not user or not security.verify_password(form_data.password, user.hashed_password):
        # Log to audit trail
        last_log = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).first()
        prev_hash = last_log.hash if last_log else "0"
        log_id = f"log_{uuid.uuid4().hex[:7]}"
        
        timestamp = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        timestamp_str = timestamp.isoformat()
        raw_str = f"{prev_hash}_{log_id}_Failed login attempt for account {form_data.username}_{timestamp_str}_failure"
        computed_hash = hashlib.sha256(raw_str.encode('utf-8')).hexdigest()

        audit_entry = models.AuditLog(
            id=log_id,
            user_id="anonymous",
            username=form_data.username,
            action=f"Failed login attempt for account {form_data.username}",
            ip_address=ip_address,
            status="failure",
            prev_hash=prev_hash,
            hash=computed_hash,
            timestamp=timestamp
        )
        db.add(audit_entry)
        db.commit()

        # Log to SIEM
        log_security_event(
            action=f"Failed login attempt on account: {form_data.username}",
            status="failure",
            username=form_data.username,
            ip_address=ip_address,
            severity="MEDIUM"
        )

        # Check anomaly
        await detect_login_brute_force(db, form_data.username, ip_address, broker)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if MFA is enabled
    if user.mfa_enabled:
        temp_token = security.create_access_token(
            data={"sub": user.id, "mfa_pending": True},
            expires_delta=datetime.timedelta(minutes=5)
        )
        return {
            "requires_mfa": True,
            "temp_token": temp_token,
            "user": user_payload(user)
        }

    # Generate full access & refresh tokens
    access_token = security.create_access_token(data={"sub": user.id})
    refresh_token = security.create_access_token(
        data={"sub": user.id, "refresh": True},
        expires_delta=datetime.timedelta(days=7)
    )

    # Create new session entry
    session_id = f"sess_{uuid.uuid4().hex[:7]}"
    user_agent = request.headers.get("user-agent", "Unknown Device")
    ip_address = request.client.host if request.client else "127.0.0.1"

    new_session = models.UserSession(
        id=session_id,
        user_id=user.id,
        refresh_token=refresh_token,
        ip_address=ip_address,
        user_agent=user_agent,
        is_active=True,
        expires_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(minutes=get_security_settings(db, user.id).session_timeout_minutes)
    )
    db.add(new_session)
    
    # Update last login time
    user.last_login = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    
    # Audit log
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=user.id,
        username=user.username,
        action="User logged in successfully (Non-MFA)",
        ip_address=ip_address,
        status="success"
    )
    db.add(audit_entry)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_payload(user)
    }

@router.post("/mfa/setup", response_model=schemas.MFASetupOut)
def setup_mfa(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.mfa_secret:
        current_user.mfa_secret = security.generate_totp_secret()
        db.commit()

    totp_uri = security.get_totp_uri(current_user.mfa_secret, current_user.email)
    return {
        "secret": current_user.mfa_secret,
        "qr_code_uri": totp_uri
    }

@router.post("/mfa/enable")
def enable_mfa(
    verify_req: schemas.MFAVerifyRequest,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Set up MFA before enabling it")

    if not security.verify_totp_code(current_user.mfa_secret, verify_req.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authenticator code")

    current_user.mfa_enabled = True
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action="Enabled MFA via TOTP authenticator",
        status="success"
    )
    db.add(audit_entry)
    db.commit()
    return {"status": "enabled", "mfa_enabled": True}

@router.post("/mfa/verify")
def verify_mfa(
    request: Request,
    verify_req: schemas.MFAVerifyRequest,
    temp_token: str,
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate MFA session token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        from jose import jwt
        payload = jwt.decode(temp_token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        user_id: str = payload.get("sub")
        mfa_pending = payload.get("mfa_pending")
        if user_id is None or not mfa_pending:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise credentials_exception

    # Verify TOTP code
    is_valid = security.verify_totp_code(user.mfa_secret, verify_req.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit verification code"
        )

    # Enable user MFA status if not already set
    if not user.mfa_enabled:
        user.mfa_enabled = True
        db.commit()

    # Generate full access & refresh tokens
    access_token = security.create_access_token(data={"sub": user.id})
    refresh_token = security.create_access_token(
        data={"sub": user.id, "refresh": True},
        expires_delta=datetime.timedelta(days=7)
    )

    # Session Tracking
    session_id = f"sess_{uuid.uuid4().hex[:7]}"
    user_agent = request.headers.get("user-agent", "Unknown Device")
    ip_address = request.client.host if request.client else "127.0.0.1"

    new_session = models.UserSession(
        id=session_id,
        user_id=user.id,
        refresh_token=refresh_token,
        ip_address=ip_address,
        user_agent=user_agent,
        is_active=True,
        expires_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(minutes=get_security_settings(db, user.id).session_timeout_minutes)
    )
    db.add(new_session)

    # Update last login
    user.last_login = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

    # Log action
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=user.id,
        username=user.username,
        action="User logged in successfully via MFA TOTP",
        ip_address=ip_address,
        status="success"
    )
    db.add(audit_entry)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_payload(user)
    }

@router.post("/refresh", response_model=schemas.TokenRefreshResponse)
def refresh_token(
    refresh_req: schemas.TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
    )
    try:
        from jose import jwt
        payload = jwt.decode(refresh_req.refresh_token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        user_id: str = payload.get("sub")
        is_refresh = payload.get("refresh")
        if user_id is None or not is_refresh:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    # Find active session with this refresh token (for token rotation check)
    session = db.query(models.UserSession).filter(
        models.UserSession.refresh_token == refresh_req.refresh_token,
        models.UserSession.is_active == True,
        models.UserSession.expires_at > datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    ).first()

    if not session:
        # Raise potential replay attack warning
        raise credentials_exception

    # Token Rotation: Invalidate previous session token
    session.is_active = False

    # Issue new access & refresh tokens
    new_access_token = security.create_access_token(data={"sub": user_id})
    new_refresh_token = security.create_access_token(
        data={"sub": user_id, "refresh": True},
        expires_delta=datetime.timedelta(days=7)
    )

    # Create rotated session entry
    new_session = models.UserSession(
        id=f"sess_{uuid.uuid4().hex[:7]}",
        user_id=user_id,
        refresh_token=new_refresh_token,
        ip_address=session.ip_address,
        user_agent=session.user_agent,
        is_active=True,
        expires_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(minutes=get_security_settings(db, user_id).session_timeout_minutes)
    )
    db.add(new_session)
    db.commit()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/sessions", response_model=list[schemas.UserSessionOut])
def get_active_sessions(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(models.UserSession).filter(
        models.UserSession.user_id == current_user.id,
        models.UserSession.is_active == True
    ).order_by(models.UserSession.created_at.desc()).all()
    return sessions

@router.get("/security-settings")
def read_security_settings(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    settings = get_security_settings(db, current_user.id)
    return {
        "allowed_ip_ranges": settings.allowed_ip_ranges,
        "session_timeout_minutes": settings.session_timeout_minutes,
    }

@router.put("/security-settings")
def update_security_settings(
    payload: dict,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrator accounts can change gateway security settings")

    ranges = str(payload.get("allowed_ip_ranges", "")).strip()
    timeout = int(payload.get("session_timeout_minutes", 480))
    if timeout < 5 or timeout > 10080:
        raise HTTPException(status_code=400, detail="Session timeout must be between 5 minutes and 7 days")
    for item in [value.strip() for value in ranges.split(",") if value.strip()]:
        try:
            ipaddress.ip_network(item, strict=False)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid IP or CIDR range: {item}")

    settings = get_security_settings(db, current_user.id)
    settings.allowed_ip_ranges = ranges
    settings.session_timeout_minutes = timeout
    db.commit()
    return {"allowed_ip_ranges": ranges, "session_timeout_minutes": timeout}

@router.post("/sessions/revoke/{session_id}")
def revoke_session(
    session_id: str,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.UserSession).filter(
        models.UserSession.id == session_id,
        models.UserSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    session.is_active = False
    
    # Audit log
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action=f"Revoked active device session: {session_id}",
        status="success"
    )
    db.add(audit_entry)
    db.commit()

    return {"detail": "Session revoked successfully"}

@router.post("/sessions/revoke-all")
def revoke_all_sessions(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrator accounts can revoke sessions")

    revoked_count = db.query(models.UserSession).filter(
        models.UserSession.user_id == current_user.id,
        models.UserSession.is_active == True
    ).update({models.UserSession.is_active: False}, synchronize_session=False)

    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action=f"Revoked all active device sessions ({revoked_count})",
        status="success"
    )
    db.add(audit_entry)
    db.commit()
    return {"detail": "All active sessions revoked", "revoked_count": revoked_count}

@router.post("/oauth/{provider}")
def oauth_login(
    provider: str,
    request: Request,
    auth_code: str,
    db: Session = Depends(get_db)
):
    if provider not in ["google", "microsoft"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth2 provider. Supported: google, microsoft"
        )

    # Simulated OAuth2 resource exchange (fetching user details from code)
    simulated_email = f"officer.{auth_code.lower()[:5]}@cybercrime.gov.in"
    simulated_username = f"Officer {auth_code.capitalize()[:5]}"

    # Find or create user
    user = db.query(models.User).filter(models.User.email == simulated_email).first()
    if not user:
        user = models.User(
            id=f"usr_{uuid.uuid4().hex[:7]}",
            email=simulated_email,
            username=simulated_username,
            hashed_password=security.get_password_hash("OAuthSecureDefaultPass!2026"),
            role="investigator",
            is_active=True,
            mfa_enabled=False,
            oauth_provider=provider,
            oauth_id=f"oauth_{uuid.uuid4().hex[:7]}",
            department="Cyber Crime Cell"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate full access & refresh tokens
    access_token = security.create_access_token(data={"sub": user.id})
    refresh_token = security.create_access_token(
        data={"sub": user.id, "refresh": True},
        expires_delta=datetime.timedelta(days=7)
    )

    # Store Session
    session_id = f"sess_{uuid.uuid4().hex[:7]}"
    user_agent = request.headers.get("user-agent", "Unknown Device")
    ip_address = request.client.host if request.client else "127.0.0.1"

    new_session = models.UserSession(
        id=session_id,
        user_id=user.id,
        refresh_token=refresh_token,
        ip_address=ip_address,
        user_agent=user_agent,
        is_active=True,
        expires_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(minutes=get_security_settings(db, user.id).session_timeout_minutes)
    )
    db.add(new_session)

    # Audit log
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=user.id,
        username=user.username,
        action=f"User authenticated via OAuth2 ({provider.capitalize()})",
        ip_address=ip_address,
        status="success"
    )
    db.add(audit_entry)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_payload(user)
    }

@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(security.get_current_user)):
    return current_user
