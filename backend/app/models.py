import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="investigator")  # admin, supervisor, investigator, analyst, auditor, readonly
    is_active = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True)
    department = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="medium")  # low, medium, high, critical
    status = Column(String, default="open")  # open, active, suspended, closed
    investigator_id = Column(String, ForeignKey("users.id"))
    investigator_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    wallets = relationship("Wallet", back_populates="case", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String, primary_key=True, index=True)
    address = Column(String, index=True, nullable=False)
    chain = Column(String, nullable=False)  # bitcoin, ethereum, solana
    label = Column(String, nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated list
    risk_score = Column(Integer, default=0)
    is_contract = Column(Boolean, default=False)
    case_id = Column(String, ForeignKey("cases.id"))

    # Relationships
    case = relationship("Case", back_populates="wallets")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_hash = Column(String, nullable=False)  # SHA-256 integrity signature
    file_size = Column(Integer, nullable=False)
    uploaded_by = Column(String, nullable=False)
    upload_time = Column(DateTime, default=datetime.datetime.utcnow)
    description = Column(Text, nullable=True)
    storage_path = Column(String, nullable=False)

    # Relationships
    case = relationship("Case", back_populates="evidence")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=True)
    username = Column(String, nullable=False)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="success")  # success, warning, failure
    actor = Column(String, default="Human")  # Human, AI, System
    decision_source = Column(String, nullable=True)  # e.g., "HITL Override", "SOIS Loop", "User Login"
    execution_result = Column(Text, nullable=True)
    validation_status = Column(String, default="Verified")  # Verified, Pending, Bypassed
    hash = Column(String, nullable=True)
    prev_hash = Column(String, nullable=True)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    chain = Column(String, nullable=False)
    address = Column(String, nullable=False)
    alias = Column(String, nullable=True)
    type = Column(String, nullable=False)  # balance, incoming, outgoing
    threshold = Column(Float, nullable=False)
    status = Column(String, default="Active")  # Active, Triggered, Suspended
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    message = Column(Text, nullable=True)
    severity = Column(String, default="medium")  # low, medium, high, critical
    is_read = Column(Boolean, default=False)

class WatchlistEntry(Base):
    __tablename__ = "watchlist"

    id = Column(String, primary_key=True, index=True)
    address = Column(String, nullable=False)
    chain = Column(String, nullable=False)
    alias = Column(String, nullable=True)
    risk_score = Column(Integer, default=0)
    status = Column(String, default="Monitored")  # Monitored, Suspended
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Decision(Base):
    __tablename__ = "decisions"

    decision_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    input = Column(Text, nullable=True)
    output = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class GovernanceLog(Base):
    __tablename__ = "governance_logs"

    log_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action = Column(Text, nullable=True)
    allowed = Column(Boolean, default=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SystemState(Base):
    __tablename__ = "system_state"

    state_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module = Column(String, nullable=True)
    status = Column(String, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    refresh_token = Column(String, index=True, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

class ChainOfCustody(Base):
    __tablename__ = "chain_of_custody"

    id = Column(String, primary_key=True, index=True)
    evidence_id = Column(String, ForeignKey("evidence.id"), nullable=False)
    action = Column(String, nullable=False)  # UPLOADED, TRANSFERRED, SEALED, EXPORTED
    performed_by = Column(String, nullable=False)
    recipient = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, nullable=True)
    prev_hash = Column(String, nullable=True)
    hash_signature = Column(String, nullable=True)

class EvidenceSignature(Base):
    __tablename__ = "evidence_signatures"

    id = Column(String, primary_key=True, index=True)
    evidence_id = Column(String, ForeignKey("evidence.id"), nullable=False)
    signer_name = Column(String, nullable=False)
    signature = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    public_key_pem = Column(Text, nullable=False)

# --- Cryptographical Log Ledger Chaining ---
from sqlalchemy import event, text
import hashlib

@event.listens_for(AuditLog, 'before_insert')
def chain_audit_log(mapper, connection, target):
    # Fetch last hash
    try:
        # Execute query using the connection
        row = connection.execute(
            text("SELECT hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1")
        ).fetchone()
        prev_hash = row[0] if row and row[0] else "0"
    except Exception as e:
        prev_hash = "0"

    if not target.id:
        target.id = f"log_{uuid.uuid4().hex[:7]}"

    if not target.timestamp:
        target.timestamp = datetime.datetime.utcnow()

    timestamp_str = target.timestamp.isoformat()
    raw_str = f"{prev_hash}_{target.id}_{target.action}_{timestamp_str}_{target.status}"
    
    target.prev_hash = prev_hash
    target.hash = hashlib.sha256(raw_str.encode('utf-8')).hexdigest()


class BlockIndexCheckpoint(Base):
    __tablename__ = "block_index_checkpoints"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    chain = Column(String, index=True, nullable=False)
    block_number = Column(Integer, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class IndexedTransaction(Base):
    __tablename__ = "indexed_transactions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    chain = Column(String, index=True, nullable=False)
    tx_hash = Column(String, index=True, unique=True, nullable=False)
    block_number = Column(Integer, index=True, nullable=False)
    from_address = Column(String, index=True, nullable=False)
    to_address = Column(String, index=True, nullable=False)
    value = Column(Float, nullable=False)
    gas_used = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)


class IndexedTokenTransfer(Base):
    __tablename__ = "indexed_token_transfers"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    chain = Column(String, index=True, nullable=False)
    tx_hash = Column(String, index=True, nullable=False)
    contract_address = Column(String, index=True, nullable=False)
    from_address = Column(String, index=True, nullable=False)
    to_address = Column(String, index=True, nullable=False)
    value = Column(Float, nullable=False)
    token_type = Column(String, nullable=False)  # ERC-20, ERC-721, ERC-1155
    symbol = Column(String, nullable=True)
    timestamp = Column(DateTime, nullable=False)


class EntityLabel(Base):
    __tablename__ = "entity_labels"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    address = Column(String, index=True, unique=True, nullable=False)
    label = Column(String, nullable=False)
    category = Column(String, nullable=False)  # exchange, sanctioned, scam, retail
    source = Column(String, default="Local Compliance")
    confidence_score = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

