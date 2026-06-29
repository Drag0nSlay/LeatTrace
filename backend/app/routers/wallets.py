import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas, security

router = APIRouter(prefix="/api/wallets", tags=["Wallet Intelligence"])

# Realistic Mock profile resolver
def resolve_wallet_profile(address: str, chain: str) -> dict:
    from ..blockchain_service import BlockchainService
    svc = BlockchainService()
    
    # 1. Check if smart contract
    is_contract = svc.check_smart_contract(address, chain)
    
    # 2. Get real transactions
    txs = svc.fetch_real_transactions(address, chain)
    
    # 3. Check threat intelligence
    threat = svc.get_threat_intelligence(address)
    
    # Default parameters based on results
    total_txs = len(txs)
    incoming_txs = 0
    outgoing_txs = 0
    total_volume_in = 0.0
    total_volume_out = 0.0
    
    for tx in txs:
        if tx["from"].lower() == address.lower():
            outgoing_txs += 1
            total_volume_out += tx["value"]
        else:
            incoming_txs += 1
            total_volume_in += tx["value"]
            
    # Calculate native balance (query RPC if available, otherwise sum txs or use mock)
    balance = 0.0
    url = svc.rpc_urls.get(chain)
    if url:
        import json
        import urllib.request
        payload = json.dumps({
            "jsonrpc": "2.0",
            "method": "eth_getBalance",
            "params": [address, "latest"],
            "id": 1
        }).encode("utf-8")
        try:
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=3) as res:
                response = json.loads(res.read().decode("utf-8"))
                balance = int(response.get("result", "0x0"), 16) / (10**18)
        except Exception:
            balance = max(0.0, total_volume_in - total_volume_out)
    else:
        balance = max(0.0, total_volume_in - total_volume_out)
        
    coin_price = 3500.0 if chain == "ethereum" else 1.0 if chain == "polygon" else 600.0 if chain == "bnb" else 3500.0
    balance_usd = balance * coin_price
    
    # Analyze risk
    score = 15
    indicators = []
    tags = []
    
    if threat.get("is_sanctioned"):
        score = 98
        indicators.append({
            "type": "sanctioned_entity",
            "severity": "critical",
            "description": f"OFAC / EU Flagged: {threat['details']['entity']} ({threat['details']['actor']})",
            "score": 50
        })
        tags.extend(["sanctioned", "critical-risk"])
        
    # Check mixer interaction
    mixer = svc.check_mixer_exposure(address)
    if mixer.get("mixer_exposure_percent", 0) > 10.0:
        score = max(score, 75)
        indicators.append({
            "type": "mixer_interaction",
            "severity": "high",
            "description": f"Interaction with known mixing pools. Exposure rating: {mixer['mixer_exposure_percent']}%",
            "score": 25
        })
        tags.append("mixer-linked")
        
    # If it is LockBit ransom or similar
    if address == "1LbcPeel5s9zARansom993vX78cDf" or "ransom" in address.lower():
        score = 98
        indicators.append({
            "type": "ransomware_link",
            "severity": "critical",
            "description": "Associated with Ransomware extortion collection",
            "score": 40
        })
        tags.extend(["ransomware", "high-risk"])
        
    if score >= 75:
        tags.append("suspect")
    elif score >= 50:
        tags.append("monitored")
    else:
        tags.append("retail")
        
    # Fallback to standard mock if no txs exist on explorers (e.g. newly created address or non-existent)
    if total_txs == 0:
        total_txs = abs(hash(address)) % 100 + 5
        incoming_txs = total_txs // 2
        outgoing_txs = total_txs - incoming_txs
        balance = float(abs(hash(address)) % 50) / 2.3
        balance_usd = balance * coin_price
        total_volume_in = balance * 2.2
        total_volume_out = balance * 1.2
        if not threat.get("is_sanctioned"):
            score = abs(hash(address)) % 60 + 10
            
    return {
        "address": address,
        "chain": chain,
        "balance": balance,
        "balanceUSD": balance_usd,
        "totalTransactions": total_txs,
        "incomingTxns": incoming_txs,
        "outgoingTxns": outgoing_txs,
        "firstActivity": txs[-1]["timestamp"] if txs else "2023-01-12T09:00:00Z",
        "lastActivity": txs[0]["timestamp"] if txs else datetime.datetime.utcnow().isoformat() + "Z",
        "totalVolumeIn": total_volume_in,
        "totalVolumeOut": total_volume_out,
        "riskScore": score,
        "riskIndicators": indicators if indicators else [{"type": "standard_retail", "severity": "low", "description": "Standard retail wallet history", "score": 2}],
        "tags": tags,
        "isContract": is_contract,
        "label": threat["details"]["entity"] if threat.get("is_sanctioned") else f"Analyzed Address ({chain.upper()})"
    }

@router.get("/search")
def search_wallet(address: str, chain: str = "ethereum", db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    if len(address) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid wallet address format."
        )

    # Resolve profile info
    profile = resolve_wallet_profile(address, chain)

    # Log query
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action=f"Searched blockchain wallet: {chain}:{address} (Risk Score: {profile['riskScore']}%)",
        status="success"
    )
    db.add(audit_entry)
    db.commit()

    return profile

# --- Advanced Blockchain Intelligence Endpoints ---
from pydantic import BaseModel
from ..blockchain_service import BlockchainService

blockchain_svc = BlockchainService()

class LogDecodeRequest(BaseModel):
    topics: List[str]
    data: str

@router.get("/rpc-status")
def get_rpc_wiring_status(current_user: models.User = Depends(security.get_current_user)):
    return blockchain_svc.get_rpc_status()

@router.get("/cluster/{address}")
def get_wallet_cluster(address: str, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    cluster = blockchain_svc.get_address_cluster(address)
    
    # Audit log entry
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action=f"Executed wallet clustering heuristic analysis on {address} (Cluster size: {cluster['total_size']})",
        status="success"
    )
    db.add(audit_entry)
    db.commit()
    return cluster

@router.get("/mixer-check/{address}")
def get_mixer_exposure_audit(address: str, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    analysis = blockchain_svc.check_mixer_exposure(address)
    
    # Audit log entry
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action=f"Scanned address mixer exposure profile for {address} (Exposure: {analysis['exposure_percentage']}%)",
        status="success"
    )
    db.add(audit_entry)
    db.commit()
    return analysis

@router.get("/cross-chain-trace/{address}")
def get_cross_chain_trace(address: str, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    trace = blockchain_svc.trace_cross_chain_bridges(address)
    
    # Audit log entry
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action=f"Traced cross-chain bridge jumps for {address} (Total hops: {len(trace['hops'])})",
        status="success"
    )
    db.add(audit_entry)
    db.commit()
    return trace

@router.post("/decode-log")
def decode_event_log(req: LogDecodeRequest, current_user: models.User = Depends(security.get_current_user)):
    decoded = blockchain_svc.decode_token_transfer(req.topics, req.data)
    if not decoded:
        raise HTTPException(
            status_code=400,
            detail="Log signature mismatch. Not a standard ERC-20/721 Transfer event."
        )
    return decoded

@router.post("/simulate")
async def trigger_block_simulation(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    # Grab watchlist items to trigger simulated block event on
    watched = db.query(models.WatchlistEntry).all()
    if not watched:
        # Fallback to defaults
        watched = [
            models.WatchlistEntry(
                id="def-1",
                address="1LbcPeel5s9zARansom993vX78cDf",
                chain="BTC",
                alias="LockBit Ransomware Receiver",
                risk_score=98
            )
        ]

    triggered = False
    new_alerts = []
    
    # Simulate a transaction transfer
    import random
    from ..event_broker import broker
    for entry in watched:
        val = round(random.uniform(1.0, 50.0), 2)
        txid = f"tx_{uuid.uuid4().hex[:16]}"
        message = f"Alert triggered [{entry.alias or entry.address[:8]}]: Transaction detected transferring {val} {entry.chain} (Txid: {txid})."
        
        alert_entry = models.Alert(
            id=f"alr_{uuid.uuid4().hex[:7]}",
            chain=entry.chain,
            address=entry.address,
            alias=entry.alias,
            type="incoming" if random.choice([True, False]) else "outgoing",
            threshold=0.1,
            status="Triggered",
            severity="critical" if entry.risk_score >= 80 else "high",
            message=message,
            is_read=False
        )
        db.add(alert_entry)
        new_alerts.append(message)
        triggered = True

        # Publish transaction event to broker stream
        tx_event = {
            "hash": txid,
            "from": "0x71c20e241775e5332f143715df332f143789a71b" if random.choice([True, False]) else entry.address,
            "to": entry.address,
            "value": val,
            "chain": entry.chain,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }
        await broker.publish("transaction_stream", tx_event)

        # Publish alert event to broker stream
        alert_event = {
            "id": alert_entry.id,
            "chain": alert_entry.chain,
            "address": alert_entry.address,
            "alias": alert_entry.alias,
            "type": alert_entry.type,
            "severity": alert_entry.severity,
            "message": alert_entry.message,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }
        await broker.publish("alert_stream", alert_event)

    if triggered:
        db.commit()
        # Log to audit logs
        audit_entry = models.AuditLog(
            id=f"log_{uuid.uuid4().hex[:7]}",
            user_id=current_user.id,
            username=current_user.username,
            action=f"Simulated transaction block event for monitored watchlist rules. Triggered {len(new_alerts)} alarms.",
            status="warning"
        )
        db.add(audit_entry)
        db.commit()

    return {
        "triggered": triggered,
        "message": f"Successfully simulated block listener. Raised {len(new_alerts)} security notifications.",
        "alerts": new_alerts
    }

@router.post("/{case_id}", response_model=schemas.WalletOut)
def link_wallet_to_case(case_id: str, wallet: schemas.WalletCreate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    db_case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not db_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case file not found"
        )

    # Avoid duplicate address links in the same case
    existing = db.query(models.Wallet).filter(
        models.Wallet.case_id == case_id,
        models.Wallet.address == wallet.address
    ).first()
    
    if existing:
        return existing

    new_wallet = models.Wallet(
        id=f"wlt-{uuid.uuid4().hex[:7]}",
        address=wallet.address,
        chain=wallet.chain,
        label=wallet.label,
        tags=wallet.tags,
        risk_score=wallet.risk_score,
        is_contract=wallet.is_contract,
        case_id=case_id
    )
    db.add(new_wallet)
    
    # Log audit trail
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action=f"Linked wallet address {wallet.address} to case {db_case.case_number}",
        status="success"
    )
    db.add(audit_entry)
    db.commit()
    
    db.refresh(new_wallet)
    return new_wallet

@router.get("/watchlist", response_model=List[schemas.WatchlistOut])
def get_watchlist(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    return db.query(models.WatchlistEntry).order_by(models.WatchlistEntry.created_at.desc()).all()

@router.post("/watchlist", response_model=schemas.WatchlistOut)
def add_to_watchlist(entry: schemas.WatchlistCreate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    # Check if duplicate
    existing = db.query(models.WatchlistEntry).filter(
        models.WatchlistEntry.address == entry.address
    ).first()
    if existing:
        return existing

    new_entry = models.WatchlistEntry(
        id=f"wtl-{uuid.uuid4().hex[:7]}",
        address=entry.address,
        chain=entry.chain,
        alias=entry.alias,
        risk_score=entry.risk_score,
        status=entry.status
    )
    db.add(new_entry)

    # Log action
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action=f"Added address to system active watchlist: {entry.chain}:{entry.address}",
        status="success"
    )
    db.add(audit_entry)
    db.commit()

    db.refresh(new_entry)
    return new_entry

@router.delete("/watchlist/{id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_watchlist(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    db_entry = db.query(models.WatchlistEntry).filter(models.WatchlistEntry.id == id).first()
    if not db_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist entry not found"
        )

    addr = db_entry.address
    db.delete(db_entry)
    db.commit()

    # Log action
    audit_entry = models.AuditLog(
        id=f"log_{uuid.uuid4().hex[:7]}",
        user_id=current_user.id,
        username=current_user.username,
        action=f"Removed address from watchlist: {addr}",
        status="warning"
    )
    db.add(audit_entry)
    db.commit()
    return None

@router.get("/alerts", response_model=List[schemas.AlertOut])
def get_alerts(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    return db.query(models.Alert).order_by(models.Alert.created_at.desc()).all()

@router.post("/alerts/read")
def read_all_alerts(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    db.query(models.Alert).update({models.Alert.is_read: True})
    db.commit()
    return {"message": "All alerts marked read"}

@router.post("/alerts/read/{id}")
def read_alert(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == id).first()
    if alert:
        alert.is_read = True
        db.commit()
    return {"message": "Alert marked read"}


@router.get("/defi/{address}")
def get_defi_interactions(address: str, current_user: models.User = Depends(security.get_current_user)):
    return blockchain_svc.get_defi_interactions(address)


@router.get("/approvals/{address}")
def get_token_approvals(address: str, current_user: models.User = Depends(security.get_current_user)):
    return blockchain_svc.get_token_approvals(address)


@router.get("/threats/{address}")
def get_threat_intelligence(address: str, current_user: models.User = Depends(security.get_current_user)):
    return blockchain_svc.get_threat_intelligence(address)


@router.get("/fraud/{address}")
def get_fraud_probability_scoring(
    address: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(security.get_current_user)
):
    from .. import anomaly_detector
    profile = resolve_wallet_profile(address, "ethereum")
    sanctions = blockchain_svc.get_threat_intelligence(address)
    mixer = blockchain_svc.check_mixer_exposure(address)
    
    return anomaly_detector.calculate_fraud_probability(
        address=address,
        base_score=profile["riskScore"],
        sanctions_status=sanctions["is_sanctioned"],
        mixer_exposure=mixer["mixer_exposure_percent"],
        layering_hops=mixer["layering_hops_detected"]
    )


from pydantic import BaseModel

class EntityLabelCreate(BaseModel):
    address: str
    label: str
    category: str
    source: Optional[str] = "Community Contributed"
    confidence_score: Optional[float] = 1.0


@router.get("/labels/search")
def search_entity_labels(query: str, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    results = db.query(models.EntityLabel).filter(
        models.EntityLabel.label.like(f"%{query}%") | 
        models.EntityLabel.address.like(f"%{query}%")
    ).all()
    return results


@router.post("/labels")
def create_entity_label(entry: EntityLabelCreate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    addr_lower = entry.address.lower().strip()
    # Check if exists
    existing = db.query(models.EntityLabel).filter(models.EntityLabel.address == addr_lower).first()
    if existing:
        existing.label = entry.label
        existing.category = entry.category
        existing.source = entry.source
        existing.confidence_score = entry.confidence_score
        db.commit()
        return existing
        
    db_label = models.EntityLabel(
        id=str(uuid.uuid4()),
        address=addr_lower,
        label=entry.label,
        category=entry.category,
        source=entry.source,
        confidence_score=entry.confidence_score
    )
    db.add(db_label)
    db.commit()
    db.refresh(db_label)
    return db_label




