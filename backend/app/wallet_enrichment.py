from typing import Dict, Any
from .threat_database import threat_db

class WalletEnrichmentEngine:
    def enrich_wallet(self, address: str) -> Dict[str, Any]:
        """Looks up address metadata and maps threat categories."""
        match = threat_db.check_sanction(address)
        if match:
            return {
                "address": address,
                "is_listed": True,
                "owner": match["owner"],
                "source_feed": match["registry"],
                "risk_tier": match["severity"]
            }
            
        return {
            "address": address,
            "is_listed": False,
            "owner": "Unknown Private Address",
            "source_feed": "None",
            "risk_tier": "None"
        }

wallet_enricher = WalletEnrichmentEngine()
