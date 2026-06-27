import React, { useState } from 'react';

// ── Data normalizer — UI never touches raw backend shape directly ─────────────
function normalizeRiskData(raw) {
  const details    = raw?.details    || {};
  const metrics    = raw?.metrics    || {};
  const txStats    = metrics?.txStats || {};
  const riskAnalysis = metrics?.riskAnalysis || {};
  const graph      = raw?.graph      || {};
  const nodes      = graph?.nodes    || [];
  const signals    = riskAnalysis?.signals || [];

  const score = Math.min(Math.max(Number(details?.riskScore) || 0, 0), 100);

  const format = (val) =>
    val != null && val !== '' && !isNaN(val)
      ? Number(val).toLocaleString(undefined, { maximumFractionDigits: 6 })
      : null;

  return {
    score,
    name:             details?.name           || 'Unknown',
    type:             details?.type           || 'Unknown',
    tag:              details?.tag            || null,
    tagDescription:   details?.tagDescription || null,
    chain:            raw?.chain              || '',
    address:          raw?.address            || '',

    // Tx stats from PostgreSQL
    totalReceived:    format(txStats?.totalReceived),
    totalSent:        format(txStats?.totalSent),
    totalVolume:      format(txStats?.totalVolume),
    maxSingleTx:      format(txStats?.maxSingleTx),
    txCount:          txStats?.totalTx        || 0,
    firstSeen:        txStats?.firstSeen      || null,
    lastSeen:         txStats?.lastSeen       || null,

    // Balance = received - sent
    balance: (txStats?.totalReceived != null && txStats?.totalSent != null)
      ? format(Math.max(0, parseFloat(txStats.totalReceived) - parseFloat(txStats.totalSent)))
      : null,

    // Risk analysis
    category:          riskAnalysis?.category         || 'Unknown',
    directExposure:    riskAnalysis?.directExposure   || 'None detected',
    indirectExposure:  riskAnalysis?.indirectExposure || 'None detected',
    signals,

    // Graph
    nodes,
    totalHops:   graph?.totalHops  || 0,
    totalNodes:  graph?.totalNodes || nodes.length,
    taggedNodes: graph?.taggedNodes || nodes.filter(n => n.tag).length,
  };
}

// ── Risk helpers ──────────────────────────────────────────────────────────────
const THRESHOLDS = { critical: 85, high: 60, medium: 25 };

function getRiskColor(score) {
  if (score >= THRESHOLDS.high)   return 'var(--risk-high)';
  if (score >= THRESHOLDS.medium) return 'var(--risk-medium)';
  return 'var(--risk-low)';
}

function getRiskLabel(score) {
  if (score >= THRESHOLDS.critical) return 'CRITICAL / HIGH-RISK DECENTRALIZED MIXER';
  if (score >= THRESHOLDS.high)     return 'HIGH RISK / AML ALERT';
  if (score >= THRESHOLDS.medium)   return 'MEDIUM RISK / MONITOR';
  return 'LOW RISK / COMPLIANT';
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RiskPanel({ riskData, onNodeClick }) {
  // CHANGE 1: selectedNodeId state added for highlight tracking
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Loading state
  if (!riskData || !riskData.details) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Loading risk analysis...
        </p>
      </div>
    );
  }

  const d = normalizeRiskData(riskData);
  const { score } = d;

  // SVG gauge
  const radius       = 50;
  const circumference = 2 * Math.PI * radius;
  const offset       = circumference - (score / 100) * circumference;
  const riskColor    = getRiskColor(score);

  // Row helper
  const Row = ({ label, value, color, mono }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</span>
      <span style={{
        fontWeight: value != null ? 700 : 400,
        fontSize: '0.85rem',
        color: color || (value != null ? '#fff' : 'var(--text-dark)'),
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        fontStyle: value == null ? 'italic' : undefined,
      }}>
        {value != null ? value : 'No data yet'}
      </span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── 1. Risk Gauge ─────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="card-header">🛡️ AML Risk Evaluation</div>
        <div className="card-body">
          <div className="risk-gauge-container">
            <svg className="risk-circle-svg" viewBox="0 0 120 120">
              <circle className="risk-circle-bg" cx="60" cy="60" r={radius} />
              <circle
                className="risk-circle-value"
                cx="60" cy="60" r={radius}
                stroke={riskColor}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
              />
            </svg>
            <div className="risk-score-text">
              <span className="risk-number" style={{ color: riskColor }}>{score}</span>
              <span className="risk-percent">SCORE</span>
            </div>
          </div>

          <div className="risk-label-badge" style={{
            background: score >= THRESHOLDS.high   ? 'rgba(239,68,68,0.15)'
                      : score >= THRESHOLDS.medium ? 'rgba(245,158,11,0.15)'
                      : 'rgba(16,185,129,0.15)',
            color:  riskColor,
            border: `1px solid ${riskColor}`,
          }}>
            {getRiskLabel(score)}
          </div>

          {/* Tag badge — shows OFAC / scam label if present */}
          {d.tag && (
            <div style={{
              marginTop: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '4px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid var(--risk-high)',
              fontSize: '0.75rem', color: 'var(--risk-high)', textAlign: 'center', fontWeight: 700,
            }}>
              ⚠️ {d.tag}
              {d.tagDescription && (
                <div style={{ fontWeight: 400, color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {d.tagDescription}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Wallet Profile Dossier ─────────────────────────────────────── */}
      <div className="glass-panel">
        <div className="card-header">📊 Wallet Profile Dossier</div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

          <Row label="Entity Label"    value={d.name} />
          <Row label="Entity Category" value={d.type} color={riskColor} />
          <Row label="Total Received"  value={d.totalReceived ? `${d.totalReceived} ${d.chain}` : null} mono />
          <Row label="Total Sent"      value={d.totalSent     ? `${d.totalSent} ${d.chain}`     : null} mono />
          <Row label="Available Balance" value={d.balance     ? `${d.balance} ${d.chain}`       : null}
               color="var(--color-primary)" mono />
          <Row label="Total Transactions" value={d.txCount > 0 ? d.txCount.toString() : null} />
          <Row label="Max Single Tx"   value={d.maxSingleTx  ? `${d.maxSingleTx} ${d.chain}`   : null} mono />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Traced Hops:</span>
            <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>
              {d.totalHops > 0 ? `${d.totalHops} Levels` : '4 Levels Evaluated'}
            </span>
          </div>

          {d.firstSeen && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>First Seen:</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {new Date(d.firstSeen).toLocaleDateString()}
              </span>
            </div>
          )}
          {d.lastSeen && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Last Active:</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {new Date(d.lastSeen).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. AML / CTF Alert Triggers ───────────────────────────────────── */}
      <div className="glass-panel">
        <div className="card-header">🛡️ AML / CTF Alert Triggers</div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Real signals from scoring engine */}
          {d.signals.length > 0 ? (
            d.signals.map((sig, idx) => (
              <div key={idx} style={{
                padding: '0.75rem', borderRadius: '6px',
                background: sig.impact >= 40 ? 'rgba(239,68,68,0.08)'
                          : sig.impact >= 20 ? 'rgba(245,158,11,0.08)'
                          : sig.impact < 0   ? 'rgba(16,185,129,0.08)'
                          : 'rgba(255,255,255,0.02)',
                borderLeft: `3px solid ${
                  sig.impact >= 40 ? 'var(--risk-high)'
                : sig.impact >= 20 ? 'var(--risk-medium)'
                : sig.impact < 0   ? 'var(--risk-low)'
                : 'var(--border-light)'}`,
                fontSize: '0.8rem',
              }}>
                <h5 style={{
                  fontWeight: 700, marginBottom: '0.25rem',
                  color: sig.impact >= 40 ? 'var(--risk-high)'
                       : sig.impact >= 20 ? 'var(--risk-medium)'
                       : sig.impact < 0   ? 'var(--risk-low)'
                       : '#fff',
                }}>
                  {sig.impact > 0 ? `+${sig.impact}` : sig.impact} — {sig.signal}
                </h5>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{sig.detail}</p>
              </div>
            ))
          ) : (
            <>
              {/* Fallback static display when no signals yet */}
              <div style={{
                padding: '0.75rem', borderRadius: '6px',
                background: score >= 75 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                borderLeft: `3px solid ${score >= 75 ? 'var(--risk-high)' : 'var(--border-light)'}`,
                fontSize: '0.8rem',
              }}>
                <h5 style={{ fontWeight: 700, marginBottom: '0.1rem', color: score >= 75 ? 'var(--risk-high)' : '#fff' }}>
                  Mixer Smart Contract Exposure
                </h5>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{d.directExposure}</p>
              </div>

              <div style={{
                padding: '0.75rem', borderRadius: '6px',
                background: score >= 40 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
                borderLeft: `3px solid ${score >= 40 ? 'var(--risk-medium)' : 'var(--border-light)'}`,
                fontSize: '0.8rem',
              }}>
                <h5 style={{ fontWeight: 700, marginBottom: '0.1rem', color: score >= 40 ? 'var(--risk-medium)' : 'var(--text-muted)' }}>
                  Indirect Entity Exposure
                </h5>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{d.indirectExposure}</p>
              </div>

              <div style={{
                padding: '0.75rem', borderRadius: '6px',
                background: 'rgba(255,255,255,0.02)',
                borderLeft: '3px solid var(--border-light)',
                fontSize: '0.8rem',
              }}>
                <h5 style={{ fontWeight: 700, marginBottom: '0.1rem' }}>Peeling Chain Behavior</h5>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                  {d.txCount > 10 ? `${d.txCount} transactions detected — pattern analysis pending.` : 'No peeling structure identified.'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 4. Immediate Flow Nodes ───────────────────────────────────────── */}
      {d.nodes.length > 0 && (
        <div className="glass-panel">
          <div className="card-header">🔗 Immediate Flow Nodes</div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {d.nodes.slice(0, 8).map((n, idx) => (
              <div
                key={idx}
                // CHANGE 2: also set selectedNodeId on click
                onClick={() => { setSelectedNodeId(n.id); onNodeClick?.(n.id); }}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                  // CHANGE 3: highlight background, border, shadow when selected
                  background: selectedNodeId === n.id
                    ? 'rgba(0,242,254,0.08)'
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${
                    selectedNodeId === n.id     ? '#00f2fe'
                  : n.riskLevel === 'critical'  ? 'rgba(239,68,68,0.4)'
                  : n.riskLevel === 'high'      ? 'rgba(245,158,11,0.4)'
                  : n.isRoot                    ? 'var(--color-primary)'
                  : 'var(--border-light)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '0.78rem',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedNodeId === n.id ? '0 0 8px rgba(0,242,254,0.3)' : 'none',
                }}
              >
                <code style={{
                  fontFamily: 'var(--font-mono)',
                  // CHANGE 3 cont: text color + weight when selected
                  color: selectedNodeId === n.id ? '#00f2fe' : n.isRoot ? 'var(--color-primary)' : '#fff',
                  fontWeight: selectedNodeId === n.id ? 700 : 400,
                }}>
                  {n.id ? `${n.id.slice(0, 10)}...${n.id.slice(-6)}` : n.label}
                </code>
                {n.tag ? (
                  <span style={{
                    fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '3px',
                    background: 'rgba(239,68,68,0.15)', color: 'var(--risk-high)', fontWeight: 700,
                  }}>
                    {n.tag}
                  </span>
                ) : n.isRoot ? (
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 700 }}>TARGET</span>
                ) : null}
              </div>
            ))}
            {d.nodes.length > 8 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.25rem 0 0' }}>
                +{d.nodes.length - 8} more nodes in graph
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}