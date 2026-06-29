from typing import Dict, Optional

# Bridge Router registry mapping addresses to destination networks
KNOWN_BRIDGES = {
    "0xa0c68c638235ee32657e8f720a23cec1bfc77c77": {"name": "Polygon PoS Bridge", "target_chain": "polygon"},
    "0xcee284f754e854890e311e3280b767f80797180d": {"name": "Arbitrum L1 Gateway", "target_chain": "arbitrum"},
    "0x99c9fc46f90e8a1c45c1113857e30d87a20c38c2": {"name": "Optimism L1 Standard Bridge", "target_chain": "optimism"},
    "0x36ce5b3e9247ea22f67a83d26ba9b5c936f0be5a": {"name": "Hop Protocol Router", "target_chain": "arbitrum"},
    "0x2b3ce4b5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2": {"name": "Across Protocol Bridge", "target_chain": "optimism"}
}

class BridgeDetector:
    def identify_bridge(self, to_address: str) -> Optional[Dict[str, str]]:
        addr_clean = to_address.strip().lower()
        if addr_clean in KNOWN_BRIDGES:
            return KNOWN_BRIDGES[addr_clean]
        return None

bridge_detector = BridgeDetector()
