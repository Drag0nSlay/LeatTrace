from typing import List, Dict, Any, Optional
from .bridge_detector import bridge_detector
from .asset_flow_engine import asset_flow_engine
from .cross_chain_graph import cross_chain_graph

class CrossChainService:
    def trace_cross_chain_movements(self, transactions: List[Dict[str, Any]], address: str) -> Dict[str, Any]:
        hops = []
        step = 1
        
        for tx in transactions:
            target = tx.get("to", "").lower()
            bridge = bridge_detector.identify_bridge(target)
            if bridge:
                hops.append({
                    "step": step,
                    "source_chain": "ethereum",
                    "destination_chain": bridge["target_chain"],
                    "bridge_contract": bridge["name"],
                    "tx_hash": tx.get("hash"),
                    "amount_sent": tx.get("value", 0.0),
                    "token": "ETH",
                    "timestamp": tx.get("timestamp")
                })
                step += 1
                
        # Generate flows splits
        flows = asset_flow_engine.reconstruct_splits(transactions, address)
        graph = cross_chain_graph.build_flow_graph(hops)
        
        return {
            "address": address,
            "chain_hopping_score": 95 if len(hops) > 0 else 15,
            "total_hops": len(hops),
            "hops_timeline": hops,
            "asset_flow_splits": flows,
            "flow_graph": graph
        }

cross_chain_service = CrossChainService()
