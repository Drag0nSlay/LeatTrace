/**
 * routes/analysis.js — Phase 2 API endpoints
 *
 * GET  /api/analyze/:chain/:address  — full analysis (trace + score + tags)
 * GET  /api/score/:chain/:address    — risk score only
 * GET  /api/trace/:chain/:address    — graph trace only
 * GET  /api/tags                     — all tagged wallets
 * POST /api/tags                     — manually tag a wallet
 * GET  /api/tags/:address            — tag for one wallet
 */

import express              from 'express';
import { traceWallet, getWalletSummary } from '../services/tracingService.js';
import { getRiskScore, computeRiskScore } from '../services/scoringService.js';
import { getWalletTag, getAllTags, tagWallet } from '../services/taggingService.js';
import { ingestWallet }     from '../services/ingestionService.js';

const router = express.Router();

// ── Full analysis — the main endpoint ────────────────────────────────────────
// Combines: ingest → trace → score → tag lookup
// This replaces the old /api/trace/address/:chain/:address
router.get('/analyze/:chain/:address', async (req, res) => {
  const { chain, address } = req.params;
  const forceRefresh = req.query.refresh === 'true';

  // Map frontend chain names to internal names
  const chainMap = {
    'ETH': 'ethereum', 'ethereum': 'ethereum',
    'BTC': 'bitcoin',  'bitcoin':  'bitcoin',
  };
  const internalChain = chainMap[chain.toUpperCase()] || chainMap[chain] || null;

  try {
    // Step 1: Ingest live data if ETH or BTC (and not cached recently)
    if (internalChain && forceRefresh) {
      try {
        await ingestWallet(address, internalChain, { limit: 100, resumable: true });
      } catch (ingestErr) {
        console.warn(`[Analysis] Ingestion warning for ${address}: ${ingestErr.message}`);
        // Don't fail the whole request — use whatever is in DB
      }
    }

    // Step 2: Parallel — trace graph + risk score + wallet summary
    const dbChain = internalChain || 'ethereum';
    const [graph, riskData, summary, tag] = await Promise.all([
      traceWallet(address, dbChain),
      getRiskScore(address, dbChain, forceRefresh),
      getWalletSummary(address, dbChain),
      getWalletTag(address),
    ]);

    // Step 3: Build response shape compatible with existing frontend
    const score     = riskData.score;
    const riskLabel = riskData.riskLabel;

    res.json({
      address,
      chain,          // keep original chain string for frontend
      details: {
        name:           address.slice(0, 8) + '...',
        riskScore:      score,
        type:           riskLabel,
        tag:            tag?.tag        || null,
        tagSource:      tag?.source     || null,
        tagDescription: tag?.description || null,
      },
      metrics: {
        riskAnalysis: {
          category:          riskData.category,
          directExposure:    riskData.signals.find(s => s.signal.includes('OFAC') || s.signal.includes('Sanctioned'))?.detail || 'None detected',
          indirectExposure:  riskData.signals.find(s => s.signal.includes('Interacted'))?.detail || 'None detected',
          signals:           riskData.signals,
        },
        txStats: {
          totalTx:       parseInt(summary?.tx_count)       || 0,
          sent:          parseInt(summary?.sent_count)      || 0,
          received:      parseInt(summary?.received_count)  || 0,
          totalVolume:   parseFloat(summary?.total_volume)  || 0,
          totalReceived: parseFloat(summary?.total_received)|| 0,
          totalSent:     parseFloat(summary?.total_sent)    || 0,
          maxSingleTx:   parseFloat(summary?.max_tx)        || 0,
          firstSeen:     summary?.first_seen  || null,
          lastSeen:      summary?.last_seen   || null,
          uniqueSenders: parseInt(summary?.unique_senders)  || 0,
          uniqueReceivers: parseInt(summary?.unique_receivers) || 0,
        },
      },
      graph,        // nodes + edges for GraphVisualizer
      riskData,     // full scoring breakdown
      dataSource:   'live_postgresql',
    });

  } catch (err) {
    console.error(`[/api/analyze] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ── Score only (fast) ─────────────────────────────────────────────────────────
router.get('/score/:chain/:address', async (req, res) => {
  const { chain, address } = req.params;
  const dbChain = chain.toLowerCase() === 'btc' ? 'bitcoin' : 'ethereum';

  try {
    const riskData = await getRiskScore(address, dbChain);
    res.json({ address, chain, ...riskData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Trace graph only ──────────────────────────────────────────────────────────
router.get('/trace/:chain/:address', async (req, res) => {
  const { chain, address } = req.params;
  const depth    = Math.min(parseInt(req.query.depth || '5'), 7);
  const dbChain  = chain.toLowerCase() === 'btc' ? 'bitcoin' : 'ethereum';

  try {
    const graph = await traceWallet(address, dbChain, depth);
    res.json({ address, chain, graph });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Wallet tags ───────────────────────────────────────────────────────────────
router.get('/tags', async (req, res) => {
  try {
    const { riskLevel } = req.query;
    const tags = await getAllTags(riskLevel || null);
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tags/:address', async (req, res) => {
  try {
    const tag = await getWalletTag(req.params.address);
    res.json(tag || { tag: null, risk_level: 'unknown' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tags', async (req, res) => {
  const { wallet, tag, riskLevel, source, description } = req.body;
  if (!wallet || !tag || !riskLevel) {
    return res.status(400).json({ error: 'wallet, tag, riskLevel are required' });
  }
  try {
    const result = await tagWallet(wallet, tag, riskLevel, source || 'manual', description || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;