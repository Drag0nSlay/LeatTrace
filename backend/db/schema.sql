-- ============================================================
-- LEATrace — Complete Schema (Phase 1 + Phase 2)
-- Run once:
-- psql -U postgres -c "CREATE DATABASE leatrace;"
-- psql -U postgres -d leatrace -f backend/db/schema.sql
-- ============================================================

-- ── PHASE 1 ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL PRIMARY KEY,
  tx_hash       TEXT UNIQUE NOT NULL,
  from_address  TEXT NOT NULL,
  to_address    TEXT NOT NULL,
  amount        NUMERIC(30, 10) NOT NULL,
  amount_usd    NUMERIC(20, 4),
  chain         TEXT NOT NULL,
  block_number  BIGINT,
  timestamp     TIMESTAMP NOT NULL,
  raw           JSONB,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_from  ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_to    ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_tx_chain ON transactions(chain);
CREATE INDEX IF NOT EXISTS idx_tx_time  ON transactions(timestamp DESC);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id          SERIAL PRIMARY KEY,
  chain       TEXT NOT NULL,
  wallet      TEXT,
  status      TEXT NOT NULL DEFAULT 'running',
  tx_fetched  INT DEFAULT 0,
  tx_inserted INT DEFAULT 0,
  error_msg   TEXT,
  started_at  TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

-- ── PHASE 2 ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet_tags (
  wallet      TEXT PRIMARY KEY,
  tag         TEXT NOT NULL,
  risk_level  TEXT NOT NULL,
  source      TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_risk ON wallet_tags(risk_level);

CREATE TABLE IF NOT EXISTS risk_scores (
  wallet        TEXT PRIMARY KEY,
  score         INT NOT NULL DEFAULT 0,
  signals       JSONB,
  tx_count      INT DEFAULT 0,
  total_volume  NUMERIC(30, 10) DEFAULT 0,
  last_updated  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_score ON risk_scores(score DESC);

-- ── SEED: Known wallets ───────────────────────────────────────────────────────

INSERT INTO wallet_tags (wallet, tag, risk_level, source, description) VALUES

-- OFAC Sanctioned — Lazarus Group
('0x098b716b8aaf21512996dc57eb0615e2383e2f96', 'OFAC Sanctioned',  'critical', 'ofac',   'Lazarus Group — Ronin Bridge Hack 2022'),
('0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b', 'OFAC Sanctioned',  'critical', 'ofac',   'Lazarus Group — linked wallet'),
('0x3cffd56b47b7b41c56258d9c7731abadc360e073', 'OFAC Sanctioned',  'critical', 'ofac',   'Lazarus Group — linked wallet'),

-- Tornado Cash (OFAC Sanctioned)
('0x722122df12d4e14e13ac3b6895a86e84145b6967', 'Tornado Cash',     'critical', 'ofac',   'Tornado Cash Mixer — OFAC sanctioned Aug 2022'),
('0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', 'Tornado Cash',     'critical', 'ofac',   'Tornado Cash Mixer — OFAC sanctioned'),
('0xd96f2b1c14db8458374d9aca76e26c3950113464', 'Tornado Cash',     'critical', 'ofac',   'Tornado Cash Mixer — OFAC sanctioned'),
('0x4736dcf1b7a3d580672cce6e7c65cd5cc9cfba9d', 'Tornado Cash',     'critical', 'ofac',   'Tornado Cash Mixer — OFAC sanctioned'),

-- Known BTC addresses
('1a1zp1ep5qgefi2dmptftl5slmv7divfna',         'Genesis Block',    'safe',     'manual', 'Satoshi Nakamoto Genesis Block'),
('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Known Scam',      'high',     'scam_list', 'Reported phishing wallet'),

-- Known exchanges (safe)
('0x28c6c06298d514db089934071355e5743bf21d60', 'Binance Hot Wallet','low',     'manual', 'Binance Exchange Hot Wallet'),
('0x21a31ee1afc51d94c2efccaa2092ad1028285549', 'Binance Cold',     'low',     'manual', 'Binance Exchange Cold Wallet'),
('0xdfd5293d8e347dfe59e90efd55b2956a1343963d', 'Binance',          'low',     'manual', 'Binance Exchange Wallet'),
('0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503', 'Binance',          'low',     'manual', 'Binance Exchange Wallet')

ON CONFLICT (wallet) DO NOTHING;