import pytest
from typing import Dict, Any, List

@pytest.fixture
def mock_investigator_claims() -> Dict[str, Any]:
    """Fixture providing standard investigator token claims."""
    return {
        "sub": "user_101",
        "email": "lakshaysoni@cybercrime.gov.in",
        "role": "investigator",
        "department": "Cybercrime Unit"
    }

@pytest.fixture
def synthetic_wallet_records() -> List[Dict[str, Any]]:
    """Fixture providing a list of mock cryptocurrency wallets for forensic scanning checks."""
    return [
        {"address": "1AGNa15ZQXAZUgFiqJ2i7Z2DPU2J6hW62i", "blockchain": "Bitcoin", "reputation": "malicious"},
        {"address": "0x71c20e241775e5332f143715df332f143789a71b", "blockchain": "Ethereum", "reputation": "clean"},
        {"address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "blockchain": "Bitcoin", "reputation": "clean"}
    ]

@pytest.fixture
def mock_siem_events() -> List[Dict[str, Any]]:
    """Fixture providing raw SIEM log events for correlation rules."""
    return [
        {"event_type": "auth_fail", "timestamp": 1000, "ip": "192.168.1.15"},
        {"event_type": "auth_fail", "timestamp": 1010, "ip": "192.168.1.15"},
        {"event_type": "auth_fail", "timestamp": 1020, "ip": "192.168.1.15"},
        {"event_type": "evidence_download", "timestamp": 1050, "ip": "192.168.1.15"}
    ]
