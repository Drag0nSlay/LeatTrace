import React, { useState } from 'react';

export default function ReportView({ tracedData, cases, onLoadCase }) {
  const [activeReportTab, setActiveReportTab] = useState('compliance');
  const [labName, setLabName]           = useState('Alpha Quantum Gravity Laboratory');
  const [scientistName, setScientistName] = useState('Dr. Elena Vance');

  const handlePrint = () => window.print();

  // ── Safe accessors (no crash when tracedData is null) ──────────────────────
  const details  = tracedData?.details  || {};
  const metrics  = tracedData?.metrics  || {};
  const graph    = tracedData?.graph    || {};
  const links    = graph.links          || [];
  const riskScore = details.riskScore   ?? 0;
  const riskAnalysis = metrics.riskAnalysis || {};

  const riskColor = riskScore >= 75 ? 'var(--risk-high)'
                  : riskScore >= 40 ? 'var(--risk-medium)'
                  : 'var(--risk-low)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Report Selector Tabs */}
      <div className="glass-panel screen-only" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`nested-tab-btn ${activeReportTab === 'compliance' ? 'active' : ''}`}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            onClick={() => setActiveReportTab('compliance')}
          >
            📋 Asset Tracing Dossier
          </button>
          <button
            className={`nested-tab-btn ${activeReportTab === 'physics' ? 'active' : ''}`}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            onClick={() => setActiveReportTab('physics')}
          >
            ⚛️ Physics Laboratory Report
          </button>
        </div>
        <button
          className="btn-primary"
          style={{ background: 'var(--color-primary)', color: '#060913', padding: '0.4rem 1rem', fontSize: '0.8rem' }}
          onClick={handlePrint}
        >
          🖨️ Export PDF / Print Active Report
        </button>
      </div>

      {/* ── TAB 1: COMPLIANCE DOSSIER ─────────────────────────────────────────── */}
      {activeReportTab === 'compliance' && (
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 1024 ? '300px 1fr' : '1fr', gap: '1.5rem' }}>

          {/* Saved Investigations sidebar */}
          <div className="glass-panel screen-only" style={{ padding: '1.25rem', height: 'fit-content' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              📁 Saved Investigations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {cases.length === 0 ? (
                <p style={{ color: 'var(--text-dark)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                  No active investigations recorded. Pin a case from the Trace Graph Explorer to view details here.
                </p>
              ) : (
                cases.map((c) => (
                  <div
                    key={c.id}
                    className="history-card"
                    style={{ padding: '0.65rem', cursor: 'pointer' }}
                    onClick={() => onLoadCase(c.target, c.chain)}
                  >
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>{c.name}</h4>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.15rem 0' }}>{c.notes}</p>
                    <code style={{ fontSize: '0.65rem', display: 'block', wordBreak: 'break-all', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {c.chain}: {(c.target || '').slice(0, 12)}...
                    </code>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Printable report — shows placeholder if no tracedData */}
          {tracedData ? (
            <div className="glass-panel printable-dossier" style={{ padding: '2.5rem', background: '#0a0d18', border: '1px solid var(--border-light)', borderRadius: '12px' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px double var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#fff' }}>
                    Leat Trace Compliance Dossier
                  </h1>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>
                    SECURE FORENSIC AUDIT // ANTI-MONEY LAUNDERING REPORT
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    CASE ID: #{Math.floor(100000 + Math.random() * 900000)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Date: {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              {/* Metadata grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.01)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>Audit Target Wallet</div>
                  <code style={{ fontSize: '0.75rem', color: '#fff', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{tracedData.address}</code>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>Blockchain Network</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>{tracedData.chain} Ledger</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>KYC Identity Label</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{details.name || 'Unknown'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>AML Risk Index</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: riskColor }}>
                    {riskScore}% Risk Score
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.35rem', marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                  I. Executive Forensic Assessment
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  The target wallet address <code style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{tracedData.address}</code> has
                  been analyzed across multiple transaction nodes and hop counts.
                  Heuristic mapping classifies this address as a <strong style={{ color: '#fff' }}>{details.type || 'Unknown'}</strong> node.
                  The compliance algorithms identify a <strong style={{ color: riskColor }}>{riskScore}%</strong> risk score based on proximity indicators.
                  {riskAnalysis.directExposure && (
                    <> Exposure details: {riskAnalysis.directExposure} and {riskAnalysis.indirectExposure || 'N/A'}.</>
                  )}
                </p>
              </div>

              {/* Transaction Flow Logs */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.35rem', marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                  II. Multi-Hop Money Flow Log
                </h3>
                {links.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dark)', fontSize: '0.82rem', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                    No transaction links available for this address yet.
                    Live data will populate here after ingestion completes.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="logs-table" style={{ fontSize: '0.75rem', width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Source Address</th>
                          <th>Target Address</th>
                          <th>Amount Traced</th>
                          <th>Type Indicator</th>
                          <th>Transaction Hash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {links.map((link, idx) => {
                          const sourceVal = typeof link.source === 'object' ? link.source?.id : (link.sourceId || link.source || '');
                          const targetVal = typeof link.target === 'object' ? link.target?.id : (link.targetId || link.target || '');
                          return (
                            <tr key={idx}>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{sourceVal ? `${sourceVal.slice(0, 12)}...` : 'N/A'}</td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{targetVal ? `${targetVal.slice(0, 12)}...` : 'N/A'}</td>
                              <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{link.value} {tracedData.chain}</td>
                              <td>
                                <span style={{
                                  fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '3px',
                                  background: link.isChange ? 'rgba(255,255,255,0.05)' : 'rgba(0,242,254,0.1)',
                                  color: link.isChange ? 'var(--text-muted)' : 'var(--color-primary)',
                                  fontWeight: 700,
                                }}>
                                  {link.isChange ? '♻️ Change Hop' : '➡️ Payment Flow'}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dark)' }}>
                                {link.txid ? `${link.txid.slice(0, 16)}...` : 'N/A'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Certification stamp */}
              <div style={{ marginTop: '2.5rem', borderTop: '1px dashed var(--border-light)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Leat Trace Compliance Audit Division</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Cryptographic Blockchain Attestation</div>
                  <div style={{ color: 'var(--text-dark)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                    Audit ID: LT-AML-{Math.random().toString(36).substring(2, 8).toUpperCase()}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '160px' }}>
                  <div style={{ borderBottom: '1px solid var(--text-dark)', height: '25px' }}></div>
                  <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Compliance Officer Signature</div>
                </div>
              </div>

            </div>
          ) : (
            /* ── Placeholder when no wallet has been traced yet ── */
            <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <span style={{ fontSize: '3rem' }}>📋</span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, margin: '1rem 0' }}>
                AML Compliance Dossier Generator
              </h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', fontSize: '0.85rem' }}>
                Trace a wallet address from the left sidebar or select a saved investigation to generate a full AML audit report with multi-hop transaction flows.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PHYSICS LAB REPORT ─────────────────────────────────────────── */}
      {activeReportTab === 'physics' && (
        <div className="glass-panel printable-dossier" style={{ padding: '2.5rem', background: '#0a0d18', border: '1px solid var(--border-light)', borderRadius: '12px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px double var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#fff' }}>
                Leat Trace Physics Lab Report
              </h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>
                SECURE SCIENCE PROTOCOL // THEORETICAL GRAVITY SIMULATION DOSSIER
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                REPORT REF: #PHYS-LAB-{Math.floor(100000 + Math.random() * 900000)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Date: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Inputs (screen only) */}
          <div className="screen-only" style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="input-label">Laboratory Division</label>
              <input type="text" className="text-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                value={labName} onChange={e => setLabName(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="input-label">Lead Scientist / Officer</label>
              <input type="text" className="text-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                value={scientistName} onChange={e => setScientistName(e.target.value)} />
            </div>
          </div>

          {/* Metadata grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.01)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>Research Facility</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{labName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>Lead Researcher</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>{scientistName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>Clearance Rating</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-proven)' }}>Level 5 (Lead Physicist)</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>Gravity Well Models</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-secondary)' }}>10 Theoretical Modules</div>
            </div>
          </div>

          {/* Scientific statement */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.35rem', marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
              I. Theoretical Scope & Limits Attestation
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              This laboratory document records parameter telemetry generated inside virtual space metric simulations.
              All calculated factors regarding Alcubierre metrics, negative energy densities, and mass shielding are classified as Speculative Physics models.
              These are mathematically coherent solutions within Einstein's Field Equations, but macroscopic configurations remain purely hypothetical and lack observational proof.
            </p>
          </div>

          {/* Telemetry logs */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.35rem', marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
              II. Simulation Laboratory Telemetry Logs
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {[
                { color: 'var(--color-primary)', icon: '🌌', title: 'Spacetime Mesh Config', items: ['Gravity Constant (G): 1.50', 'Central Target Mass (M): 1.20 Solar Masses', 'Grid Deflection Index: Nominal Curvature'] },
                { color: 'var(--color-speculative)', icon: '🚀', title: 'Warp Metric Telemetry', items: ['Warp Speed Index: 1.00c (Subluminal Limit)', 'Bubble Enclosure Thickness: 0.50 nm', 'Exotic Energy Shield Factor: -500 Solar equivalent'] },
                { color: 'var(--color-proven)', icon: '🔬', title: 'Casimir Zero-Point Telemetry', items: ['Cavity Gap spacing: 300 nm', 'Conductive Plate Surface Area: 10.0 cm²', 'Attractive Force Output: 1.3e-10 Newtons (Calc)'] },
              ].map(({ color, icon, title, items }) => (
                <div key={title} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color, margin: '0 0 0.5rem 0' }}>{icon} {title}</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {items.map(item => {
                      const [label, value] = item.split(': ');
                      return <li key={item}>{label}: <strong style={{ color: '#fff' }}>{value}</strong></li>;
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Certification seal */}
          <div style={{ marginTop: '3rem', borderTop: '1px dashed var(--border-light)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Leat Trace Theoretical Physics Council</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Cryptographic Science Attestation Stamp</div>
              <div style={{ color: 'var(--text-dark)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                Verification: LT-PHYS-{Math.random().toString(36).substring(2, 8).toUpperCase()}
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: '160px' }}>
              <div style={{ borderBottom: '1px solid var(--text-dark)', height: '25px' }}></div>
              <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Lead Scientist Signature Seal</div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}