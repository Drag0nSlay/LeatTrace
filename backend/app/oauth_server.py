import hashlib
import base64
import secrets
from typing import Dict, Any, Optional

# Local dynamic registries to hold client info
OAUTH_CLIENTS = {
    "leatrace-frontend": {
        "client_id": "leatrace-frontend",
        "client_secret": "secure-frontend-client-secret-key-100",
        "redirect_uris": ["http://localhost:3000/callback"],
        "grant_types": ["authorization_code", "refresh_token", "client_credentials"]
    }
}
AUTH_CODES = {} # code -> { client_id, user_id, code_challenge, code_challenge_method }

class OAuthServer:
    def register_client(self, client_id: str, client_secret: str, redirect_uris: list) -> Dict[str, Any]:
        """Registers a new client application dynamically."""
        client_data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uris": redirect_uris,
            "grant_types": ["authorization_code", "refresh_token"]
        }
        OAUTH_CLIENTS[client_id] = client_data
        return client_data

    def generate_auth_code(
        self, 
        client_id: str, 
        user_id: str, 
        code_challenge: Optional[str] = None, 
        code_challenge_method: Optional[str] = None
    ) -> str:
        """Issues an authorization code tied to optional PKCE parameters."""
        code = f"auth_code_{secrets.token_hex(16)}"
        AUTH_CODES[code] = {
            "client_id": client_id,
            "user_id": user_id,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method
        }
        return code

    def validate_auth_code(
        self, 
        code: str, 
        client_id: str, 
        code_verifier: Optional[str] = None
    ) -> bool:
        """Validates the authorization code and enforces PKCE verification if enabled."""
        auth_data = AUTH_CODES.get(code)
        if not auth_data:
            return False
            
        if auth_data["client_id"] != client_id:
            return False
            
        # PKCE validation
        challenge = auth_data.get("code_challenge")
        if challenge:
            if not code_verifier:
                return False
            
            method = auth_data.get("code_challenge_method", "plain")
            if method == "S256":
                sha256_hash = hashlib.sha256(code_verifier.encode("utf-8")).digest()
                computed = base64.urlsafe_b64encode(sha256_hash).decode("utf-8").replace("=", "")
                if computed != challenge:
                    return False
            else:
                if code_verifier != challenge:
                    return False
                    
        # Code is valid and single-use, consume it
        AUTH_CODES.pop(code, None)
        return True

oauth_server = OAuthServer()
