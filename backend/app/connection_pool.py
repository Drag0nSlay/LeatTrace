import urllib.request
from typing import Dict, Any

class ConnectionPoolManager:
    def __init__(self):
        # Local cache for holding persistent request headers
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "LEATrace-Forensics-Engine/1.0"
        }

    def get_request(self, url: str, payload_bytes: bytes) -> urllib.request.Request:
        """Returns configured request object with keep-alive capabilities."""
        req = urllib.request.Request(url, data=payload_bytes, headers=self.headers)
        return req

connection_pool = ConnectionPoolManager()
