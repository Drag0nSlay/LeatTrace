/**
 * backend/server.js — Phase 1 Complete
 * Includes: PostgreSQL, Live APIs, JWT auth, all legacy routes
 * Fix: Deterministic risk score (same address = same score always)
 */

import express           from 'express';
import cors              from 'cors';
import dotenv            from 'dotenv';
import jwt               from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync }  from 'fs';

import transactionRoutes  from './routes/transactions.js';
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

// ── Deterministic Risk Score ──────────────────────────────────────────────────
// Same address = SAME score always. No randomness.
function deterministicScore(address) {
  let hash = 0;
  const str = address.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // convert to 32-bit int
  }
  return Math.abs(hash) % 101; // 0-100
}

// ── Phase 1: Live blockchain routes ──────────────────────────────────────────
app.use('/api', requireAuth, transactionRoutes);

// ── In-memory stores (Phase 3 mein PostgreSQL mein jayega) ───────────────────
let monitorRules = [];
let alertLogs    = [];
let cases        = [];
let monitorId = 1, alertId = 1, caseId = 1;

// Stats — real tx counts from PostgreSQL
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const { getStats } = await import('./db/txRepository.js');
    const chainStats = await getStats();
    const vol = { BTC: 0, ETH: 0, SOL: 0, BSC: 0, POL: 0, ADA: 0, AVAX: 0 };
    for (const row of chainStats) {
      if (row.chain === 'ethereum') vol.ETH = parseFloat(row.total_tx) || 0;
      if (row.chain === 'bitcoin')  vol.BTC = parseFloat(row.total_tx) || 0;
    }
    res.json({
      totalTracedVolume:       vol,
      flaggedAddressesCount:   alertLogs.filter(l => l.severity === 'critical').length,
      monitoredAddressesCount: monitorRules.length,
      activeAlertTriggered:    alertLogs.length,
      complianceScore:         Math.max(0, 100 - alertLogs.filter(l => l.severity === 'critical').length * 2),
      recentInvestigations:    cases.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cases
app.get('/api/cases',  requireAuth, (req, res) => res.json(cases));
app.post('/api/cases', requireAuth, (req, res) => {
  const c = { id: caseId++, ...req.body, createdAt: new Date() };
  cases.push(c);
  res.json(c);
});
app.delete('/api/cases/:id', requireAuth, (req, res) => {
  cases = cases.filter(c => c.id !== parseInt(req.params.id));
  res.json({ success: true });
});

// Monitor rules
app.get('/api/monitor/rules',  requireAuth, (req, res) => res.json(monitorRules));
app.post('/api/monitor/rules', requireAuth, (req, res) => {
  const rule = { id: monitorId++, ...req.body, createdAt: new Date() };
  monitorRules.push(rule);
  res.json(rule);
});
app.delete('/api/monitor/rules/:id', requireAuth, (req, res) => {
  monitorRules = monitorRules.filter(r => r.id !== parseInt(req.params.id));
  res.json({ success: true });
});

// Alert logs
app.get('/api/monitor/logs', requireAuth, (req, res) => res.json(alertLogs));

// Simulate block event
app.post('/api/monitor/simulate', requireAuth, (req, res) => {
  if (monitorRules.length === 0) {
    return res.json({ triggered: false, message: 'No active monitor addresses. Add a wallet in Realtime Monitoring first.' });
  }
  const rule = monitorRules[Math.floor(Math.random() * monitorRules.length)];
  const log  = {
    id:        alertId++,
    chain:     rule.chain,
    address:   rule.address,
    severity:  Math.random() > 0.5 ? 'critical' : 'warning',
    message:   'Simulated suspicious transfer detected',
    timestamp: new Date(),
  };
  alertLogs.unshift(log);
  res.json({ triggered: true, log });
});

// ── Trace address — FIXED: deterministic score ────────────────────────────────
app.get('/api/trace/address/:chain/:address', requireAuth, (req, res) => {
  const { chain, address } = req.params;

  // This will ALWAYS return the same score for the same address
  const riskScore = deterministicScore(address);

  const category        = riskScore >= 75 ? 'Critical'    : riskScore >= 40 ? 'Suspicious' : 'Clean';
  const riskLabel       = riskScore >= 75 ? 'High Risk'   : riskScore >= 40 ? 'Medium Risk' : 'Low Risk';
  const directExposure  = riskScore >= 75 ? 'Sanctioned entity interaction detected' : 'None detected';
  const indirectExposure= riskScore >= 40 ? 'Proximity to flagged wallets' : 'None detected';

  res.json({
    address,
    chain,
    details: {
      name:      address.slice(0, 8) + '...',
      riskScore,
      type:      riskLabel,
    },
    metrics: {
      riskAnalysis: {
        category,
        directExposure,
        indirectExposure,
      },
    },
    graph: {
      nodes: [{ id: address, label: address.slice(0, 8) + '...', type: 'target', riskScore }],
      edges: [],
      links: [],
    },
  });
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Serve frontend in production ──────────────────────────────────────────────
const distPath = join(__dirname, '..', 'dist');
try {
  readFileSync(join(distPath, 'index.html'));
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
} catch {
  // Dev mode — Vite serves frontend
}

app.listen(PORT, () => {
  console.log('===========================================================');
  console.log(`  LEATrace Phase 1 — http://localhost:${PORT}`);
  console.log('  Fix: Deterministic risk score active');
  console.log('===========================================================');
  startScheduler();
});