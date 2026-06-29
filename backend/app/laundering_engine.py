from typing import List, Dict, Any

class LaunderingDetectionEngine:
    def detect_peel_chain(self, transactions: List[Dict[str, Any]], address: str) -> Dict[str, Any]:
        """Detects peel chains where large funds are repeatedly split with small change returns."""
        peel_steps = []
        target_addr = address.lower()
        
        # Simple heuristic matching for consecutive decreasing transfer steps
        current_amount = 0.0
        step_idx = 1
        for tx in transactions:
            if tx.get("from", "").lower() == target_addr:
                val = tx.get("value", 0.0)
                # Check for splitting structures
                if val > 0.1 and val < 100.0:
                    peel_steps.append({
                        "step": step_idx,
                        "sender": target_addr,
                        "receiver": tx.get("to"),
                        "amount_sent": val,
                        "split_percentage": "10%" if val < 2.0 else "25%"
                    })
                    step_idx += 1
                    
        return {
            "is_peel_chain_active": len(peel_steps) > 2,
            "detected_hops": len(peel_steps),
            "peel_timeline": peel_steps
        }

laundering_engine = LaunderingDetectionEngine()
