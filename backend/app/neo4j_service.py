import os
import hashlib
from typing import List, Dict, Any, Optional

try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False

class Neo4jGraphService:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "SecurePass@2026")
        self.driver = None
        self._connected = False
        
        if NEO4J_AVAILABLE:
            try:
                self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
                # Quick connectivity ping check
                with self.driver.session() as session:
                    session.run("RETURN 1")
                self._connected = True
                print(f"[NEO4J] Successfully connected to Graph Database at {self.uri}")
            except Exception as e:
                self._connected = False
                print(f"[NEO4J] Connection failed: {e}. Falling back to NetworkX.")
        else:
            print("[NEO4J] python-neo4j driver not installed. Falling back to NetworkX.")

    def is_connected(self) -> bool:
        return self._connected

    def close(self):
        if self.driver:
            self.driver.close()

    def migrate_from_networkx(self, nx_graph: Any):
        """Copies nodes and edges from an existing NetworkX graph instance into Neo4j."""
        if not self._connected:
            return
        
        with self.driver.session() as session:
            # Clear old graphs to prevent overlapping node IDs
            session.run("MATCH (n) DETACH DELETE n")
            
            # Load Nodes
            for node, attrs in nx_graph.nodes(data=True):
                label = "SmartContract" if attrs.get("is_contract") else "Wallet"
                session.run(
                    f"MERGE (n:{label} {{address: $address}}) "
                    "SET n.risk_score = $risk_score, n.label = $label",
                    address=str(node),
                    risk_score=attrs.get("risk_score", 0),
                    label=attrs.get("label", "Unknown")
                )
                
            # Load Edges
            for u, v, attrs in nx_graph.edges(data=True):
                session.run(
                    "MATCH (u {address: $u}), (v {address: $v}) "
                    "CREATE (u)-[r:TRANSACTION {hash: $hash, value: $value, chain: $chain}]->(v)",
                    u=str(u),
                    v=str(v),
                    hash=attrs.get("hash", ""),
                    value=float(attrs.get("value", 0.0)),
                    chain=attrs.get("chain", "ethereum")
                )
        print("[NEO4J] Completed graph migration from NetworkX.")

    def execute_cypher(self, query: str, parameters: Optional[dict] = None) -> List[Dict[str, Any]]:
        if not self._connected:
            return []
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [dict(record) for record in result]

    def add_wallet_node(self, address: str, label: str, risk_score: int, is_contract: bool):
        if not self._connected:
            return
        node_label = "SmartContract" if is_contract else "Wallet"
        query = (
            f"MERGE (n:{node_label} {{address: $address}}) "
            "SET n.label = $label, n.risk_score = $risk_score"
        )
        self.execute_cypher(query, {"address": address.lower(), "label": label, "risk_score": risk_score})

    def add_transaction_edge(self, from_addr: str, to_addr: str, tx_hash: str, value: float, chain: str):
        if not self._connected:
            return
        query = (
            "MATCH (u {address: $from_addr}), (v {address: $to_addr}) "
            "CREATE (u)-[r:TRANSACTION {hash: $tx_hash, value: $value, chain: $chain}]->(v)"
        )
        self.execute_cypher(query, {
            "from_addr": from_addr.lower(),
            "to_addr": to_addr.lower(),
            "tx_hash": tx_hash,
            "value": value,
            "chain": chain
        })

    def find_shortest_path(self, start_addr: str, end_addr: str) -> List[Dict[str, Any]]:
        """Queries Neo4j for shortest transaction hop path between two suspect addresses."""
        if not self._connected:
            return []
        
        query = (
            "MATCH (start {address: $start}), (end {address: $end}), "
            "p = shortestPath((start)-[*..10]->(end)) "
            "RETURN nodes(p) as path_nodes, relationships(p) as path_relationships"
        )
        res = self.execute_cypher(query, {"start": start_addr.lower(), "end": end_addr.lower()})
        if not res:
            return []
        
        path = []
        record = res[0]
        nodes = record.get("path_nodes", [])
        rels = record.get("path_relationships", [])
        
        for idx, node in enumerate(nodes):
            path.append({
                "type": "node",
                "address": node["address"],
                "label": node.get("label", ""),
                "risk_score": node.get("risk_score", 0)
            })
            if idx < len(rels):
                rel = rels[idx]
                path.append({
                    "type": "edge",
                    "hash": rel["hash"],
                    "value": rel["value"],
                    "chain": rel["chain"]
                })
        return path

    def get_community_detection(self) -> List[Dict[str, Any]]:
        """Identifies suspect clusters using Cypher community grouping heuristics."""
        if not self._connected:
            return []
        # Simple clustering based on shared transactions
        query = (
            "MATCH (n)-[:TRANSACTION]->(m) "
            "RETURN n.address as wallet, count(m) as degree, collect(m.address)[..3] as peers "
            "ORDER BY degree DESC LIMIT 20"
        )
        return self.execute_cypher(query)

neo4j_graph = Neo4jGraphService()
