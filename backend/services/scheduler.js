/**
 * services/scheduler.js
 *
 * Periodic ingestion scheduler using node-cron.
 * This replaces the "no automation / no continuous fetching" gap.
 *
 * Wallets to monitor are loaded from the WATCH_WALLETS env variable
 * or from a simple config array below.
 *
 * Usage: this module is imported once in server.js.  It starts the
 * cron jobs automatically.
 *
 * Intervals (configurable via env):
 *   INGESTION_INTERVAL_SEC  – how often to poll (default: 30 seconds)
 */

import cron                 from 'node-cron';
import { ingestWalletList } from './ingestionService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Wallets to monitor.
// In production you'd store these in the DB (a `watched_wallets` table).
// For Phase 1, keep them here or read from env.
//
// Format:  { wallet: 'address', chain: 'ethereum' | 'bitcoin' }
// ─────────────────────────────────────────────────────────────────────────────
function loadWatchList() {
  // If env var is set, parse it:
  // WATCH_WALLETS='0xABC:ethereum,bc1qXYZ:bitcoin'
  if (process.env.WATCH_WALLETS) {
    return process.env.WATCH_WALLETS.split(',').map(entry => {
      const [wallet, chain] = entry.trim().split(':');
      return { wallet, chain };
    });
  }

  // Default: empty (add your wallets here during development)
  return [
    // { wallet: '0xYourEthAddress', chain: 'ethereum' },
    // { wallet: 'bc1qYourBtcAddress', chain: 'bitcoin' },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────

let isRunning = false; // prevent overlapping runs

async function runIngestion() {
  if (isRunning) {
    console.log('[Scheduler] Skipping – previous run still in progress');
    return;
  }

  const watchList = loadWatchList();
  if (watchList.length === 0) {
    // Nothing configured yet – silent skip
    return;
  }

  isRunning = true;
  console.log(`[Scheduler] Starting ingestion run for ${watchList.length} wallet(s)`);

  try {
    const summary = await ingestWalletList(watchList, { limit: 100, resumable: true });
    const totalIn = summary.reduce((s, r) => s + (r.inserted || 0), 0);
    console.log(`[Scheduler] Run complete – total new transactions: ${totalIn}`);
  } catch (err) {
    console.error('[Scheduler] Run failed:', err.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the scheduler.
 * Called once from server.js.
 */
export function startScheduler() {
  const intervalSec = parseInt(process.env.INGESTION_INTERVAL_SEC || '30', 10);

  // node-cron needs cron syntax; we build a "every N seconds" expression.
  // For intervals >= 60s use cron; for < 60s use setInterval.
  if (intervalSec < 60) {
    console.log(`[Scheduler] Polling every ${intervalSec}s (using setInterval)`);
    setInterval(runIngestion, intervalSec * 1000);
  } else {
    // Build a cron expression: e.g. 60s → "* * * * *" (every minute)
    const minutes = Math.round(intervalSec / 60);
    const expr    = `*/${minutes} * * * *`;
    console.log(`[Scheduler] Cron: "${expr}" (every ~${intervalSec}s)`);
    cron.schedule(expr, runIngestion);
  }

  // Run once immediately on startup so we don't wait for the first tick
  setTimeout(runIngestion, 2000);
}