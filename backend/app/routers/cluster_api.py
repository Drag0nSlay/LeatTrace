from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional

from ..wallet_cluster_engine import wallet_cluster
from ..wallet_reputation import wallet_reputation
from ..cross_chain_service import cross_chain_service
from ..bridge_detector import bridge_detector
from ..defi_decoder import defi_decoder
from ..mixer_detector import mixer_detector
from ..threat_feed_manager import threat_feed_manager
from ..risk_engine import risk_engine
from ..entity_resolution import entity_resolution

router = APIRouter(prefix="/api", tags=["Advanced Blockchain Intelligence"])

@router.get("/wallet/cluster")
def get_wallet_cluster(address: str = Query(..., description="Target wallet address to analyze co-spending clusters.")):
    # Fetch mock transactions or empty list for local fallback
    txs = [
        {"hash": "0xfe3b5928d11c439e05c5b3259aec9be5fbfe3e9af3971dd833d26ba9b5c936f", "from": address, "to": "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be", "value": 1.5, "timestamp": "2026-06-29T10:00:00Z"},
        {"hash": "0xbc1d3a4b5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b568a8e4e9bcda9d9e4", "from": address, "to": "0xab5801a7d398351b8be11c439e05c5b3259aec9b", "value": 0.5, "timestamp": "2026-06-29T10:05:00Z"}
    ]
    return wallet_cluster.cluster_address_network(address, txs)

@router.get("/wallet/reputation")
def get_wallet_reputation(
    address: str = Query(..., description="Target wallet address."),
    tx_count: int = Query(10, description="Total transaction count."),
    sanction_exposure: float = Query(0.0, description="Mixer/Sanction exposure percentage.")
):
    return wallet_reputation.calculate_reputation(address, tx_count, sanction_exposure)

@router.get("/crosschain/trace")
def trace_crosschain_flow(address: str = Query(..., description="Target address.")):
    txs = [
        {"hash": "0xfe3b5928d11c439e05c5b3259aec9be5fbfe3e9af3971dd833d26ba9b5c936f", "from": address, "to": "0xa0c68c638235ee32657e8f720a23cec1bfc77c77", "value": 2.5, "timestamp": "2026-06-29T10:00:00Z"}
    ]
    return cross_chain_service.trace_cross_chain_movements(txs, address)

@router.get("/bridge/detect")
def detect_bridge(to_address: str = Query(..., description="Target bridge contract address.")):
    res = bridge_detector.identify_bridge(to_address)
    if not res:
        raise HTTPException(status_code=404, detail="Bridge contract not found in registry")
    return res

@router.get("/defi/decode")
def decode_defi_call(
    to_address: str = Query(..., description="Smart contract target address."),
    input_data: str = Query("0x5c1112de00000000000000", description="Method input data in hex."),
    value_eth: float = Query(0.0, description="Eth value sent.")
):
    return defi_decoder.decode_defi_transaction(to_address, input_data, value_eth)

@router.get("/mixer/analyze")
def analyze_mixer_obfuscation(address: str = Query(..., description="Target wallet address.")):
    txs = [
        {"hash": "0xfe3b5928d11c439e05c5b3259aec9be5fbfe3e9af3971dd833d26ba9b5c936f", "from": address, "to": "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc", "value": 0.1, "timestamp": "2026-06-29T10:00:00Z"}
    ]
    return mixer_detector.analyze_address_obfuscation(address, txs)

@router.get("/threat/intelligence")
def check_threat_intelligence(address: str = Query(..., description="Target wallet address.")):
    return threat_feed_manager.verify_address_threat(address)

@router.get("/risk/score")
def get_risk_score(
    exposure_percent: float = Query(0.0, description="Direct mixer exposure."),
    has_peel_chain: bool = Query(False, description="Presence of active peel chains.")
):
    return {"risk_score": risk_engine.evaluate_risk(exposure_percent, has_peel_chain)}

@router.get("/entity/resolve")
def resolve_entity_name(address: str = Query(..., description="Target address to resolve.")):
    res = entity_resolution.resolve_entity(address)
    if not res:
        raise HTTPException(status_code=404, detail="Entity target not matched in registry")
    return res
