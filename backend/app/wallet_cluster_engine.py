import hashlib
from typing import List, Dict, Any
from .entity_resolution import entity_resolution
from .wallet_reputation import wallet_reputation
from .neo4j_service import neo4j_graph

class WalletClusterEngine:
    def cluster_address_network(self, address: str, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Clusters wallets by tracing shared inputs and transaction histories."""
        addr_clean = address.strip().lower()
        associated = set([addr_clean])
        
        # 1. Apply co-spending inputs heuristic
        for tx in transactions:
            if tx.get("from", "").lower() == addr_clean:
                associated.add(tx.get("to", "").lower())
            if len(associated) >= 6:
                break
                
        # 2. Resolve known entity labels
        resolved = entity_resolution.resolve_entity(addr_clean)
        entity_name = resolved["entity_name"] if resolved else "Unknown private EOA"
        
        # 3. Calculate reputation metrics
        rep = wallet_reputation.calculate_reputation(addr_clean, len(transactions), 90.0 if resolved else 0.0)
        
        # Sync into Neo4j graph if connected
        if neo4j_graph.is_connected():
            neo4j_graph.add_wallet_node(addr_clean, entity_name, rep["risk_score"], False)
            for assoc_addr in associated:
                if assoc_addr != addr_clean:
                    neo4j_graph.add_wallet_node(assoc_addr, "Cluster Peer", 15, False)
                    neo4j_graph.add_transaction_edge(addr_clean, assoc_addr, "CO_SPEND", 0.0, "ethereum")

        return {
            "queried_address": address,
            "cluster_id": "CLS-" + hashlib.sha256(addr_clean.encode()).hexdigest()[:8].upper(),
            "resolved_entity": entity_name,
            "associated_wallets": list(associated),
            "reputation": rep
        }

wallet_cluster = WalletClusterEngine()
