import os
import datetime
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .db.session import engine, Base, SessionLocal
from .db import models
from .core import security
from .api.v1 import (
    auth, cases, wallets, graph, evidence, audit, ai,
    ecosystem, streaming, incidents, siem,
    cluster, soc, forensics, security as security_api,
    iam, cti, siem_correlation, elasticsearch,
    ai_intelligence, blockchain_risk, devices,
    investigations, reports, taxii, sanctions, health,
    threat_intel,
)

logger = logging.getLogger("leatrace.main")

BACKGROUND_TASKS_ENABLED = os.getenv("LEATrace_BACKGROUND_TASKS", "true").lower() in {"1", "true", "yes", "on"}


def ensure_default_dev_user(db):
    """Creates the local demo officer if it does not exist and keeps the password aligned with the frontend login flow."""
    from .core import security

    user = db.query(models.User).filter(models.User.email == "lakshaysoni@cybercrime.gov.in").first()
    if user is None:
        user = models.User(
            id="usr_default_dev_officer",
            email="lakshaysoni@cybercrime.gov.in",
            username="lakshaysoni",
            hashed_password=security.get_password_hash("SecurePass@2026"),
            role="admin",
            is_active=True,
            mfa_enabled=False,
            department="Cyber Crime Cell",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    if user.username != "lakshaysoni":
        user.username = "lakshaysoni"
    if user.role != "admin":
        user.role = "admin"
    if user.department is None:
        user.department = "Cyber Crime Cell"
    if not user.hashed_password or not security.verify_password("SecurePass@2026", user.hashed_password):
        user.hashed_password = security.get_password_hash("SecurePass@2026")
    db.commit()
    return user


def normalize_staff_emails(db):
    """Keep seeded administration identities aligned with their approved addresses."""
    email_by_legacy_name = {
        "sinha": ("supervisor.sinha@cybercrime.gov.in", "amankothari@cybercrime.gov.in"),
        "verma": ("inspector.verma@cybercrime.gov.in", "adityakumar@cybercrime.gov.in"),
        "gupta": ("auditor.gupta@cybercrime.gov.in", "anshultak@cybercrime.gov.in"),
    }
    for legacy_name, (legacy_email, email) in email_by_legacy_name.items():
        users = db.query(models.User).filter(
            (models.User.username.ilike(f"%{legacy_name}%")) |
            (models.User.email == legacy_email)
        ).all()
        for user in users:
            user.email = email
    db.commit()


def ensure_admin_staff_users(db):
    """Provision the four local administrator identities used by the development portal."""
    from .core import security

    staff = [
        {
            "id": "usr_admin_lakshay_soni",
            "email": "lakshaysoni@cybercrime.gov.in",
            "username": "lakshaysoni",
            "password": os.getenv("LEATRACE_ADMIN_LAKSHAY_PASSWORD", "SecurePass@2026"),
            "department": "Cyber Crime Cell",
        },
        {
            "id": "usr_admin_aditya_kumar",
            "email": "adityakumar@cybercrime.gov.in",
            "username": "adityakumar",
            "password": os.getenv("LEATRACE_ADMIN_ADITYA_PASSWORD", "AdityaKumar@2026"),
            "department": "Cyber Crime Cell",
        },
        {
            "id": "usr_admin_aman_kothari",
            "email": "amankothari@cybercrime.gov.in",
            "username": "amankothari",
            "password": os.getenv("LEATRACE_ADMIN_AMAN_PASSWORD", "AmanKothari@2026"),
            "department": "Cyber Crime Cell",
        },
        {
            "id": "usr_admin_anshul_tak",
            "email": "anshultak@cybercrime.gov.in",
            "username": "anshultak",
            "password": os.getenv("LEATRACE_ADMIN_ANSHUL_PASSWORD", "AnshulTak@2026"),
            "department": "Cyber Crime Cell",
        },
    ]

    for item in staff:
        user = db.query(models.User).filter(models.User.email == item["email"]).first()
        if user is None:
            user = models.User(id=item["id"], email=item["email"])
            db.add(user)
        user.username = item["username"]
        user.hashed_password = security.get_password_hash(item["password"])
        user.role = "admin"
        user.is_active = True
        user.department = item["department"]
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown logic."""
    import asyncio
    from .infra.connection_pool import connection_pool
    from .services.chains.registry import chain_registry
    from .core.oauth_server import oauth_server

    # Import stix_models so all STIX/IOC/TI tables are registered with Base
    from .services.intel import stix_models  # noqa: F401
    # Import sanctions_models so all sanctions tables are registered with Base
    from .services.sanctions import sanctions_models  # noqa: F401

    # Create DB tables (checkfirst=True prevents duplicate-table errors on reimport)
    Base.metadata.create_all(bind=engine, checkfirst=True)

    # Initialize chain registry
    chain_registry._ensure_initialized()
    logger.info(f"Chain registry ready: {len(chain_registry.get_supported_chain_ids())} chains")

    # Bootstrap default OAuth client from env vars
    db = SessionLocal()
    try:
        ensure_default_dev_user(db)
        normalize_staff_emails(db)
        ensure_admin_staff_users(db)
        oauth_server.bootstrap_default_client(db=db)
        oauth_server.cleanup_expired_codes(db=db)
        logger.info("OAuth bootstrap complete")
    except Exception as e:
        logger.warning("OAuth bootstrap failed (non-fatal): %s", e)
    finally:
        db.close()

    # ── Register Threat Intelligence Providers ──
    _register_ti_providers()
    logger.info("Threat Intelligence providers registered")


    background_tasks = []
    if BACKGROUND_TASKS_ENABLED:
        logger.info("Background tasks enabled. Starting blockchain listener...")
        background_tasks.append(asyncio.create_task(real_blockchain_listener()))
        from .services.blockchain.indexer import run_multi_chain_indexer
        background_tasks.append(asyncio.create_task(run_multi_chain_indexer()))

        # Start sanctions background scheduler
        from .services.sanctions.scheduler import sanctions_scheduler
        await sanctions_scheduler.start()
        logger.info("Sanctions background scheduler started")

    yield  # Application runs here

    # Shutdown: stop sanctions scheduler
    if BACKGROUND_TASKS_ENABLED:
        from .services.sanctions.scheduler import sanctions_scheduler
        await sanctions_scheduler.stop()
        for task in background_tasks:
            task.cancel()
        await asyncio.gather(*background_tasks, return_exceptions=True)

    # Shutdown: close connection pools
    logger.info("Application shutting down. Closing connections...")
    connection_pool.close()
    await connection_pool.aclose()


app = FastAPI(
    title="LEATrace API",
    description="Law Enforcement Advanced Trace Intelligence Platform REST Backend",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://leattrace.vercel.app"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security middleware (audit logging, security headers)
from .core.rbac import SecurityMiddleware
app.add_middleware(SecurityMiddleware)

# Rate limiting middleware (sliding window, per-IP)
from .middleware.rate_limit import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware)

# Request timing middleware
from starlette.middleware.base import BaseHTTPMiddleware
import time as _time

class _TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = _time.perf_counter()
        response = await call_next(request)
        duration_ms = round((_time.perf_counter() - start) * 1000, 2)
        response.headers["X-Response-Time"] = f"{duration_ms}ms"
        # Record Prometheus metric (no-op if prometheus_client not installed)
        try:
            from .infra.observability import record_request
            record_request(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code,
                duration_s=duration_ms / 1000,
            )
        except Exception:
            pass
        return response

app.add_middleware(_TimingMiddleware)

# Register routers
app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(wallets.router)
app.include_router(graph.router)
app.include_router(evidence.router)
app.include_router(audit.router)
app.include_router(ai.router)
app.include_router(ecosystem.router)
app.include_router(streaming.router)
app.include_router(incidents.router)
app.include_router(siem.router)
app.include_router(cluster.router)
app.include_router(soc.router)
app.include_router(forensics.router)
app.include_router(security_api.router)
app.include_router(iam.router)
app.include_router(cti.router)
app.include_router(siem_correlation.router)
app.include_router(elasticsearch.router)
app.include_router(ai_intelligence.router)
app.include_router(blockchain_risk.router)
app.include_router(devices.router)
app.include_router(investigations.router)
app.include_router(reports.router)
app.include_router(taxii.router)
app.include_router(sanctions.router)
app.include_router(health.router)
app.include_router(threat_intel.router)


# ─── Threat Intelligence Provider Registration ───────────────────────────────

def _register_ti_providers():
    """Registers all TI providers with the provider manager."""
    from .services.threat_intel.provider_manager import provider_manager
    from .services.threat_intel.providers.taxii import TAXIIProvider
    from .services.threat_intel.providers.sanctions import SanctionsProvider
    from .services.threat_intel.providers.mitre_attack import MITREAttackProvider

    provider_manager.register_provider(TAXIIProvider(
        name="taxii_default",
        priority=40,
    ))
    provider_manager.register_provider(SanctionsProvider(
        name="sanctions_default",
        priority=30,
    ))
    provider_manager.register_provider(MITREAttackProvider(
        name="mitre_attack",
        priority=20,
    ))
    logger.info(
        "TI providers registered: %s",
        [p.name for p in provider_manager.registry.get_all()],
    )


# Real blockchain node transaction listener background task
async def real_blockchain_listener():
    import asyncio
    import json
    import urllib.request
    import datetime
    from .core.event_broker import broker

    last_block = None
    rpc_url = "https://cloudflare-eth.com"
    
    while True:
        try:
            payload = json.dumps({"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}).encode("utf-8")
            req = urllib.request.Request(rpc_url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "LEATrace/1.0"})
            with urllib.request.urlopen(req, timeout=3) as res:
                response = json.loads(res.read().decode("utf-8"))
                block_hex = response.get("result")
                if not block_hex:
                    await asyncio.sleep(8)
                    continue
                block_num = int(block_hex, 16)
                
            if last_block is None:
                last_block = block_num - 1
                
            if block_num > last_block:
                for b in range(last_block + 1, block_num + 1):
                    b_hex = hex(b)
                    payload_b = json.dumps({"jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": [b_hex, True], "id": 1}).encode("utf-8")
                    req_b = urllib.request.Request(rpc_url, data=payload_b, headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req_b, timeout=5) as res_b:
                        res_data = json.loads(res_b.read().decode("utf-8"))
                        block_data = res_data.get("result")
                        if block_data and "transactions" in block_data:
                            for tx in block_data["transactions"]:
                                value_eth = int(tx.get("value", "0x0"), 16) / (10**18)
                                tx_hash = tx.get("hash")
                                tx_from = tx.get("from")
                                tx_to = tx.get("to")
                                
                                if tx_hash and tx_from and tx_to:
                                    tx_event = {
                                        "hash": tx_hash,
                                        "from": tx_from,
                                        "to": tx_to,
                                        "value": value_eth,
                                        "chain": "ETH",
                                        "timestamp": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat() + "Z"
                                    }
                                    await broker.publish("transaction_stream", tx_event)
                                    
                                    if value_eth >= 50.0:
                                        alert_event = {
                                            "id": f"alr_{tx_hash[:6]}",
                                            "chain": "ETH",
                                            "address": tx_to,
                                            "alias": "Whale Transfer",
                                            "type": "Whale Transaction",
                                            "severity": "high",
                                            "message": f"🚨 Whale Alert: Real-time transfer of {value_eth:.2f} ETH detected from {tx_from[:8]}... to {tx_to[:8]}... (Tx: {tx_hash[:10]}...)",
                                            "timestamp": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat() + "Z"
                                        }
                                        await broker.publish("alert_stream", alert_event)
                last_block = block_num
        except Exception as e:
            print(f"Error in blockchain background listener: {e}")

        await asyncio.sleep(6)


@app.get("/api/health")
def health_check():
    from .services.chains.registry import chain_registry
    from .db.session import _is_sqlite

    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat() + "Z",
        "database": "sqlite" if _is_sqlite else "postgresql",
        "supported_chains": len(chain_registry.get_supported_chain_ids()),
        "background_tasks_enabled": BACKGROUND_TASKS_ENABLED,
    }


@app.get("/")
def root_index():
    from fastapi.responses import HTMLResponse
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LEATrace Platform</title>
      <style>
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #090d16;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 16px;
          padding: 40px;
          max-width: 520px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }
        h1 { margin: 0 0 10px 0; font-size: 26px; color: #f8fafc; }
        p { color: #94a3b8; font-size: 15px; margin-bottom: 28px; }
        .btn-group { display: flex; flex-direction: column; gap: 12px; }
        .btn {
          display: block;
          padding: 14px 20px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s ease;
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        .btn-primary:hover {
          background: #2563eb;
        }
        .btn-secondary {
          background: #1e293b;
          color: #cbd5e1;
          border: 1px solid #334155;
        }
        .btn-secondary:hover {
          background: #334155;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge"><span class="dot"></span> LEATrace System Online</div>
        <h1>LEATrace Intelligence Platform</h1>
        <p>Law Enforcement Blockchain Forensic & Cyber Intelligence System is running successfully.</p>
        <div class="btn-group">
          <a class="btn btn-primary" href="http://localhost:5173" target="_blank">Open Web Dashboard (Port 5173) &rarr;</a>
          <a class="btn btn-secondary" href="/docs">Open Swagger API Docs (/docs)</a>
          <a class="btn btn-secondary" href="/api/health">View Health Check (/api/health)</a>
        </div>
      </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)
