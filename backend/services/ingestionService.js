/**
 * services/ingestionService.js — Phase 1 + Phase 2
 *
 * Flow:
 *   wallet address → chain API → normalize → upsert PostgreSQL → log run
 *
 * Supports:
 *   - Ethereum via Etherscan (normal + internal transactions)
 *   - Bitcoin  via Blockstream
 */

import pool from '../db/pool.js';
import { upsertTransactionBatch, getLatestBlockForChain } from '../db/txRepository.js';
import { fetchEthTransactions, fetchEthInternalTransactions } from './etherscan.js';
import { fetchBtcTransactions } from './blockstream.js';
import { normalizeEtherscanTxList, normalizeBlockstreamTxList } from './normalizer.js';

export async function ingestWallet(wallet, chain, opts = {}) {
  const { limit = 100, resumable = true } = opts;
  const walletLower = wallet.toLowerCase();
  let runId;

  // ── 1. Open ingestion run log ─────────────────────────────────────────────
  const runResult = await pool.query(
    `INSERT INTO ingestion_runs (chain, wallet, status) VALUES ($1, $2, 'running') RETURNING id`,
    [chain, walletLower]
  );
  runId = runResult.rows[0].id;

  try {
    let rawTxList  = [];
    let normalised = [];

    // ── 2. Fetch from chain API ───────────────────────────────────────────
    if (chain === 'ethereum') {
      let startBlock = 0;
      if (resumable) {
        startBlock = await getLatestBlockForChain('ethereum');
        if (startBlock > 0) startBlock += 1;
      }

      console.log(`[Ingestion] ETH | ${walletLower} | startBlock=${startBlock} | limit=${limit}`);

      // Fetch normal + internal txs in parallel
      // Internal needed for smart contracts (Tornado Cash, DEXes, etc.)
      const [normalTxs, internalTxs] = await Promise.all([
        fetchEthTransactions(walletLower, limit, startBlock),
        fetchEthInternalTransactions(walletLower, limit, startBlock),
      ]);

      rawTxList  = [...normalTxs, ...internalTxs];
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

    // ── 4. Close run log ──────────────────────────────────────────────────
    await pool.query(
      `UPDATE ingestion_runs
       SET status='done', tx_fetched=$1, tx_inserted=$2, finished_at=NOW()
       WHERE id=$3`,
      [rawTxList.length, inserted, runId]
    );

    console.log(`[Ingestion] ✓ ${chain} | fetched=${rawTxList.length} inserted=${inserted} skipped=${skipped}`);
    return { inserted, skipped, runId };

  } catch (err) {
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

export async function ingestWalletList(walletList, opts = {}) {
  const summary = [];
  for (const { wallet, chain } of walletList) {
    try {
      const result = await ingestWallet(wallet, chain, opts);
      summary.push({ wallet, chain, ...result, error: null });
    } catch (err) {
      summary.push({ wallet, chain, inserted: 0, skipped: 0, error: err.message });
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return summary;
}