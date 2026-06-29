import time
import uuid
from typing import Dict, Any, List

class STIXEngine:
    def create_indicator(self, name: str, pattern: str, pattern_type: str = "stix") -> Dict[str, Any]:
        """Creates a standard STIX 2.1 Indicator object."""
        now = self._get_timestamp()
        ind_id = f"indicator--{uuid.uuid4()}"
        return {
            "type": "indicator",
            "spec_version": "2.1",
            "id": ind_id,
            "created": now,
            "modified": now,
            "name": name,
            "description": f"Indicator parsed for pattern matching: {name}",
            "indicator_types": ["malicious-activity"],
            "pattern": pattern,
            "pattern_type": pattern_type,
            "pattern_version": "2.1",
            "valid_from": now
        }

    def create_malware(self, name: str, description: str) -> Dict[str, Any]:
        """Creates a standard STIX 2.1 Malware object."""
        now = self._get_timestamp()
        mal_id = f"malware--{uuid.uuid4()}"
        return {
            "type": "malware",
            "spec_version": "2.1",
            "id": mal_id,
            "created": now,
            "modified": now,
            "name": name,
            "description": description,
            "is_family": False,
            "malware_types": ["adware", "spyware"]
        }

    def create_relationship(self, source_ref: str, target_ref: str, relationship_type: str) -> Dict[str, Any]:
        """Creates a standard STIX 2.1 Relationship link between two objects."""
        now = self._get_timestamp()
        rel_id = f"relationship--{uuid.uuid4()}"
        return {
            "type": "relationship",
            "spec_version": "2.1",
            "id": rel_id,
            "created": now,
            "modified": now,
            "relationship_type": relationship_type,
            "source_ref": source_ref,
            "target_ref": target_ref
        }

    def _get_timestamp(self) -> str:
        """Returns standard ISO 8601 UTC timestamp."""
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

stix_engine = STIXEngine()
