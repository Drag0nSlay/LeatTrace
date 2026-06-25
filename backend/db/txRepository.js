/**
 * db/txRepository.js
 *
 * All database operations for the `transactions` table.
 * Nothing else in the codebase should write SQL for transactions.
 */

import pool from './pool.js';

/**
 * Upsert a single normalised transaction.
 * ON CONFLICT (tx_hash) DO NOTHING – safe to call multiple times.
 *
 * @param {Object} tx - normalised transaction from normalizer.js
 * @returns {Promise<boolean>} true if inserted, false if already existed
 */
export async function upsertTransaction(tx) {
  const sql = `
    INSERT INTO transactions
      (tx_hash, from_address, to_address, amount, chain, block_number, timestamp, raw)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (tx_hash) DO NOTHING
  `;

  const values = [
    tx.tx_hash,
    tx.from_address,
    tx.to_address,
    tx.amount,
    tx.chain,
    tx.block_number ?? null,
    tx.timestamp,
    JSON.stringify(tx.raw),
  ];

  const result = await pool.query(sql, values);
  return result.rowCount > 0;
}

/**
 * Upsert a batch of normalised transactions.
 * Uses a single transaction for atomicity.
 *
 * @param {Array<Object>} txList
 * @returns {Promise<{inserted: number, skipped: number}>}
 */
export async function upsertTransactionBatch(txList) {
  if (!txList || txList.length === 0) return { inserted: 0, skipped: 0 };

  const client = await pool.connect();
  let inserted = 0;

  try {
    await client.query('BEGIN');

    for (const tx of txList) {
      const sql = `
        INSERT INTO transactions
          (tx_hash, from_address, to_address, amount, chain, block_number, timestamp, raw)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tx_hash) DO NOTHING
      `;
      const values = [
        tx.tx_hash,
        tx.from_address,
        tx.to_address,
        tx.amount,
        tx.chain,
        tx.block_number ?? null,
        tx.timestamp,
        JSON.stringify(tx.raw),
      ];

      const r = await client.query(sql, values);
      if (r.rowCount > 0) inserted++;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { inserted, skipped: txList.length - inserted };
}

/**
 * Get paginated transactions for a wallet (either direction).
 *
 * @param {string} wallet
 * @param {Object} opts
 * @param {number} opts.limit   - rows per page (default 50)
 * @param {number} opts.offset  - pagination offset (default 0)
 * @param {string} opts.chain   - filter by chain (optional)
 * @returns {Promise<{rows: Array, total: number}>}
 */
export async function getTransactionsForWallet(wallet, opts = {}) {
  const { limit = 50, offset = 0, chain } = opts;
  const addr = wallet.toLowerCase();

  const conditions = ['(from_address = $1 OR to_address = $1)'];
  const values     = [addr];

  if (chain) {
    values.push(chain);
    conditions.push(`chain = $${values.length}`);
  }

  const where = conditions.join(' AND ');

  const countSql = `SELECT COUNT(*) FROM transactions WHERE ${where}`;
  const rowsSql  = `
    SELECT id, tx_hash, from_address, to_address, amount, chain, block_number, timestamp
    FROM transactions
    WHERE ${where}
    ORDER BY timestamp DESC
    LIMIT  $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const [countResult, rowsResult] = await Promise.all([
    pool.query(countSql, values),
    pool.query(rowsSql, [...values, limit, offset]),
  ]);

  return {
    rows:  rowsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Get the most recent block_number we have for a chain.
 * Used by the ingestion service to resume from where it left off.
 *
 * @param {string} chain
 * @returns {Promise<number>}
 */
export async function getLatestBlockForChain(chain) {
  const result = await pool.query(
    'SELECT MAX(block_number) AS max_block FROM transactions WHERE chain = $1',
    [chain]
  );
  return result.rows[0]?.max_block || 0;
}

/**
 * Return a quick summary of how many transactions we have.
 */
export async function getStats() {
  const result = await pool.query(`
    SELECT
      chain,
      COUNT(*)                          AS total_tx,
      COUNT(DISTINCT from_address)      AS unique_senders,
      COUNT(DISTINCT to_address)        AS unique_receivers,
      MIN(timestamp)                    AS earliest,
      MAX(timestamp)                    AS latest
    FROM transactions
    GROUP BY chain
    ORDER BY chain
  `);
  return result.rows;
}