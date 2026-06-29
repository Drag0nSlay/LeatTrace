from typing import Dict, Any, List

# Local repository database for quick IOC matching
IOC_DATABASE = [
    {"ioc_id": "ioc_001", "type": "wallet", "value": "1AGNa15ZQXAZUgFiqJ2i7Z2DPU2J6hW62i", "confidence": "high", "reputation": "malicious"},
    {"ioc_id": "ioc_002", "type": "domain", "value": "blocktrace-forensics-bypass.com", "confidence": "medium", "reputation": "suspicious"},
    {"ioc_id": "ioc_003", "type": "ip", "value": "198.51.100.42", "confidence": "high", "reputation": "malicious"}
]

class IOCEngine:
    def check_ioc(self, value: str) -> Dict[str, Any]:
        """Queries the IOC repository database to check if a value is flagged."""
        val_clean = value.strip().lower()
        for ioc in IOC_DATABASE:
            if ioc["value"].lower() == val_clean:
                return {
                    "flagged": True,
                    "type": ioc["type"],
                    "confidence": ioc["confidence"],
                    "reputation": ioc["reputation"]
                }
        return {"flagged": False, "type": None, "confidence": None, "reputation": "clean"}

    def add_ioc(self, ioc_type: str, value: str, confidence: str = "medium") -> Dict[str, Any]:
        """Dynamically registers a new IOC into the repository database."""
        ioc_id = f"ioc_{len(IOC_DATABASE) + 1:03d}"
        new_ioc = {
            "ioc_id": ioc_id,
            "type": ioc_type,
            "value": value,
            "confidence": confidence,
            "reputation": "malicious"
        }
        IOC_DATABASE.append(new_ioc)
        return new_ioc

ioc_engine = IOCEngine()
