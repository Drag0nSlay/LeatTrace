import pytest
from app.oauth_server import oauth_server
from app.oidc_provider import oidc_provider
from app.refresh_service import refresh_service
from app.device_manager import device_manager
from app.session_manager import session_manager
from app.rbac_engine import rbac_engine
from app.abac_engine import abac_engine

def test_oauth_pkce_validation():
    # Generate auth code
    code = oauth_server.generate_auth_code(
        client_id="leatrace-frontend",
        user_id="user_101",
        code_challenge="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        code_challenge_method="S256"
    )
    
    # Validation with incorrect verifier should fail
    assert oauth_server.validate_auth_code("auth_code_invalid", "leatrace-frontend") is False
    assert oauth_server.validate_auth_code(code, "leatrace-frontend", "wrong-verifier") is False
    
    # Regenerate code and test with correct verifier (dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk)
    code = oauth_server.generate_auth_code(
        client_id="leatrace-frontend",
        user_id="user_101",
        code_challenge="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        code_challenge_method="S256"
    )
    assert oauth_server.validate_auth_code(code, "leatrace-frontend", "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk") is True

def test_oidc_discovery_and_claims():
    doc = oidc_provider.get_discovery_document()
    assert doc["issuer"] == "http://localhost:8000"
    assert "jwks_uri" in doc
    
    token = oidc_provider.generate_id_token("user_101", "inspector@gov.in", "investigator", "Cybercrime")
    assert token["sub"] == "user_101"
    assert token["role"] == "investigator"

def test_refresh_token_rotation_and_reuse():
    family_id, ref_1 = refresh_service.create_family()
    
    # Initial rotation
    ref_2, acc_1 = refresh_service.rotate_token(ref_1)
    assert ref_2 != ref_1
    
    # Second rotation (using active token)
    ref_3, acc_2 = refresh_service.rotate_token(ref_2)
    assert ref_3 != ref_2
    
    # Replay attack: reusing ref_1 (used token) should revoke the family
    with pytest.raises(Exception, match="Token reuse detected"):
        refresh_service.rotate_token(ref_1)

def test_device_risk_scoring():
    ua_windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"
    details = device_manager.parse_user_agent(ua_windows)
    assert details["os"] == "Windows"
    assert details["browser"] == "Google Chrome"
    
    # Non-trusted external user agent risk should be elevated
    risk = device_manager.evaluate_device_risk("8.8.8.8", ua_windows, False)
    assert risk >= 50

def test_session_concurrency_limit():
    user_id = "investigator_x"
    # Create 3 sessions
    session_manager.create_session("s1", user_id, "Chrome", "192.168.1.1")
    session_manager.create_session("s2", user_id, "Firefox", "192.168.1.2")
    session_manager.create_session("s3", user_id, "Edge", "192.168.1.3")
    
    active_sessions = session_manager.list_user_sessions(user_id)
    assert len(active_sessions) == 3
    
    # Adding a 4th session should terminate the oldest one (s1)
    session_manager.create_session("s4", user_id, "Safari", "192.168.1.4")
    active_sessions_updated = session_manager.list_user_sessions(user_id)
    assert len(active_sessions_updated) == 3
    assert not any(s["session_id"] == "s1" for s in active_sessions_updated)

def test_rbac_inheritance():
    # Super Admin inherits settings:edit from admin
    assert rbac_engine.has_permission("super_admin", "settings:edit") is True
    # Read-Only should not have write permissions
    assert rbac_engine.has_permission("read_only", "settings:edit") is False

def test_abac_clearance_and_location():
    user_attrs = {"clearance_level": 3, "department": "Cybercrime", "role": "investigator"}
    res_attrs = {"clearance_required": 2, "department_restriction": "Cybercrime"}
    env_attrs = {"current_hour": 14}
    
    # Match inputs
    assert abac_engine.evaluate_policy(user_attrs, res_attrs, env_attrs) is True
    
    # Low clearance level should fail
    user_attrs["clearance_level"] = 1
    assert abac_engine.evaluate_policy(user_attrs, res_attrs, env_attrs) is False
