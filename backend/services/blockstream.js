/**
 * services/blockstream.js
 *
 * Thin wrapper around the Blockstream.info public Bitcoin API.
 * No API key required.  Rate limit: ~10 req/sec (be polite).
 *
 * Docs: https://github.com/Blockstream/esplora/blob/master/API.md
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://blockstream.info/api';

/**
 * Sleep helper – used to respect rate limits between requests.
 */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Fetch a list of transaction IDs for a Bitcoin address.
 * Returns up to the last 25 confirmed transactions per page.
 * Use `afterTxid` to paginate backwards.
 *
 * @param {string} address   - Bitcoin address (P2PKH, P2SH, bech32)
 * @param {string|null} afterTxid - paginate: start after this txid
 * @returns {Promise<Array<string>>} - array of txids
 */
export async function fetchBtcTxIds(address, afterTxid = null) {
  let url = `${BASE_URL}/address/${address}/txs`;
  if (afterTxid) url += `/chain/${afterTxid}`;

  console.log(`[Blockstream] Fetching tx IDs for ${address}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Blockstream HTTP error: ${response.status} – ${await response.text()}`);
  }

  const txs = await response.json();
  // Each item in the list is the full tx object (not just IDs)
  return txs;
}

/**
 * Fetch the full transaction object for a given txid.
 *
 * @param {string} txid
 * @returns {Promise<Object>}
 */
export async function fetchBtcTx(txid) {
  const url      = `${BASE_URL}/tx/${txid}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Blockstream tx fetch error (${txid}): ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch the last `limit` transactions for a Bitcoin address.
 * Blockstream paginates in chunks of 25; this method handles pagination.
 *
 * @param {string} address
 * @param {number} limit   - target number of transactions (default 50)
 * @returns {Promise<Array>} - array of full tx objects
 */
export async function fetchBtcTransactions(address, limit = 50) {
  const results   = [];
  let lastTxid    = null;

  while (results.length < limit) {
    const page = await fetchBtcTxIds(address, lastTxid);

    if (!page || page.length === 0) break;

    results.push(...page);

    if (page.length < 25) break;                       // fewer than page size = last page
    if (results.length >= limit) break;

    lastTxid = page[page.length - 1].txid;
    await sleep(200);                                  // polite delay between pages
  }

  return results.slice(0, limit);
}

/**
 * Get the current BTC balance of an address.
 *
 * @param {string} address
 * @returns {Promise<string>} balance in BTC
 */
export async function fetchBtcBalance(address) {
  const url      = `${BASE_URL}/address/${address}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Blockstream address fetch error: ${response.status}`);
  }

  const data    = await response.json();
  const satoshi = (data.chain_stats?.funded_txo_sum || 0)
                - (data.chain_stats?.spent_txo_sum  || 0);

  return (satoshi / 1e8).toFixed(8);
}
