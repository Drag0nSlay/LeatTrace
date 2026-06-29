from typing import Dict, Any, Optional

KNOWN_ENTITIES = {
    "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be": {"entity_name": "Binance Hot Wallet", "category": "Exchange", "confidence": 0.99},
    "0xab5801a7d398351b8be11c439e05c5b3259aec9b": {"entity_name": "Coinbase Deposit Hub", "category": "Exchange", "confidence": 0.98},
    "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": {"entity_name": "Lido Staking Contract", "category": "DeFi / Staking", "confidence": 0.99}
}

class EntityResolutionEngine:
    def resolve_entity(self, address: str) -> Optional[Dict[str, Any]]:
        addr_clean = address.strip().lower()
        if addr_clean in KNOWN_ENTITIES:
            return KNOWN_ENTITIES[addr_clean]
        return None

entity_resolution = EntityResolutionEngine()
