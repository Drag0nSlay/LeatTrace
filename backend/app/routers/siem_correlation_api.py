from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Dict, Any, Optional
from ..correlation_engine import siem_correlation
from ..attack_chain_engine import attack_chain

router = APIRouter(prefix="/api/correlation", tags=["SIEM Correlation & Attack Reconstruction"])

# Mock correlation events pool
MOCK_EVENTS_POOL = [
    {"event_type": "auth_fail", "timestamp": 1782720000, "description": "Failed investigator login from untrusted IP"},
    {"event_type": "auth_fail", "timestamp": 1782720010, "description": "Failed investigator login from untrusted IP"},
    {"event_type": "auth_fail", "timestamp": 1782720020, "description": "Failed investigator login from untrusted IP"},
    {"event_type": "evidence_download", "timestamp": 1782720050, "description": "Investigator downloaded 1.2 GB of evidence case logs"},
    {"event_type": "large_transfer", "timestamp": 1782720100, "description": "Transferred 450 ETH to Tornado Cash mixer"}
]

@router.post("/run")
def run_correlation_stream(events: Optional[List[Dict[str, Any]]] = Body(None)):
    stream = events if events else MOCK_EVENTS_POOL
    alerts = siem_correlation.correlate_event_stream(stream)
    return {"status": "completed", "alerts_triggered": len(alerts), "alerts": alerts}

@router.get("/alerts")
def get_soc_alerts():
    return siem_correlation.get_alerts_history()

@router.get("/attack-chain")
def get_reconstructed_chain(correlation_id: str = Query(...)):
    # Reconstruct timeline from mock pool
    return attack_chain.reconstruct_incident_chain(correlation_id, MOCK_EVENTS_POOL)

@router.get("/risk/history")
def get_risk_scoring_history():
    import datetime
    import random
    today = datetime.date.today()
    return {
        "risk_trends": [
            {"date": (today - datetime.timedelta(days=3)).isoformat(), "user_risk": random.randint(15, 30), "infrastructure_risk": random.randint(10, 25)},
            {"date": (today - datetime.timedelta(days=2)).isoformat(), "user_risk": random.randint(35, 50), "infrastructure_risk": random.randint(20, 35)},
            {"date": (today - datetime.timedelta(days=1)).isoformat(), "user_risk": random.randint(25, 40), "infrastructure_risk": random.randint(15, 30)},
            {"date": today.isoformat(), "user_risk": random.randint(70, 95), "infrastructure_risk": random.randint(50, 75)}
        ]
    }
