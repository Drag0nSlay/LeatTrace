from typing import Dict, Any, Optional

# Off-line Preseeded OFAC Sanction Database
SANCTION_FEEDS = {
    "0x71c20e241775e5332f143715df332f143789a71b": {"owner": "Tornado Cash Router", "registry": "OFAC / EU", "severity": "Critical"},
    "0x9012345678901234567890123456789012345678": {"owner": "Lazarus Group Wallet", "registry": "OFAC", "severity": "Critical"}
}

class ThreatIntelligenceDatabase:
    def check_sanction(self, address: str) -> Optional[Dict[str, Any]]:
        addr_clean = address.strip().lower()
        if addr_clean in SANCTION_FEEDS:
            return SANCTION_FEEDS[addr_clean]
        return None

threat_db = ThreatIntelligenceDatabase()
