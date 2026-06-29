import json
from typing import Optional, Any
from .redis_client import redis_client

class RPCCacheManager:
    def __init__(self):
        self.enabled = True

    def get(self, key: str) -> Optional[Any]:
        """Gets cached JSON-RPC payload from Redis."""
        if not self.enabled or not redis_client:
            return None
        try:
            val = redis_client.get(f"rpc_cache:{key}")
            if val:
                return json.loads(val)
        except Exception:
            pass
        return None

    def set(self, key: str, value: Any, expire_seconds: int = 60) -> None:
        """Caches JSON-RPC payload in Redis."""
        if not self.enabled or not redis_client:
            return
        try:
            redis_client.setex(f"rpc_cache:{key}", expire_seconds, json.dumps(value))
        except Exception:
            pass

rpc_cache = RPCCacheManager()
