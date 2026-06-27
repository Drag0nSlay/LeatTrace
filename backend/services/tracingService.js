/**
 * services/tracingService.js
 *
 * Multi-hop recursive wallet tracing using PostgreSQL WITH RECURSIVE.
 * Traces money flow up to N hops deep from a starting wallet.
 *
 * Returns graph data (nodes + edges) for the frontend visualizer.
 */

import pool             from '../db/pool.js';
import { getWalletTags } from './taggingService.js';

const MAX_DEPTH   = 5;  // max hops to trace
const MAX_NODES   = 50; // stop if graph gets too large

/**
 * Trace all transaction paths from a starting wallet.
 * Uses PostgreSQL recursive CTE for multi-hop traversal.
 *
 * @param {string} startWallet
 * @param {string} chain         - 'ethereum' | 'bitcoin'
 * @param {number} maxDepth      - max hops (default 5)
 * @returns {Promise<Object>}    - { nodes, edges, links, paths }
 */
export async function traceWallet(startWallet, chain, maxDepth = MAX_DEPTH) {
  const addr = startWallet.toLowerCase();

  // ── Recursive CTE — traces outgoing money flow ────────────────────────────
  const result = await pool.query(`
    WITH RECURSIVE trace_path AS (
      -- Base case: direct transactions FROM the target wallet
      SELECT
        from_address,
        to_address,
        tx_hash,
        amount::numeric AS amount,
        timestamp,
        1 AS depth
      FROM transactions
      WHERE from_address = $1
        AND chain = $2

      UNION

      -- Recursive case: follow the money forward
      SELECT
        t.from_address,
        t.to_address,
        t.tx_hash,
        t.amount::numeric,
        t.timestamp,
        tp.depth + 1
      FROM transactions t
      INNER JOIN trace_path tp ON t.from_address = tp.to_address
      WHERE tp.depth < $3
        AND t.chain = $2
    )
    SELECT
      from_address,
      to_address,
      tx_hash,
      amount,
      timestamp,
      depth
    FROM trace_path
    ORDER BY depth ASC, amount DESC
    LIMIT $4
  `, [addr, chain, maxDepth, MAX_NODES * 2]);

  const rows = result.rows;

  if (rows.length === 0) {
    // No outgoing txs — try incoming
    return traceIncoming(addr, chain, maxDepth);
  }

  return buildGraph(addr, rows, chain);
}

/**
 * Trace incoming transactions (money flowing IN to a wallet).
 */
async function traceIncoming(addr, chain, maxDepth) {
  const result = await pool.query(`
    WITH RECURSIVE trace_path AS (
      SELECT
        from_address,
        to_address,
        tx_hash,
        amount::numeric AS amount,
        timestamp,
        1 AS depth
      FROM transactions
      WHERE to_address = $1
        AND chain = $2

      UNION

      SELECT
        t.from_address,
        t.to_address,
        t.tx_hash,
        t.amount::numeric,
        t.timestamp,
        tp.depth + 1
      FROM transactions t
      INNER JOIN trace_path tp ON t.to_address = tp.from_address
      WHERE tp.depth < $3
        AND t.chain = $2
    )
    SELECT from_address, to_address, tx_hash, amount, timestamp, depth
    FROM trace_path
    ORDER BY depth ASC, amount DESC
    LIMIT $4
  `, [addr, chain, maxDepth, MAX_NODES * 2]);

  return buildGraph(addr, result.rows, chain, 'incoming');
}

/**
 * Build graph structure from raw SQL rows.
 * Tags nodes with risk levels from wallet_tags table.
 */
async function buildGraph(rootAddr, rows, chain, direction = 'outgoing') {
  const nodeMap  = new Map();
  const edges    = [];
  const links    = [];

  // Collect all unique addresses
  const allAddresses = new Set([rootAddr]);
  for (const row of rows) {
    allAddresses.add(row.from_address);
    allAddresses.add(row.to_address);
  }

  // Batch fetch tags for all addresses
  const tags = await getWalletTags([...allAddresses]);

  // Build nodes
  for (const addr of allAddresses) {
    const tag       = tags.get(addr);
    const isRoot    = addr === rootAddr;
    const riskLevel = tag?.risk_level || 'unknown';

    nodeMap.set(addr, {
      id:        addr,
      label:     addr.slice(0, 8) + '...',
      type:      isRoot ? 'target' : (tag ? 'tagged' : 'normal'),
      riskLevel,
      tag:       tag?.tag        || null,
      tagSource: tag?.source     || null,
      isRoot,
    });
  }

  // Build edges + links from transaction rows
  const seenEdges = new Set();
  for (const row of rows) {
    const edgeKey = `${row.from_address}-${row.to_address}`;
    if (seenEdges.has(edgeKey)) continue;
    seenEdges.add(edgeKey);

    const edge = {
      source:    row.from_address,
      target:    row.to_address,
      value:     parseFloat(row.amount).toFixed(6),
      txid:      row.tx_hash,
      depth:     row.depth,
      timestamp: row.timestamp,
    };

    edges.push(edge);
    links.push({
      ...edge,
      sourceId: row.from_address,
      targetId: row.to_address,
      isChange: false,
    });
  }

  const nodes = [...nodeMap.values()];

  return {
    nodes,
    edges,
    links,
    direction,
    totalHops:    rows.length > 0 ? Math.max(...rows.map(r => r.depth)) : 0,
    totalNodes:   nodes.length,
    totalEdges:   edges.length,
    taggedNodes:  nodes.filter(n => n.tag).length,
  };
}

/**
 * Get direct neighbors of a wallet (1 hop only, fast).
 *
 * @param {string} wallet
 * @param {string} chain
 */
export async function getDirectNeighbors(wallet, chain) {
  const addr = wallet.toLowerCase();

  const result = await pool.query(`
    SELECT
      from_address,
      to_address,
      tx_hash,
      amount::numeric AS amount,
      timestamp,
      1 AS depth
    FROM transactions
    WHERE (from_address = $1 OR to_address = $1)
      AND chain = $2
    ORDER BY amount DESC
    LIMIT 30
  `, [addr, chain]);

  return buildGraph(addr, result.rows, chain);
}

/**
 * Get wallet transaction summary from DB.
 */
export async function getWalletSummary(wallet, chain) {
  const addr = wallet.toLowerCase();

  const result = await pool.query(`
    SELECT
      COUNT(*)                                          AS tx_count,
      COUNT(*) FILTER (WHERE from_address = $1)        AS sent_count,
      COUNT(*) FILTER (WHERE to_address   = $1)        AS received_count,
      SUM(amount::numeric)                              AS total_volume,
      SUM(amount::numeric) FILTER (WHERE to_address = $1)   AS total_received,
      SUM(amount::numeric) FILTER (WHERE from_address = $1) AS total_sent,
      MAX(amount::numeric)                              AS max_tx,
      MIN(timestamp)                                    AS first_seen,
      MAX(timestamp)                                    AS last_seen,
      COUNT(DISTINCT from_address)                      AS unique_senders,
      COUNT(DISTINCT to_address)                        AS unique_receivers
    FROM transactions
    WHERE (from_address = $1 OR to_address = $1)
      AND chain = $2
  `, [addr, chain]);

  return result.rows[0];
}