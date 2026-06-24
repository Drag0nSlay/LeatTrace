/**
 * services/ingestionService.js
 *
 * The Phase 1 ingestion pipeline.
 *
 * Flow:
 *   wallet address → chain API → normalize → upsert PostgreSQL → log run
 *
 * Supports:
 *   - Ethereum via Etherscan
 *   - Bitcoin  via Blockstream
 */

import pool                     from '../db/pool.js';
import { upsertTransactionBatch, getLatestBlockForChain } from '../db/txRepository.js';
import { fetchEthTransactions } from './etherscan.js';
import { fetchBtcTransactions } from './blockstream.js';
import { normalizeEtherscanTxList, normalizeBlockstreamTxList } from './normalizer.js';

/**
 * Ingest transactions for a wallet on a given chain.
 *
 * @param {string} wallet  - wallet address
 * @param {string} chain   - 'ethereum' | 'bitcoin'
 * @param {Object} opts
 * @param {number} opts.limit      - max transactions to fetch per run (default 100)
 * @param {boolean} opts.resumable - if true, only fetch blocks newer than what's in DB
 * @returns {Promise<{inserted: number, skipped: number, runId: number}>}
 */
export async function ingestWallet(wallet, chain, opts = {}) {
  const { limit = 100, resumable = true } = opts;
  const walletLower = wallet.toLowerCase();
  let runId;

  // ── 1. Open ingestion_run log row ────────────────────────────────────────
  const runResult = await pool.query(
    `INSERT INTO ingestion_runs (chain, wallet, status) VALUES ($1, $2, 'running') RETURNING id`,
    [chain, walletLower]
  );
  runId = runResult.rows[0].id;

  try {
    let rawTxList    = [];
    let normalised   = [];

    // ── 2. Fetch from chain API ───────────────────────────────────────────
    if (chain === 'ethereum') {
      let startBlock = 0;
      if (resumable) {
        startBlock = await getLatestBlockForChain('ethereum');
        // Start one block after the last known block to avoid duplicates
        // (upsert handles exact dupes anyway, but this cuts API calls)
        if (startBlock > 0) startBlock += 1;
      }
      console.log(`[Ingestion] ETH | ${walletLower} | startBlock=${startBlock} | limit=${limit}`);
      rawTxList  = await fetchEthTransactions(walletLower, limit, startBlock);
      normalised = normalizeEtherscanTxList(rawTxList);

    } else if (chain === 'bitcoin') {
      console.log(`[Ingestion] BTC | ${walletLower} | limit=${limit}`);
      rawTxList  = await fetchBtcTransactions(walletLower, limit);
      normalised = normalizeBlockstreamTxList(rawTxList);

    } else {
      throw new Error(`Unsupported chain: ${chain}. Supported: 'ethereum', 'bitcoin'`);
    }

    // ── 3. Upsert to PostgreSQL ───────────────────────────────────────────
    const { inserted, skipped } = await upsertTransactionBatch(normalised);

    // ── 4. Close run log as done ──────────────────────────────────────────
    await pool.query(
      `UPDATE ingestion_runs
       SET status='done', tx_fetched=$1, tx_inserted=$2, finished_at=NOW()
       WHERE id=$3`,
      [rawTxList.length, inserted, runId]
    );

    console.log(`[Ingestion] ✓ ${chain} | fetched=${rawTxList.length} inserted=${inserted} skipped=${skipped}`);
    return { inserted, skipped, runId };

  } catch (err) {
    // ── Update run log with error ─────────────────────────────────────────
    await pool.query(
      `UPDATE ingestion_runs
       SET status='error', error_msg=$1, finished_at=NOW()
       WHERE id=$2`,
      [err.message, runId]
    );

    console.error(`[Ingestion] ✗ ${chain} | ${err.message}`);
    throw err;
  }
}

/**
 * Ingest a list of wallets across chains.
 * Runs sequentially to stay within free API rate limits.
 *
 * @param {Array<{wallet: string, chain: string}>} walletList
 * @param {Object} opts  - passed through to ingestWallet
 */
export async function ingestWalletList(walletList, opts = {}) {
  const summary = [];
  for (const { wallet, chain } of walletList) {
    try {
      const result = await ingestWallet(wallet, chain, opts);
      summary.push({ wallet, chain, ...result, error: null });
    } catch (err) {
      summary.push({ wallet, chain, inserted: 0, skipped: 0, error: err.message });
    }
    // Brief pause between wallets to be API-rate-limit friendly
    await new Promise(r => setTimeout(r, 300));
  }
  return summary;
}
