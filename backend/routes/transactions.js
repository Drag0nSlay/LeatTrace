/**
 * routes/transactions.js
 *
 * REST endpoints for Phase 1:
 *
 *   POST /api/ingest            – manually trigger ingestion for a wallet
 *   GET  /api/transactions      – list stored transactions (with filters)
 *   GET  /api/transactions/:hash – get a single transaction
 *   GET  /api/stats             – ingestion stats (row counts per chain)
 *   GET  /api/balance/:chain/:address – live balance lookup
 */

import express from 'express';
import { ingestWallet }            from '../services/ingestionService.js';
import { fetchEthBalance }         from '../services/etherscan.js';
import { fetchBtcBalance }         from '../services/blockstream.js';
import {
  getTransactionsForWallet,
  getStats,
}                                  from '../db/txRepository.js';
import pool                        from '../db/pool.js';

const router = express.Router();

// ── POST /api/ingest ─────────────────────────────────────────────────────────
// Body: { wallet: string, chain: 'ethereum'|'bitcoin', limit?: number }
router.post('/ingest', async (req, res) => {
  const { wallet, chain, limit = 100, resumable = false } = req.body;

  if (!wallet || !chain) {
    return res.status(400).json({ error: 'wallet and chain are required' });
  }

  const validChains = ['ethereum', 'bitcoin'];
  if (!validChains.includes(chain)) {
    return res.status(400).json({ error: `chain must be one of: ${validChains.join(', ')}` });
  }

  try {
    const result = await ingestWallet(wallet, chain, { limit: Math.min(limit, 200), resumable });
    return res.json({
      success: true,
      wallet,
      chain,
      ...result,
    });
  } catch (err) {
    console.error('[/api/ingest]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/transactions ─────────────────────────────────────────────────────
// Query: wallet, chain, limit, offset
router.get('/transactions', async (req, res) => {
  const { wallet, chain, limit = 50, offset = 0 } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'wallet query param is required' });
  }

  try {
    const { rows, total } = await getTransactionsForWallet(wallet, {
      chain,
      limit:  parseInt(limit,  10),
      offset: parseInt(offset, 10),
    });

    return res.json({
      wallet,
      chain:  chain || 'all',
      total,
      count:  rows.length,
      limit:  parseInt(limit, 10),
      offset: parseInt(offset, 10),
      transactions: rows,
    });
  } catch (err) {
    console.error('[/api/transactions]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/transactions/:hash ───────────────────────────────────────────────
router.get('/transactions/:hash', async (req, res) => {
  const { hash } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE tx_hash = $1',
      [hash.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stats ────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [chainStats, recentRuns] = await Promise.all([
      getStats(),
      pool.query(`
        SELECT id, chain, wallet, status, tx_fetched, tx_inserted, error_msg,
               started_at, finished_at
        FROM   ingestion_runs
        ORDER  BY started_at DESC
        LIMIT  20
      `),
    ]);

    return res.json({
      chains:      chainStats,
      recentRuns:  recentRuns.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/balance/:chain/:address ─────────────────────────────────────────
// Live balance lookup directly from the chain API (not from our DB)
router.get('/balance/:chain/:address', async (req, res) => {
  const { chain, address } = req.params;

  try {
    let balance;
    if (chain === 'ethereum') {
      balance = await fetchEthBalance(address);
    } else if (chain === 'bitcoin') {
      balance = await fetchBtcBalance(address);
    } else {
      return res.status(400).json({ error: `Unsupported chain: ${chain}` });
    }

    return res.json({ address, chain, balance });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;