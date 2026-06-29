import hashlib
from typing import List, Dict, Any
from .obfuscation_score import obfuscation_scorer
from .risk_engine import risk_engine
from .laundering_engine import laundering_engine

# Known Tornado Cash C-chain Pool contracts
MIXER_POOLS = {
    "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc": "Tornado.Cash 0.1 ETH",
    "0x47ce0dbc5425fd3e2002a290749d5f6e9f6f8594": "Tornado.Cash 1 ETH",
    "0x91054378296ec657a4077c16c85a4cf13e8f8f8f": "Tornado.Cash 10 ETH",
    "0xd4b88df96a2b3c4d5e6f7a8b9c0d1e2f3a4b568a": "Tornado.Cash 100 ETH"
}

class MixerDetectorService:
    def analyze_address_obfuscation(self, address: str, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        addr_clean = address.strip().lower()
        
        mixer_txs = []
        mixed_volume = 0.0
        
        for tx in transactions:
            target = tx.get("to", "").lower()
            if target in MIXER_POOLS:
                mixer_txs.append({
                    "deposit_tx": tx.get("hash"),
                    "amount": tx.get("value", 0.0),
                    "pool": MIXER_POOLS[target],
                    "timestamp": tx.get("timestamp")
                })
                mixed_volume += tx.get("value", 0.0)
                
        # Detect splits and peels
        peel = laundering_engine.detect_peel_chain(transactions, addr_clean)
        
        # Calculate scores
        obf = obfuscation_scorer.calculate_score(len(mixer_txs), len(peel["peel_timeline"]), peel["is_peel_chain_active"])
        risk = risk_engine.evaluate_risk(100.0 if len(mixer_txs) > 0 else 10.0, peel["is_peel_chain_active"])
        
        return {
            "address": address,
            "has_mixer_interaction": len(mixer_txs) > 0,
            "obfuscation_probability_score": obf,
            "mixer_exposure_risk_score": risk,
            "total_mixed_value_eth": mixed_volume,
            "peel_chain": peel,
            "mixer_deposits": mixer_txs
        }

mixer_detector = MixerDetectorService()
