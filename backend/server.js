/**
 * backend/server.js — Phase 1 + Phase 2 Complete
 *
 * Phase 2 adds:
 *   - Real risk scoring from PostgreSQL transaction data
 *   - Recursive multi-hop wallet tracing
 *   - Wallet tagging (OFAC + scam lists)
 *   - /api/analyze endpoint replaces random score
 */

import express           from 'express';
import cors              from 'cors';
import dotenv            from 'dotenv';
import jwt               from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync }  from 'fs';

import transactionRoutes from './routes/transactions.js';
import analysisRoutes    from './routes/analysis.js';
import { startScheduler } from './services/scheduler.js';
import './db/pool.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ── Auth ──────────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'leattrace-super-secret-key-1337';

const USERS = {
  admin:     { password: process.env.ADMIN_PASSWORD    || 'leattrace2026',   role: 'compliance_officer' },
  physicist: { password: process.env.PHYSICS_PASSWORD  || 'antigravity2026', role: 'lead_physicist'     },
  theorist:  { password: process.env.THEORIST_PASSWORD || 'antigravity2026', role: 'spec_theorist'      },
};

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token, role: user.role, username });
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Phase 1 routes — live ingestion ──────────────────────────────────────────
app.use('/api', requireAuth, transactionRoutes);

// ── Phase 2 routes — real analysis ───────────────────────────────────────────
app.use('/api', requireAuth, analysisRoutes);

// ── Legacy in-memory routes ───────────────────────────────────────────────────
let monitorRules = [], alertLogs = [], cases = [];
let monitorId = 1, alertId = 1, caseId = 1;

app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const { getStats } = await import('./db/txRepository.js');
    const chainStats   = await getStats();
    const vol = { BTC: 0, ETH: 0, SOL: 0, BSC: 0, POL: 0, ADA: 0, AVAX: 0 };
    for (const row of chainStats) {
      if (row.chain === 'ethereum') vol.ETH = parseFloat(row.total_tx) || 0;
      if (row.chain === 'bitcoin')  vol.BTC = parseFloat(row.total_tx) || 0;
    }

    // Count critical-tagged wallets from DB
    const { default: pool } = await import('./db/pool.js');
    const flagged = await pool.query(
      `SELECT COUNT(*) FROM wallet_tags WHERE risk_level IN ('critical','high')`
    );

    res.json({
      totalTracedVolume:       vol,
      flaggedAddressesCount:   parseInt(flagged.rows[0].count) || 0,
      monitoredAddressesCount: monitorRules.length,
      activeAlertTriggered:    alertLogs.length,
      complianceScore:         Math.max(0, 100 - alertLogs.filter(l => l.severity === 'critical').length * 2),
      recentInvestigations:    cases.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cases',        requireAuth, (req, res) => res.json(cases));
app.post('/api/cases',       requireAuth, (req, res) => {
  const c = { id: caseId++, ...req.body, createdAt: new Date() };
  cases.push(c);
  res.json(c);
});
app.delete('/api/cases/:id', requireAuth, (req, res) => {
  cases = cases.filter(c => c.id !== parseInt(req.params.id));
  res.json({ success: true });
});

app.get('/api/monitor/rules',        requireAuth, (req, res) => res.json(monitorRules));
app.post('/api/monitor/rules',       requireAuth, (req, res) => {
  const rule = { id: monitorId++, ...req.body, createdAt: new Date() };
  monitorRules.push(rule);
  res.json(rule);
});
app.delete('/api/monitor/rules/:id', requireAuth, (req, res) => {
  monitorRules = monitorRules.filter(r => r.id !== parseInt(req.params.id));
  res.json({ success: true });
});

app.get('/api/monitor/logs', requireAuth, (req, res) => res.json(alertLogs));
app.post('/api/monitor/simulate', requireAuth, (req, res) => {
  if (monitorRules.length === 0) {
    return res.json({ triggered: false, message: 'No active monitor addresses.' });
  }
  const rule = monitorRules[Math.floor(Math.random() * monitorRules.length)];
  const log  = {
    id: alertId++, chain: rule.chain, address: rule.address,
    severity: Math.random() > 0.5 ? 'critical' : 'warning',
    message:  'Simulated suspicious transfer detected',
    timestamp: new Date(),
  };
  alertLogs.unshift(log);
  res.json({ triggered: true, log });
});

// Legacy trace endpoint — now uses real Phase 2 analysis
app.get('/api/trace/address/:chain/:address', requireAuth, async (req, res) => {
  const { chain, address } = req.params;
  const chainMap   = { ETH: 'ethereum', BTC: 'bitcoin', ethereum: 'ethereum', bitcoin: 'bitcoin' };
  const dbChain    = chainMap[chain.toUpperCase()] || chainMap[chain] || 'ethereum';

  try {
    const { getRiskScore }      = await import('./services/scoringService.js');
    const { traceWallet, getWalletSummary } = await import('./services/tracingService.js');
    const { getWalletTag }      = await import('./services/taggingService.js');

    const [riskData, graph, summary, tag] = await Promise.all([
      getRiskScore(address, dbChain),
      traceWallet(address, dbChain),
      getWalletSummary(address, dbChain),
      getWalletTag(address),
    ]);

    res.json({
      address, chain,
      details: {
        name:           address.slice(0, 8) + '...',
        riskScore:      riskData.score,
        type:           riskData.riskLabel,
        tag:            tag?.tag || null,
        tagDescription: tag?.description || null,
      },
      metrics: {
        riskAnalysis: {
          category:         riskData.category,
          directExposure:   riskData.signals.find(s => s.signal.includes('OFAC'))?.detail || 'None detected',
          indirectExposure: riskData.signals.find(s => s.signal.includes('Interacted'))?.detail || 'None detected',
          signals:          riskData.signals,
        },
        txStats: {
          totalTx:       parseInt(summary?.tx_count)        || 0,
          totalVolume:   parseFloat(summary?.total_volume)  || 0,
          totalReceived: parseFloat(summary?.total_received)|| 0,
          totalSent:     parseFloat(summary?.total_sent)    || 0,
          firstSeen:     summary?.first_seen  || null,
          lastSeen:      summary?.last_seen   || null,
        },
      },
      graph,
    });
  } catch (err) {
    console.error('[/api/trace/address]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

const distPath = join(__dirname, '..', 'dist');
try {
  readFileSync(join(distPath, 'index.html'));
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
} catch { /* dev mode */ }

app.listen(PORT, () => {
  console.log('===========================================================');
  console.log(`  LEATrace Phase 2 — http://localhost:${PORT}`);
  console.log('  Real scoring: PostgreSQL tx data + OFAC tags');
  console.log('  Recursive tracing: WITH RECURSIVE SQL');
  console.log('===========================================================');
  startScheduler();
});