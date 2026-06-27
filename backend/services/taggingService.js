/**
 * services/taggingService.js
 *
 * Wallet attribution layer.
 * Checks wallet against:
 *   1. Our PostgreSQL wallet_tags table (OFAC + scam seeds)
 *   2. Interaction-based tagging (if wallet sent/received from tagged wallet)
 */

import pool from '../db/pool.js';

/**
 * Get tag for a single wallet.
 * Returns null if wallet is untagged/clean.
 *
 * @param {string} wallet
 * @returns {Promise<Object|null>}
 */
export async function getWalletTag(wallet) {
  const result = await pool.query(
    'SELECT * FROM wallet_tags WHERE wallet = $1',
    [wallet.toLowerCase()]
  );
  return result.rows[0] || null;
}

/**
 * Get tags for multiple wallets at once.
 *
 * @param {string[]} wallets
 * @returns {Promise<Map<string, Object>>}
 */
export async function getWalletTags(wallets) {
  if (!wallets || wallets.length === 0) return new Map();

  const lower = wallets.map(w => w.toLowerCase());
  const result = await pool.query(
    'SELECT * FROM wallet_tags WHERE wallet = ANY($1)',
    [lower]
  );

  const map = new Map();
  for (const row of result.rows) {
    map.set(row.wallet, row);
  }
  return map;
}

/**
 * Check if any wallet in a transaction chain is tagged.
 * Used for indirect exposure scoring.
 *
 * @param {string} wallet - target wallet
 * @returns {Promise<Object[]>} - list of tagged wallets it interacted with
 */
export async function getTaggedInteractions(wallet) {
  const result = await pool.query(`
    SELECT DISTINCT
      t.from_address,
      t.to_address,
      wt.tag,
      wt.risk_level,
      wt.source,
      wt.description
    FROM transactions t
    JOIN wallet_tags wt
      ON wt.wallet = t.from_address OR wt.wallet = t.to_address
    WHERE
      (t.from_address = $1 OR t.to_address = $1)
      AND wt.wallet != $1
    LIMIT 20
  `, [wallet.toLowerCase()]);

  return result.rows;
}

/**
 * Manually tag a wallet (for investigators).
 *
 * @param {string} wallet
 * @param {string} tag
 * @param {string} riskLevel - 'critical'|'high'|'medium'|'low'|'safe'
 * @param {string} source
 * @param {string} description
 */
export async function tagWallet(wallet, tag, riskLevel, source = 'manual', description = '') {
  const result = await pool.query(`
    INSERT INTO wallet_tags (wallet, tag, risk_level, source, description)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (wallet) DO UPDATE
      SET tag = $2, risk_level = $3, source = $4, description = $5, created_at = NOW()
    RETURNING *
  `, [wallet.toLowerCase(), tag, riskLevel, source, description]);

  return result.rows[0];
}

/**
 * Get all tagged wallets (for display in UI).
 *
 * @param {string} riskLevel - optional filter
 */
export async function getAllTags(riskLevel = null) {
  let sql    = 'SELECT * FROM wallet_tags';
  const vals = [];

  if (riskLevel) {
    sql += ' WHERE risk_level = $1';
    vals.push(riskLevel);
  }

  sql += ' ORDER BY created_at DESC';
  const result = await pool.query(sql, vals);
  return result.rows;
}