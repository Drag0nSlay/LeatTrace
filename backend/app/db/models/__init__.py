"""
LEATrace Database Models Package.

Re-exports all models for backward compatibility.
Import from app.db.models instead of app.models.
"""

# User & Auth models
from .user import (
    User, UserSession, UserSecuritySettings, OAuthClient, AuthCode,
    TrustedDevice, RecoveryCode, PasswordHistory,
    APIKey, SecurityPolicy,
)

# Case models
from .case import Case

# Wallet models
from .wallet import (
    Wallet, WatchlistEntry, WalletProfile,
    WalletCluster, WalletRelationship,
)

# Transaction models
from .transaction import IndexedTransaction, IndexedTokenTransfer

# Evidence models
from .evidence import Evidence, ChainOfCustody, EvidenceSignature

# Alert models
from .alert import Alert

# Audit & Governance models
from .audit import (
    AuditLog, Decision, GovernanceLog, SystemState,
    chain_audit_log,
)

# Blockchain Intelligence models
from .blockchain import (
    BlockIndexCheckpoint, EntityLabel,
    CrossChainEvent, BridgeEvent, DecodedContract,
    RiskScore, BlockchainTimeline, Report,
    TaxiiSyncState, StixIndicator,
    SanctionsEntry, SanctionsSyncLog,
    SecurityIncident,
    MLModel, VectorDocument, AIExperiment, TrainingJob,
)

__all__ = [
    # User & Auth
    "User", "UserSession", "UserSecuritySettings", "OAuthClient", "AuthCode",
    "TrustedDevice", "RecoveryCode", "PasswordHistory",
    "APIKey", "SecurityPolicy",
    # Cases
    "Case",
    # Wallets
    "Wallet", "WatchlistEntry", "WalletProfile",
    "WalletCluster", "WalletRelationship",
    # Transactions
    "IndexedTransaction", "IndexedTokenTransfer",
    # Evidence
    "Evidence", "ChainOfCustody", "EvidenceSignature",
    # Alerts
    "Alert",
    # Audit
    "AuditLog", "Decision", "GovernanceLog", "SystemState",
    "chain_audit_log",
    # Blockchain Intelligence
    "BlockIndexCheckpoint", "EntityLabel",
    "CrossChainEvent", "BridgeEvent", "DecodedContract",
    "RiskScore", "BlockchainTimeline", "Report",
    "TaxiiSyncState", "StixIndicator",
    "SanctionsEntry", "SanctionsSyncLog",
    "SecurityIncident",
    "MLModel", "VectorDocument", "AIExperiment", "TrainingJob",
]
