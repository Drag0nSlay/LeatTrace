import time
import urllib.request
import json
from typing import Dict, Any, Optional

class ProviderHealthMonitor:
    def __init__(self):
        self.health_history = {}

    def ping_provider(self, url: str) -> Dict[str, Any]:
        """Pings the RPC provider endpoint to measure latency and verify JSON-RPC compatibility."""
        payload = json.dumps({"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}).encode("utf-8")
        start = time.time()
        try:
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=3) as res:
                response = json.loads(res.read().decode("utf-8"))
                latency = (time.time() - start) * 1000
                is_healthy = "result" in response
                
                status = {
                    "is_healthy": is_healthy,
                    "latency_ms": latency,
                    "rate_limited": False,
                    "error_message": None
                }
                self.health_history[url] = status
                return status
        except Exception as e:
            status = {
                "is_healthy": False,
                "latency_ms": 0.0,
                "rate_limited": "429" in str(e),
                "error_message": str(e)
            }
            self.health_history[url] = status
            return status

health_monitor = ProviderHealthMonitor()
