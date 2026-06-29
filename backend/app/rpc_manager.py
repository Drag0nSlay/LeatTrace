import json
import urllib.request
from typing import Dict, List, Any, Optional
from .provider_health import health_monitor
from .connection_pool import connection_pool
from .rpc_metrics import rpc_metrics

PROVIDER_ENDPOINTS = {
    "ethereum": [
        "https://cloudflare-eth.com",
        "https://eth.llamarpc.com",
        "https://api.ankr.com/public/eth"
    ],
    "polygon": [
        "https://polygon-rpc.com",
        "https://polygon.llamarpc.com",
        "https://api.ankr.com/public/polygon"
    ],
    "bnb": [
        "https://bsc-dataseed.binance.org",
        "https://binance.llamarpc.com",
        "https://api.ankr.com/public/bsc"
    ],
    "avalanche": [
        "https://api.avax.network/ext/bc/C/rpc",
        "https://avax.llamarpc.com",
        "https://api.ankr.com/public/avax"
    ],
    "arbitrum": [
        "https://arb1.arbitrum.io/rpc",
        "https://arbitrum.llamarpc.com"
    ],
    "optimism": [
        "https://mainnet.optimism.io",
        "https://optimism.llamarpc.com"
    ]
}

class RPCManager:
    def __init__(self):
        self.endpoints = PROVIDER_ENDPOINTS

    def get_healthy_provider(self, chain: str) -> str:
        """Finds the fastest available, non-tripped RPC provider for a given blockchain."""
        urls = self.endpoints.get(chain, ["https://cloudflare-eth.com"])
        
        for url in urls:
            if not rpc_metrics.is_tripped(url):
                # Try pinging
                health = health_monitor.ping_provider(url)
                if health["is_healthy"]:
                    return url
                    
        # Fallback to first if all are tripped
        return urls[0]

    def execute_rpc(self, chain: str, method: str, params: List[Any]) -> Optional[Any]:
        """Executes a JSON-RPC method, switching endpoints automatically on timeouts or failures."""
        url = self.get_healthy_provider(chain)
        payload = json.dumps({"jsonrpc": "2.0", "method": method, "params": params, "id": 1}).encode("utf-8")
        
        try:
            req = connection_pool.get_request(url, payload)
            rpc_metrics.record_request(url)
            with urllib.request.urlopen(req, timeout=3) as res:
                response = json.loads(res.read().decode("utf-8"))
                rpc_metrics.reset_failures(url)
                return response.get("result")
        except Exception:
            rpc_metrics.record_failure(url)
            # Try alternate fallback endpoint
            alt_url = self.get_healthy_provider(chain)
            if alt_url != url:
                try:
                    req = connection_pool.get_request(alt_url, payload)
                    with urllib.request.urlopen(req, timeout=3) as res:
                        response = json.loads(res.read().decode("utf-8"))
                        return response.get("result")
                except Exception:
                    pass
        return None

rpc_manager = RPCManager()
