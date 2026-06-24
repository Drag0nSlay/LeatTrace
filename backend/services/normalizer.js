/**
 * services/normalizer.js
 *
 * Converts raw API responses from Etherscan / Blockstream into
 * the consistent shape that the rest of the system uses.
 *
 * Internal TX shape:
 * {
 *   tx_hash:      string,
 *   from_address: string,
 *   to_address:   string,
 *   amount:       string,   // in native units (ETH / BTC) as a string to avoid float loss
 *   chain:        'ethereum' | 'bitcoin',
 *   block_number: number | null,
 *   timestamp:    Date,
 *   raw:          object    // full original API object
 * }
 */

const WEI_PER_ETH  = 1e18;
const SAT_PER_BTC  = 1e8;

// ── Ethereum (Etherscan) ─────────────────────────────────────────────────────

/**
 * Normalise a single Etherscan transaction object.
 * Etherscan returns value in Wei (string); we convert to ETH.
 */
export function normalizeEtherscanTx(raw) {
  if (!raw || !raw.hash) {
    throw new Error(`normalizeEtherscanTx: missing required field "hash" in ${JSON.stringify(raw)}`);
  }

  const weiValue  = BigInt(raw.value || '0');
  const ethValue  = Number(weiValue) / WEI_PER_ETH;

  return {
    tx_hash:      raw.hash.toLowerCase(),
    from_address: (raw.from || '').toLowerCase(),
    to_address:   (raw.to   || '').toLowerCase(),
    amount:       ethValue.toFixed(10),
    chain:        'ethereum',
    block_number: raw.blockNumber ? parseInt(raw.blockNumber, 10) : null,
    timestamp:    new Date(parseInt(raw.timeStamp, 10) * 1000),
    raw,
  };
}

/**
 * Normalise an array of Etherscan transactions.
 * Skips rows that throw (e.g. contract-creation txs with empty "to").
 */
export function normalizeEtherscanTxList(rawList = []) {
  const results = [];
  for (const raw of rawList) {
    try {
      // Skip internal transactions with no "to" (contract creations)
      if (!raw.to) continue;
      results.push(normalizeEtherscanTx(raw));
    } catch (err) {
      console.warn('[normalizer] Skipping Etherscan tx:', err.message);
    }
  }
  return results;
}

// ── Bitcoin (Blockstream) ────────────────────────────────────────────────────

/**
 * Normalise a single Blockstream transaction.
 *
 * Blockstream /tx/:txid returns:
 * {
 *   txid, vin: [{prevout: {scriptpubkey_address, value}}],
 *   vout: [{scriptpubkey_address, value}], status: {block_height, block_time}
 * }
 *
 * Bitcoin transactions are UTXO-based (many inputs → many outputs).
 * For forensic purposes we:
 *   - Take the first input address as "from"
 *   - Take the first output address as "to"  (largest output = likely recipient)
 *   - Sum all output values as total amount
 *
 * This is a simplification but valid for Phase 1 tracing.
 */
export function normalizeBlockstreamTx(raw) {
  if (!raw || !raw.txid) {
    throw new Error(`normalizeBlockstreamTx: missing "txid" in ${JSON.stringify(raw)}`);
  }

  // First input with an address (coinbase txs may not have one)
  const firstInput = raw.vin?.find(v => v.prevout?.scriptpubkey_address);
  const fromAddr   = firstInput?.prevout?.scriptpubkey_address || 'coinbase';

  // Largest output = most-likely recipient
  const outputs = (raw.vout || []).filter(o => o.scriptpubkey_address);
  outputs.sort((a, b) => b.value - a.value);
  const toAddr  = outputs[0]?.scriptpubkey_address || 'unknown';

  // Total satoshis out → BTC
  const totalSat = (raw.vout || []).reduce((s, o) => s + (o.value || 0), 0);
  const btcValue = totalSat / SAT_PER_BTC;

  const blockTime = raw.status?.block_time
    ? new Date(raw.status.block_time * 1000)
    : new Date(); // unconfirmed: use now

  return {
    tx_hash:      raw.txid.toLowerCase(),
    from_address: fromAddr.toLowerCase(),
    to_address:   toAddr.toLowerCase(),
    amount:       btcValue.toFixed(10),
    chain:        'bitcoin',
    block_number: raw.status?.block_height || null,
    timestamp:    blockTime,
    raw,
  };
}

/**
 * Normalise an array of Blockstream transactions.
 */
export function normalizeBlockstreamTxList(rawList = []) {
  const results = [];
  for (const raw of rawList) {
    try {
      results.push(normalizeBlockstreamTx(raw));
    } catch (err) {
      console.warn('[normalizer] Skipping Blockstream tx:', err.message);
    }
  }
  return results;
}
