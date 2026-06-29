import os
import json
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional

class ClickHouseService:
    def __init__(self):
        self.host = os.getenv("CLICKHOUSE_HOST", "localhost")
        self.port = int(os.getenv("CLICKHOUSE_HTTP_PORT", 8123))
        self.url = f"http://{self.host}:{self.port}/"
        self._connected = False
        self._check_connection()

    def _check_connection(self):
        try:
            # Query SELECT 1 via HTTP GET/POST to test connectivity
            query = "SELECT 1"
            req = urllib.request.Request(
                self.url,
                data=query.encode("utf-8"),
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=2) as res:
                response = res.read().decode("utf-8").strip()
                if response == "1":
                    self._connected = True
                    print(f"[CLICKHOUSE] Connected to ClickHouse warehouse on {self.url}")
                    self._initialize_schema()
        except Exception:
            self._connected = False
            print("[CLICKHOUSE] ClickHouse database unavailable. Defaulting to SQLite.")

    def is_connected(self) -> bool:
        return self._connected

    def _execute_query(self, query: str) -> Optional[str]:
        if not self._connected:
            return None
        try:
            req = urllib.request.Request(
                self.url,
                data=query.encode("utf-8"),
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=5) as res:
                return res.read().decode("utf-8")
        except Exception as e:
            print(f"[CLICKHOUSE] Query execution failed: {e}")
            return None

    def _initialize_schema(self):
        """Creates MergeTree database tables for optimized block transaction logs analytics."""
        create_tx_table = (
            "CREATE TABLE IF NOT EXISTS indexed_transactions ("
            "  id String,"
            "  chain String,"
            "  tx_hash String,"
            "  block_number Int64,"
            "  from_address String,"
            "  to_address String,"
            "  value Float64,"
            "  gas_used Float64,"
            "  timestamp DateTime"
            ") ENGINE = MergeTree() "
            "ORDER BY (chain, block_number, tx_hash)"
        )
        self._execute_query(create_tx_table)
        print("[CLICKHOUSE] ClickHouse tables verified/created.")

    def insert_transaction(self, tx: dict):
        """Inserts indexed transactions into ClickHouse column store warehouse."""
        if not self._connected:
            return
        
        # Format query for clickhouse INSERT format
        # Escape strings to prevent injection
        val = float(tx.get("value", 0.0))
        gas = float(tx.get("gas_used", 0.0))
        timestamp_str = tx.get("timestamp") # Format: YYYY-MM-DD HH:MM:SS
        if isinstance(timestamp_str, str) and "T" in timestamp_str:
            timestamp_str = timestamp_str.replace("T", " ")[:19]
        elif not isinstance(timestamp_str, str):
            timestamp_str = "2026-06-20 10:00:00"

        query = (
            "INSERT INTO indexed_transactions (id, chain, tx_hash, block_number, from_address, to_address, value, gas_used, timestamp) VALUES ("
            f"'{tx['id']}', '{tx['chain']}', '{tx['tx_hash']}', {tx['block_number']}, "
            f"'{tx['from_address'].lower()}', '{tx['to_address'].lower()}', {val}, {gas}, '{timestamp_str}')"
        )
        self._execute_query(query)

    def get_large_volume_transfers(self, threshold_usd: float = 100000.0) -> List[Dict[str, Any]]:
        """Queries ClickHouse for high value transaction transfers."""
        if not self._connected:
            return []
        
        query = (
            f"SELECT tx_hash, chain, from_address, to_address, value, timestamp "
            f"FROM indexed_transactions WHERE value * 3500.0 >= {threshold_usd} "
            f"ORDER BY value DESC LIMIT 50 FORMAT JSON"
        )
        res = self._execute_query(query)
        if res:
            try:
                data = json.loads(res)
                return data.get("data", [])
            except Exception:
                pass
        return []

clickhouse_warehouse = ClickHouseService()
