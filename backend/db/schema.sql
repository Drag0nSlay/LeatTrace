-- ============================================================
-- LEATrace Phase 1 – PostgreSQL Schema
-- Run once: psql -U postgres -d leatrace -f schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL PRIMARY KEY,
  tx_hash       TEXT UNIQUE NOT NULL,
  from_address  TEXT NOT NULL,
  to_address    TEXT NOT NULL,
  amount        NUMERIC(30, 10) NOT NULL,   -- in native units (ETH / BTC / etc.)
  amount_usd    NUMERIC(20, 4),             -- optional, filled later
  chain         TEXT NOT NULL,              -- 'ethereum' | 'bitcoin'
  block_number  BIGINT,
  timestamp     TIMESTAMP NOT NULL,
  raw           JSONB,                      -- full API response preserved
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_from   ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_to     ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_tx_chain  ON transactions(chain);
CREATE INDEX IF NOT EXISTS idx_tx_time   ON transactions(timestamp DESC);

-- ============================================================
-- Ingestion run log – track each cron job execution
-- ============================================================
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id          SERIAL PRIMARY KEY,
  chain       TEXT NOT NULL,
  wallet      TEXT,
  status      TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'done' | 'error'
  tx_fetched  INT DEFAULT 0,
  tx_inserted INT DEFAULT 0,
  error_msg   TEXT,
  started_at  TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);
