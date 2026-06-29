import random
import datetime
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any

router = APIRouter(prefix="/api/soc", tags=["Centralized Enterprise SOC Operations"])

def get_utc_now() -> datetime.datetime:
    return datetime.datetime.utcnow()

def format_iso(dt: datetime.datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

@router.get("/dashboard")
def get_soc_dashboard_summary():
    return {
        "active_incidents": random.randint(3, 8),
        "critical_alerts": random.randint(1, 3),
        "avg_sla_minutes": round(random.uniform(15.0, 30.0), 1),
        "logs_ingested_per_sec": random.randint(120, 280),
        "system_status": "Operational"
    }

@router.get("/incidents")
def get_soc_incidents(
    status: str = Query("unassigned", description="Filter incidents by assignment status."),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    now = get_utc_now()
    return [
        {
            "id": "INC-8812",
            "category": "Evidence Vault Intrusion",
            "severity": "critical",
            "message": "Mass evidence download triggered by user Investigator Verma (IP 192.168.1.45)",
            "timestamp": format_iso(now - datetime.timedelta(minutes=random.randint(2, 5))),
            "status": status,
            "analyst_assigned": "None"
        },
        {
            "id": "INC-8813",
            "category": "Brute Force Attack",
            "severity": "high",
            "message": "Repeated login failures detected from Tor IP 185.220.101.4 on Super Admin portal",
            "timestamp": format_iso(now - datetime.timedelta(minutes=random.randint(10, 15))),
            "status": status,
            "analyst_assigned": "None"
        }
    ]

@router.get("/alerts")
def get_soc_alerts():
    return [
        {"id": "ALT-1", "rule": "Sigma rule: Failed Logins Spike", "source": "Auth", "severity": "high"},
        {"id": "ALT-2", "rule": "Sigma rule: Tornado Cash Deposit", "source": "Blockchain", "severity": "critical"}
    ]

@router.get("/correlation")
def get_soc_correlation(wallet_address: str = Query(..., description="Suspect blockchain wallet address.")):
    now = get_utc_now()
    return {
        "correlation_id": f"CORR-{random.randint(7000, 7999)}-{now.year}",
        "confidence_score": round(random.uniform(88.0, 97.0), 1),
        "kill_chain_phase": "Exfiltration",
        "timeline_events": [
            {"step": 1, "timestamp": format_iso(now - datetime.timedelta(hours=2)), "source": "Auth Gateway", "event": "Successful login from IP 185.220.101.4 (Tor exit node)", "technique": "T1078 (Valid Accounts)"},
            {"step": 2, "timestamp": format_iso(now - datetime.timedelta(hours=1)), "source": "Blockchain Indexer", "event": f"Transfer of 15.4 ETH from address {wallet_address} to Tornado Cash pool", "technique": "T1041 (Exfiltration Over Alternative Protocol)"}
        ]
    }

@router.get("/timeline")
def get_soc_timeline(target_ip: str = Query(None)):
    now = get_utc_now()
    return [
        {"timestamp": format_iso(now - datetime.timedelta(minutes=30)), "event": "API Port Scan", "severity": "info"},
        {"timestamp": format_iso(now - datetime.timedelta(minutes=25)), "event": "Brute Force Initiated", "severity": "high"}
    ]

@router.get("/threats")
def get_soc_threats():
    return {
        "active_feeds": ["OFAC Sanction Database", "Sigma Cyber Threat Intel", "Lazarus Wallet Registry"],
        "sigma_rule_matches": random.randint(2, 6),
        "sanction_hits_today": random.randint(0, 2)
    }

@router.get("/investigations")
def get_soc_investigations():
    return [
        {"case_id": "C-101", "name": "WazirX Hack Exfiltration Track", "risk_index": 98.4, "status": "active"},
        {"case_id": "C-102", "name": "CBI Evidence Verification Audit", "risk_index": 12.0, "status": "closed"}
    ]

@router.get("/metrics")
def get_soc_metrics():
    return {
        "cpu_percent": round(random.uniform(25.0, 60.0), 1),
        "memory_mb_used": random.randint(1400, 1800),
        "postgres_active_connections": random.randint(10, 20),
        "redis_keys_cached": random.randint(900, 1200),
        "clickhouse_uncompressed_bytes": 841249821 + random.randint(1000, 5000)
    }

@router.get("/traces")
def get_soc_traces():
    return [
        {"span_id": f"sp-{random.randint(100000, 999999)}", "trace_id": "tr-7f8a9e10", "endpoint": "GET /api/wallets", "duration_ms": round(random.uniform(5.0, 25.0), 1)},
        {"span_id": f"sp-{random.randint(100000, 999999)}", "trace_id": "tr-7f8a9e10", "endpoint": "GET /api/soc/dashboard", "duration_ms": round(random.uniform(2.0, 12.0), 1)}
    ]

@router.get("/logs")
def get_soc_logs():
    now = get_utc_now()
    return [
        {"timestamp": format_iso(now - datetime.timedelta(seconds=random.randint(5, 10))), "level": "info", "message": "API call completed successfully"},
        {"timestamp": format_iso(now - datetime.timedelta(seconds=random.randint(30, 45))), "level": "warning", "message": "Slow database response detected in ClickHouse"}
    ]
