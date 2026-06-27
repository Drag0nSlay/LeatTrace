# LEATrace Phase 2 – Implementation Log

> What was actually built, verified, and deployed in Phase 2.
> Last updated: June 2026

---

## What Phase 2 Adds Over Phase 1

Phase 1 gave us live blockchain ingestion into PostgreSQL.
Phase 2 turns that raw data into **real intelligence** — scoring, tagging, and graph tracing.

```
Phase 1:  wallet → API → normalize → PostgreSQL
Phase 2:  PostgreSQL → score engine → risk signals → graph trace → UI
```

---

## ✅ Issue 3 — Recursive Multi-Hop Graph Tracing

**File:** `backend/services/tracingService.js`

Uses PostgreSQL `WITH RECURSIVE` to trace money flow up to 5 hops deep:

```sql
WITH RECURSIVE trace_path AS (
  SELECT from_address, to_address, tx_hash, amount::numeric, timestamp, 1 AS depth
  FROM transactions WHERE from_address = $1 AND chain = $2

  UNION

  SELECT t.from_address, t.to_address, t.tx_hash, t.amount::numeric, t.timestamp, tp.depth + 1
  FROM transactions t
  INNER JOIN trace_path tp ON t.from_address = tp.to_address
  WHERE tp.depth < $3 AND t.chain = $2
)
SELECT * FROM trace_path ORDER BY depth ASC, amount DESC LIMIT 100
```

- Max depth: 5 hops (configurable)
- Max nodes: 50 (prevents blowup on exchange wallets)
- Joins results against `wallet_tags` so tagged nodes (OFAC, scam) are flagged in graph
- Supports both outgoing and incoming trace directions
- Returns `{ nodes, edges, links, totalHops, taggedNodes }` for frontend graph

**Verified:** Tornado Cash (`0x722122df...`) traces 14+ connected wallets with correct hop depth.

---

## ✅ Issue 4 — Real Risk Scoring Engine

**File:** `backend/services/scoringService.js`

Reads actual PostgreSQL data and computes a 0–100 score based on real signals:

| Signal | Score Impact | Source |
|--------|-------------|--------|
| Direct OFAC/sanctioned tag match | +60 | `wallet_tags` |
| High-risk tag match | +40 | `wallet_tags` |
| Medium-risk tag match | +20 | `wallet_tags` |
| Known safe entity (exchange) | -10 | `wallet_tags` |
| Interacted with sanctioned wallet | +25 | `transactions` JOIN `wallet_tags` |
| Interacted with high-risk wallet | +10 | `transactions` JOIN `wallet_tags` |
| Large transaction (>10 ETH / >1 BTC) | +20 | `transactions` |
| High frequency (>50 txs) | +15 | `transactions` |
| Moderate frequency (>20 txs) | +8 | `transactions` |
| Many counterparties (>20 unique) | +5 | `transactions` |
| Etherscan phishing label detected | +50 | Etherscan API |
| Etherscan scam/hack label | +45 | Etherscan API |

Score is **clamped to 0–100** and written to `risk_scores` table with `INSERT ON CONFLICT DO UPDATE`.

**Result:**
- Tornado Cash → Score 100 (OFAC +60, large tx +20, high freq +15, counterparties +5)
- Genesis Block → Score 0 (safe entity -10, no suspicious signals)
- Unknown wallet → Score 0 until ingested (honest, not fake)

---

## ✅ Issue 5 — Wallet Attribution / Tagging

**File:** `backend/services/taggingService.js`

Checks wallets against `wallet_tags` table (OFAC + public scam lists):

- `getWalletTag(address)` — single wallet lookup
- `getWalletTags(addresses[])` — batch lookup for graph nodes
- `getTaggedInteractions(wallet)` — finds which tagged wallets this wallet transacted with
- `tagWallet(wallet, tag, riskLevel, source, description)` — manual tagging by investigators

**Seeded Data:**

| Entity | Risk Level | Source |
|--------|-----------|--------|
| Lazarus Group (3 wallets) | critical | ofac |
| Tornado Cash (4 routers) | critical | ofac |
| LockBit ransomware wallets | critical | scam_list |
| Binance hot/cold wallets | low | manual |
| Satoshi Genesis Block | safe | manual |

---

## ✅ Issue 6 — New API Routes

**File:** `backend/routes/analysis.js`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analyze/:chain/:address` | Full analysis (ingest + trace + score + tag) |
| GET | `/api/score/:chain/:address` | Risk score only (cached, fast) |
| GET | `/api/trace/:chain/:address` | Graph trace only |
| GET | `/api/tags` | All tagged wallets |
| GET | `/api/tags/:address` | Tag for one wallet |
| POST | `/api/tags` | Manually tag a wallet |

**Legacy route upgraded:**
`GET /api/trace/address/:chain/:address` now uses real Phase 2 scoring + tracing instead of random/hash scores.

---

## ✅ Issue 7 — Tag Source Wired to Frontend Labels

**File:** `frontend/src/components/RiskPanel.jsx`

- `normalizeRiskData()` adapter extracts `tag`, `tagDescription`, `tagSource` from API response
- Tag badge renders separately from score badge — OFAC tag shown as distinct red `⚠️` alert
- `getRiskLabel()` uses score thresholds with tag-aware critical tier
- Score signals array shows exact breakdown: `+60 — OFAC/Sanctioned entity`

**Score thresholds:**
```js
const THRESHOLDS = { critical: 85, high: 60, medium: 25 };
```

---

## ✅ Bonus Fixes Done in Phase 2

**Etherscan V1 → V2 migration**
- Updated `BASE_URL` to `https://api.etherscan.io/v2/api`
- Added `chainid: '1'` to all requests
- Added `fetchEthInternalTransactions()` for smart contract wallets (Tornado Cash, DEXes)

**Ingestion pipeline fix**
- `resumable: false` now correctly passed from frontend → API → ingestion service
- `startBlock=0` forces full history fetch when needed

**Graph node highlighting**
- Clicking a wallet in "Immediate Flow Nodes" highlights it with cyan glow
- `selectedNodeId` state tracks which node is active

**GraphVisualizer white labels**
- Canvas 2D context doesn't read CSS variables
- Replaced all `var(--text-main)` etc. with direct hex colors (`#ffffff`, `#cbd5e1`)

**RiskPanel null safety**
- `normalizeRiskData()` adapter guards all fields with `?.` and `|| defaults`
- No crash when `riskData`, `graph`, or `txStats` is null/undefined
- Loading state shown while data fetches

---

## Database Tables (Phase 1 + Phase 2 Combined)

```sql
transactions     -- raw blockchain data (Phase 1)
ingestion_runs   -- pipeline audit log (Phase 1)
wallet_tags      -- OFAC + scam attribution (Phase 2)
risk_scores      -- computed scores cache (Phase 2)
```

Apply full schema:
```bash
psql -U postgres -d leatrace -f backend/db/schema.sql
```

---

## Files Added in Phase 2

```
backend/
├── services/
│   ├── taggingService.js     ← wallet attribution
│   ├── scoringService.js     ← real risk engine
│   └── tracingService.js     ← recursive graph tracing
└── routes/
    └── analysis.js           ← new /api/analyze, /api/score, /api/trace, /api/tags
```

---

## Verified Test Results

| Address | Chain | Score | Label | Source |
|---------|-------|-------|-------|--------|
| `0x722122df...` (Tornado Cash) | ETH | 100 | CRITICAL | OFAC tag + tx signals |
| `0x098b716b...` (Lazarus Group) | ETH | 60 | HIGH RISK | OFAC tag |
| `1A1zP1eP...` (Genesis Block) | BTC | 0 | LOW RISK | Safe entity tag |
| Unknown wallet (no data) | ETH | 0 | LOW RISK | Honest: no data ingested |

---

## What's Next — Phase 3

- Persistent alerts system (PostgreSQL-backed, not in-memory)
- Case management (save investigations across server restarts)
- Wallet clustering heuristics (common input ownership)
- Cross-chain support (Covalent API for BSC, Polygon, etc.)
- Near real-time monitoring (WebSocket for Bitcoin, polling for ETH)