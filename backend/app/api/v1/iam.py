from fastapi import APIRouter, HTTPException, Query, Header, Depends, Body
from typing import List, Dict, Any, Optional
from ...core.oauth_server import oauth_server
from ...core.oidc_provider import oidc_provider
from ...core.refresh_service import refresh_service
from ...infra.device_manager import device_manager
from ...core.session_manager import session_manager
from ...core.access_control import rbac_engine, abac_engine
from ...core.security import create_access_token, get_current_user, get_password_hash
from ...db import models
from ...core.jwks_service import jwks_service
from ...db.session import get_db
from sqlalchemy.orm import Session

router = APIRouter(tags=["IAM & Authentication Services"])


@router.get("/users")
@router.get("/api/iam/users")
def list_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List active identity records for the authenticated administration view."""
    users = db.query(models.User).order_by(models.User.created_at.asc()).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "mfa_enabled": user.mfa_enabled,
            "department": user.department,
            "created_at": user.created_at,
            "last_login": user.last_login,
        }
        for user in users
    ]


@router.post("/users", status_code=201)
@router.post("/api/iam/users", status_code=201)
def create_user(
    payload: dict = Body(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrator accounts can add users")

    email = str(payload.get("email", "")).strip().lower()
    username = str(payload.get("username", "")).strip().lower()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "investigator")).strip().lower()
    if not email or not username or len(password) < 12:
        raise HTTPException(status_code=400, detail="Email, username, and a password of at least 12 characters are required")
    if db.query(models.User).filter((models.User.email == email) | (models.User.username == username)).first():
        raise HTTPException(status_code=409, detail="A user with that email or username already exists")

    user = models.User(
        id=f"usr_{uuid.uuid4().hex[:12]}",
        email=email,
        username=username,
        hashed_password=get_password_hash(password),
        role=role,
        is_active=True,
        department=str(payload.get("department", "Cyber Crime Cell")).strip() or "Cyber Crime Cell",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "mfa_enabled": user.mfa_enabled,
        "department": user.department,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }


@router.get("/admin/activity")
@router.get("/api/iam/admin/activity")
def admin_activity(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrator accounts can view login activity")

    users = db.query(models.User).order_by(models.User.last_login.desc().nullslast(), models.User.created_at.desc()).all()
    sessions = db.query(models.UserSession).filter(models.UserSession.is_active == True).order_by(models.UserSession.created_at.desc()).all()
    user_map = {user.id: user for user in users}
    return {
        "login_activity": [
            {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "last_login": user.last_login,
            }
            for user in users
        ],
        "active_sessions": [
            {
                "id": session.id,
                "username": user_map.get(session.user_id).username if user_map.get(session.user_id) else "Unknown",
                "email": user_map.get(session.user_id).email if user_map.get(session.user_id) else "",
                "started_at": session.created_at,
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
                "expires_at": session.expires_at,
            }
            for session in sessions
        ],
    }


@router.get("/.well-known/openid-configuration")
def get_oidc_config():
    return oidc_provider.get_discovery_document()

@router.get("/jwks.json")
def get_jwks():
    return jwks_service.get_jwks()

@router.post("/oauth/token")
def issue_oauth_token(
    grant_type: str = Body(...),
    code: Optional[str] = Body(None),
    client_id: str = Body(...),
    client_secret: Optional[str] = Body(None),
    code_verifier: Optional[str] = Body(None),
    refresh_token: Optional[str] = Body(None)
):
    if grant_type == "authorization_code":
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")
        # Validate auth code and PKCE verifier
        is_valid = oauth_server.validate_auth_code(code, client_id, code_verifier)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid authorization code or PKCE verification failed")
            
        # Issue initial tokens
        family_id, new_refresh = refresh_service.create_family()
        access_token = create_access_token(data={"sub": client_id, "grant": "authorization_code"})
        id_token = oidc_provider.generate_id_token(client_id, "", "", "")
        return {
            "access_token": access_token,
            "id_token": id_token,
            "refresh_token": new_refresh,
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
    elif grant_type == "refresh_token":
        if not refresh_token:
            raise HTTPException(status_code=400, detail="Missing refresh token")
        try:
            new_ref, new_acc = refresh_service.rotate_token(refresh_token)
            return {
                "access_token": new_acc,
                "refresh_token": new_ref,
                "expires_in": 3600,
                "token_type": "Bearer"
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
            
    elif grant_type == "client_credentials":
        access_token = create_access_token(data={"sub": client_id, "grant": "client_credentials"})
        return {
            "access_token": access_token,
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
    raise HTTPException(status_code=400, detail="Unsupported grant type")

@router.get("/userinfo")
def get_userinfo(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    # In production, decode the token to get user info
    # For now return structured response indicating token required
    return {"status": "requires_valid_token", "message": "Decode bearer token to retrieve user info"}

@router.get("/auth/device")
def get_device_history(user_agent: Optional[str] = Header(None)):
    ua = user_agent or "Unknown"
    device_details = device_manager.parse_user_agent(ua)
    risk_score = device_manager.evaluate_device_risk(None, ua, False)
    
    return {
        "device_details": device_details,
        "risk_score": risk_score,
    }

@router.post("/auth/session/revoke")
def revoke_session(session_id: str = Body(..., embed=True)):
    success = session_manager.terminate_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "revoked", "session_id": session_id}

@router.post("/auth/policies/evaluate")
def evaluate_abac_policy(
    user_clearance: int = Body(...),
    resource_clearance: int = Body(...),
    department: str = Body(...),
    restriction: Optional[str] = Body(None)
):
    user_attrs = {"clearance_level": user_clearance, "department": department, "role": "investigator"}
    res_attrs = {"clearance_required": resource_clearance, "department_restriction": restriction}
    env_attrs = {"current_hour": 14}
    
    allowed = abac_engine.evaluate_policy(user_attrs, res_attrs, env_attrs)
    return {"allowed": allowed}
