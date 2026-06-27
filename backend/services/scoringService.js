/**
 * services/scoringService.js — Phase 2
 * Real risk scoring from PostgreSQL tx data + OFAC tags + Etherscan labels
 */

import pool from '../db/pool.js';
import { getWalletTag, getTaggedInteractions } from './taggingService.js';
import { fetchEthAddressLabel } from './etherscan.js';

export async function computeRiskScore(wallet, chain) {
  const addr    = wallet.toLowerCase();
  const signals = [];
  let score     = 0;

  // ── Signal 1: Direct tag check (OFAC / scam list) ────────────────────────
  const tag = await getWalletTag(addr);
  if (tag) {
    if (tag.risk_level === 'critical') {
      score += 60;
      signals.push({ signal: 'OFAC/Sanctioned entity', impact: +60, detail: tag.description });
    } else if (tag.risk_level === 'high') {
      score += 40;
      signals.push({ signal: 'High-risk tagged wallet', impact: +40, detail: tag.description });
    } else if (tag.risk_level === 'medium') {
      score += 20;
      signals.push({ signal: 'Medium-risk tagged wallet', impact: +20, detail: tag.description });
    } else if (tag.risk_level === 'safe') {
      score -= 10;
      signals.push({ signal: 'Known safe entity', impact: -10, detail: tag.description });
    }
  }

  // ── Signal 2: Etherscan label check (Fake_Phishing, Scam, Hack etc.) ─────
  if (chain === 'ethereum') {
    try {
      const label = await fetchEthAddressLabel(addr);
      if (label) {
        const labelLower = label.toLowerCase();
        if (labelLower.includes('phishing') || labelLower.includes('fake')) {
          score += 50;
          signals.push({
            signal: 'Etherscan Phishing Label',
            impact: +50,
            detail: `Etherscan tagged: "${label}"`,
          });
        } else if (labelLower.includes('scam') || labelLower.includes('hack')) {
          score += 45;
          signals.push({
            signal: 'Etherscan Scam Label',
            impact: +45,
            detail: `Etherscan tagged: "${label}"`,
          });
        } else if (labelLower.includes('exploit') || labelLower.includes('heist')) {
          score += 55;
          signals.push({
            signal: 'Etherscan Exploit Label',
            impact: +55,
            detail: `Etherscan tagged: "${label}"`,
          });
        }
      }
    } catch (e) {
      // Etherscan label fetch failed — skip silently
    }
  }

  // ── Signal 3: Interaction with tagged wallets ─────────────────────────────
  const taggedInteractions = await getTaggedInteractions(addr);
  const criticalInteractions = taggedInteractions.filter(i => i.risk_level === 'critical');
  const highInteractions     = taggedInteractions.filter(i => i.risk_level === 'high');

  if (criticalInteractions.length > 0) {
    score += 25;
    signals.push({
      signal: 'Interacted with sanctioned wallet',
      impact: +25,
      detail: `${criticalInteractions.length} interaction(s) with OFAC/critical wallets`,
    });
  }
  if (highInteractions.length > 0) {
    score += 10;
    signals.push({
      signal: 'Interacted with high-risk wallet',
      impact: +10,
      detail: `${highInteractions.length} interaction(s) with high-risk wallets`,
    });
  }

  // ── Signal 4: Transaction volume and count from PostgreSQL ────────────────
  const txStats = await pool.query(`
    SELECT
      COUNT(*)                     AS tx_count,
      MAX(amount::numeric)         AS max_tx,
      SUM(amount::numeric)         AS total_volume,
      COUNT(DISTINCT from_address) AS unique_senders,
      COUNT(DISTINCT to_address)   AS unique_receivers
    FROM transactions
    WHERE (from_address = $1 OR to_address = $1)
      AND chain = $2
  `, [addr, chain]);

  const stats       = txStats.rows[0];
  const txCount     = parseInt(stats.tx_count)       || 0;
  const maxTx       = parseFloat(stats.max_tx)       || 0;
  const totalVol    = parseFloat(stats.total_volume) || 0;
  const uniquePeers = Math.max(
    parseInt(stats.unique_senders)   || 0,
    parseInt(stats.unique_receivers) || 0
  );

  // Large transaction signal
  const largeThreshold = chain === 'bitcoin' ? 1 : 10;
  if (maxTx >= largeThreshold) {
    score += 20;
    signals.push({
      signal: 'Large transaction detected',
      impact: +20,
      detail: `Max single tx: ${maxTx.toFixed(4)} ${chain === 'bitcoin' ? 'BTC' : 'ETH'}`,
    });
  }

  // High frequency signal
  if (txCount >= 50) {
    score += 15;
    signals.push({ signal: 'High transaction frequency', impact: +15, detail: `${txCount} transactions in database` });
  } else if (txCount >= 20) {
    score += 8;
    signals.push({ signal: 'Moderate transaction frequency', impact: +8, detail: `${txCount} transactions in database` });
  }

  // Many counterparties signal
  if (uniquePeers >= 20) {
    score += 5;
    signals.push({ signal: 'Many unique counterparties', impact: +5, detail: `${uniquePeers} unique wallet interactions` });
  }

  // No data signal
  if (txCount === 0 && !tag) {
    signals.push({
      signal: 'No transaction data',
      impact: 0,
      detail: 'Wallet not yet ingested — trigger ingestion for accurate scoring',
    });
  }

  // ── Clamp score 0-100 ─────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  const category = score >= 75 ? 'Critical'
                 : score >= 50 ? 'High Risk'
                 : score >= 25 ? 'Suspicious'
                 : 'Clean';

  const riskLabel = score >= 75 ? 'High Risk'
                  : score >= 40 ? 'Medium Risk'
                  : 'Low Risk';

  // ── Store in PostgreSQL ───────────────────────────────────────────────────
  await pool.query(`
    INSERT INTO risk_scores (wallet, score, signals, tx_count, total_volume, last_updated)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (wallet) DO UPDATE
      SET score = $2, signals = $3, tx_count = $4, total_volume = $5, last_updated = NOW()
  `, [addr, score, JSON.stringify(signals), txCount, totalVol]);

  return {
    score,
    category,
    riskLabel,
    signals,
    txCount,
    totalVolume:        totalVol,
    tagInfo:            tag || null,
    taggedInteractions: taggedInteractions.slice(0, 5),
  };
}

export async function getRiskScore(wallet, chain, forceRecompute = false) {
  const addr = wallet.toLowerCase();

  if (!forceRecompute) {
    const cached = await pool.query(
      `SELECT * FROM risk_scores WHERE wallet = $1
       AND last_updated > NOW() - INTERVAL '1 hour'`,
      [addr]
    );
    if (cached.rows.length > 0) {
      const r = cached.rows[0];
      return {
        score:       r.score,
        category:    r.score >= 75 ? 'Critical' : r.score >= 50 ? 'High Risk' : r.score >= 25 ? 'Suspicious' : 'Clean',
        riskLabel:   r.score >= 75 ? 'High Risk' : r.score >= 40 ? 'Medium Risk' : 'Low Risk',
        signals:     r.signals || [],
        txCount:     r.tx_count,
        totalVolume: parseFloat(r.total_volume),
        cached:      true,
      };
    }
  }

  return computeRiskScore(wallet, chain);
}