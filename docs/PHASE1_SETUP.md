# LEATrace Phase 1 – Setup Guide

This guide gets you from the current static-data system to **live blockchain data stored in PostgreSQL** in under 30 minutes.

---

## What Phase 1 fixes

| # | Issue | Fix applied |
|---|-------|-------------|
| 1 | Static / local data | Etherscan + Blockstream live APIs |
| 2 | No ingestion pipeline | `ingestionService.js` + `scheduler.js` |
| 12 | No data normalisation | `normalizer.js` converts both API formats |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally
- A free [Etherscan API key](https://etherscan.io/register) (takes 2 minutes)

---

## Step 1 – Create the database

```bash
# Create the database (run once)
psql -U postgres -c "CREATE DATABASE leatrace;"

# Apply the schema
psql -U postgres -d leatrace -f backend/db/schema.sql
```

You should see output like:
```
CREATE TABLE
CREATE INDEX
...
```

---

## Step 2 – Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
PG_PASSWORD=your_local_postgres_password
ETHERSCAN_API_KEY=YourKeyFromEtherscan
```

Everything else can stay as-is for local development.

---

## Step 3 – Install dependencies

```bash
npm install
```

---

## Step 4 – Start the server

```bash
npm run dev
```

You should see:
```
[DB] PostgreSQL connected
[Server] LEATrace backend running on http://localhost:5000
[Scheduler] Polling every 30s (using setInterval)
```

---

## Step 5 – Trigger your first ingestion

Use any HTTP client (curl, Postman, or your frontend):

### Authenticate

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"leattrace2026"}'
```

Copy the `token` from the response.

### Ingest an Ethereum wallet

```bash
curl -X POST http://localhost:5000/api/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "wallet": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "chain":  "ethereum",
    "limit":  50
  }'
```

Response:
```json
{
  "success": true,
  "wallet":  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "chain":   "ethereum",
  "inserted": 42,
  "skipped":  8,
  "runId":    1
}
```

### Ingest a Bitcoin wallet

```bash
curl -X POST http://localhost:5000/api/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "wallet": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "chain":  "bitcoin",
    "limit":  25
  }'
```

---

## Step 6 – Query stored transactions

```bash
# All ETH transactions for a wallet
curl "http://localhost:5000/api/transactions?wallet=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&chain=ethereum" \
  -H "Authorization: Bearer YOUR_TOKEN"

# All chains for a wallet
curl "http://localhost:5000/api/transactions?wallet=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Paginate (page 2)
curl "http://localhost:5000/api/transactions?wallet=0xABC&limit=20&offset=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Step 7 – Enable automatic monitoring

In your `.env`, add the wallets you want polled every 30 seconds:

```env
WATCH_WALLETS=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045:ethereum,bc1qXYZ:bitcoin
INGESTION_INTERVAL_SEC=30
```

Restart the server and you'll see periodic log lines:
```
[Scheduler] Starting ingestion run for 2 wallet(s)
[Ingestion] ✓ ethereum | fetched=5 inserted=3 skipped=2
[Scheduler] Run complete – total new transactions: 3
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Get JWT token |
| POST | `/api/ingest` | Trigger ingestion for a wallet |
| GET | `/api/transactions` | List stored transactions |
| GET | `/api/transactions/:hash` | Single transaction lookup |
| GET | `/api/stats` | Row counts + recent run log |
| GET | `/api/balance/:chain/:address` | Live balance (from API, not DB) |
| GET | `/api/health` | Health check (no auth required) |

---

## Database structure

```
transactions        ← all ingested blockchain data
ingestion_runs      ← log of every ingestion run
```

Verify with:
```sql
SELECT chain, COUNT(*), MIN(timestamp), MAX(timestamp)
FROM transactions
GROUP BY chain;

SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT 5;
```

---

## Troubleshooting

**`[DB] Could not connect to PostgreSQL`**
→ Check `PG_*` values in `.env` and confirm PostgreSQL is running:
```bash
pg_isready -h localhost -p 5432
```

**`Etherscan API error: NOTOK`**
→ Check `ETHERSCAN_API_KEY` in `.env`. The public fallback key is heavily rate-limited.

**`Blockstream HTTP error: 429`**
→ You're polling too fast. Set `INGESTION_INTERVAL_SEC=60` or reduce wallet count.

**Transactions appear as `skipped`**
→ They already exist in the DB (upsert deduplication working correctly).

---

## What's next (Phase 2)

Once Phase 1 is stable, Phase 2 adds:
- Recursive `WITH RECURSIVE` wallet tracing queries
- Risk scoring engine
- Wallet tagging from OFAC / scam lists

See `docs/PHASE2_SETUP.md` (coming soon).