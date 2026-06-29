from typing import Dict, Any

class WalletReputationScorer:
    def calculate_reputation(self, address: str, tx_count: int, sanction_exposure: float) -> Dict[str, Any]:
        """Calculates trust and risk metrics based on transaction volumes and mixer exposure."""
        # Simple heuristic risk assessment
        base_risk = 10
        if sanction_exposure > 0:
            base_risk += int(sanction_exposure * 0.8)
        if tx_count < 2:
            base_risk += 15 # Brand new EOA EOA risk
            
        risk_score = min(base_risk, 100)
        trust_rating = max(100 - risk_score, 0)
        
        return {
            "address": address,
            "risk_score": risk_score,
            "trust_rating": trust_rating,
            "reputation_tier": "Highly Trusted" if trust_rating > 80 else "Suspicious" if trust_rating < 40 else "Neutral"
        }

wallet_reputation = WalletReputationScorer()
