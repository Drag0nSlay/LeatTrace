import React, { useState, useEffect } from "react";
import GraphVisualizer from "./components/GraphVisualizer";
import RiskPanel from "./components/RiskPanel";
import MonitorPanel from "./components/MonitorPanel";
import ReportView from "./components/ReportView";
import AntigravityResearch from "./components/AntigravityResearch";
import { checkChainMatch, cleanIngestError } from "./chainDetect";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("leatrace_token");
}

function saveToken(token) {
  localStorage.setItem("leatrace_token", token);
}

// Every API call goes through this — adds the JWT header automatically
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });

  // If 401, token expired — clear it so the login screen appears
  if (res.status === 401) {
    localStorage.removeItem("leatrace_token");
    window.location.reload();
    throw new Error("Session expired. Please log in again.");
  }

  return res;
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      saveToken(data.token);
      onLogin(data.username, data.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-dark, #0a0f1e)",
      }}
    >
      <div
        className="glass-panel"
        style={{ padding: "2.5rem", width: "100%", maxWidth: "380px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="brand-logo-icon" style={{ margin: "0 auto 0.75rem" }}>
            LT
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 800,
            }}
          >
            LEATrace
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Blockchain Forensic Platform
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div className="form-group">
            <label className="input-label">Username</label>
            <input
              className="text-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="input-label">Password</label>
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p
              style={{
                color: "var(--risk-high)",
                fontSize: "0.82rem",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "🔐 Sign In"}
          </button>
        </form>

        <p
          style={{
            color: "var(--text-dark)",
            fontSize: "0.75rem",
            textAlign: "center",
            marginTop: "1.5rem",
          }}
        >
          Default: admin / leattrace2026
        </p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(getToken());
  const [username, setUsername] = useState("admin");
  const [activeTab, setActiveTab] = useState("dashboard");

  // Search state
  const [searchChain, setSearchChain] = useState("ETH");
  const [searchAddress, setSearchAddress] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [chainAutoSwitched, setChainAutoSwitched] = useState(false);

  // Data state
  const [tracedData, setTracedData] = useState(null);
  const [history, setHistory] = useState([]);
  const [cases, setCases] = useState([]);
  const [alertLogs, setAlertLogs] = useState([]);
  const [stats, setStats] = useState({
    totalTracedVolume: {
      BTC: 0,
      ETH: 0,
      SOL: 0,
      BSC: 0,
      POL: 0,
      ADA: 0,
      AVAX: 0,
    },
    flaggedAddressesCount: 0,
    monitoredAddressesCount: 0,
    activeAlertTriggered: 0,
    complianceScore: 100,
    recentInvestigations: 0,
  });

  // ── Login handler ───────────────────────────────────────────────────────────
  const handleLogin = (user) => {
    setUsername(user);
    setToken(getToken());
  };

  const handleLogout = () => {
    localStorage.removeItem("leatrace_token");
    setToken(null);
  };

  // ── Data fetching (all use apiFetch with token) ─────────────────────────────
  const fetchStats = async () => {
    try {
      const res = await apiFetch("/api/stats");
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error("fetchStats:", e.message);
    }
  };

  const fetchCases = async () => {
    try {
      const res = await apiFetch("/api/cases");
      if (res.ok) setCases(await res.json());
    } catch (e) {
      console.error("fetchCases:", e.message);
    }
  };

  const fetchAlertLogs = async () => {
    try {
      const res = await apiFetch("/api/monitor/logs");
      if (res.ok) setAlertLogs(await res.json());
    } catch (e) {
      console.error("fetchAlertLogs:", e.message);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchCases();
    fetchAlertLogs();

    const interval = setInterval(() => {
      fetchAlertLogs();
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // ── Address input change: auto-detect chain from format ─────────────────────
  // If the address the user is typing/pasting clearly matches a different
  // chain than what's selected in the dropdown, silently switch the dropdown
  // to the detected chain so the ingest call below doesn't fail.
  const handleAddressChange = (value) => {
    setSearchAddress(value);
    setErrorMessage("");

    const result = checkChainMatch(searchChain, value);
    if (result.mismatch && result.suggested) {
      setSearchChain(result.suggested);
      setChainAutoSwitched(true);
    } else {
      setChainAutoSwitched(false);
    }
  };

  // ── Trace address ───────────────────────────────────────────────────────────
  const handleSearch = async (addr, chainInput) => {
    const targetAddress = addr || searchAddress;
    let targetChain = chainInput || searchChain;

    if (!targetAddress || targetAddress.trim().length < 10) {
      setErrorMessage(
        "Please enter a valid blockchain address (min 10 characters).",
      );
      return;
    }

    // Final safety net: re-check chain match right before the API calls,
    // in case this was triggered via Enter key / suggestion click rather
    // than the onChange handler above.
    const matchResult = checkChainMatch(targetChain, targetAddress);
    if (matchResult.mismatch && matchResult.suggested) {
      targetChain = matchResult.suggested;
      setSearchChain(matchResult.suggested);
      setChainAutoSwitched(true);
    }

    setErrorMessage("");
    setSearchLoading(true);

    try {
      // Phase 1: use the new ingestion endpoint to pull live data first,
      // then fall back to the legacy trace endpoint for the graph view.
      const chain =
        targetChain === "ETH"
          ? "ethereum"
          : targetChain === "BTC"
            ? "bitcoin"
            : null;

      // If it's ETH or BTC, ingest live data into PostgreSQL first
      if (chain) {
        const ingestRes = await apiFetch("/api/ingest", {
          method: "POST",
          body: JSON.stringify({ wallet: targetAddress, chain, limit: 50 }),
        });

        if (!ingestRes.ok) {
          let rawError = "";
          try {
            const ingestErrBody = await ingestRes.json();
            rawError = ingestErrBody.error || "";
          } catch {
            // ignore body parse failure, fall through to generic message
          }
          throw new Error(cleanIngestError(rawError, targetChain, targetAddress));
        }
      }

      // Then call the existing trace endpoint for graph/risk data
      const response = await apiFetch(
        `/api/trace/address/${targetChain}/${targetAddress}`,
      );
      if (!response.ok) {
        let rawError = "";
        try {
          const error = await response.json();
          rawError = error.error || "";
        } catch {
          // ignore body parse failure
        }
        throw new Error(cleanIngestError(rawError, targetChain, targetAddress));
      }
      const data = await response.json();
      setTracedData(data);

      const key = `${targetChain}-${targetAddress}`;
      if (!history.some((item) => `${item.chain}-${item.address}` === key)) {
        setHistory((prev) => [
          {
            chain: targetChain,
            address: targetAddress,
            alias: data.details?.name || targetAddress.slice(0, 8) + "...",
            riskScore: data.details?.riskScore || 0,
          },
          ...prev.slice(0, 9),
        ]);
      }

      setActiveTab("explorer");
    } catch (err) {
      setErrorMessage(err.message || "Error occurred querying API.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSuggestionClick = (addr, chain) => {
    setSearchAddress(addr);
    setSearchChain(chain);
    setChainAutoSwitched(false);
    handleSearch(addr, chain);
  };

  const triggerSimulation = async () => {
    try {
      const response = await apiFetch("/api/monitor/simulate", {
        method: "POST",
      });
      const data = await response.json();
      if (data.triggered) {
        fetchAlertLogs();
        fetchStats();
      } else alert(data.message || "No active monitor addresses.");
    } catch (e) {
      console.error(e);
    }
  };

  const saveCurrentCase = async () => {
    if (!tracedData) return;
    const name = prompt(
      "Enter investigation case name:",
      `Case - ${tracedData.details?.name || tracedData.address}`,
    );
    if (!name) return;
    try {
      const response = await apiFetch("/api/cases", {
        method: "POST",
        body: JSON.stringify({
          name,
          chain: tracedData.chain,
          target: tracedData.address,
          notes: `Traced address risk category: ${tracedData.metrics?.riskAnalysis?.category || "Unknown"}`,
        }),
      });
      if (response.ok) fetchCases();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Show login screen if no token ───────────────────────────────────────────
  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ── Main UI (unchanged from your original, just replaced fetch → apiFetch) ──
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo-icon">LT</div>
          <h1 className="brand-name">Leat Trace</h1>
          <span className="brand-tag">Compliance v2.4</span>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            📊 Command Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === "explorer" ? "active" : ""}`}
            onClick={() => setActiveTab("explorer")}
          >
            🕸️ Trace Graph Explorer
          </button>
          <button
            className={`nav-btn ${activeTab === "monitoring" ? "active" : ""}`}
            onClick={() => setActiveTab("monitoring")}
          >
            🔔 Realtime Monitoring
          </button>
          <button
            className={`nav-btn ${activeTab === "compliance" ? "active" : ""}`}
            onClick={() => setActiveTab("compliance")}
          >
            📋 Compliance Reports
          </button>
          <button
            className={`nav-btn ${activeTab === "antigravity" ? "active" : ""}`}
            onClick={() => setActiveTab("antigravity")}
          >
            ⚛️ Gravity Lab & Reports
          </button>
        </nav>

        <div
          className="user-badge"
          style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
        >
          <div className="user-dot"></div>
          <span className="user-role">{username} (Compliance Officer)</span>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid var(--border-light)",
              color: "var(--text-muted)",
              borderRadius: "4px",
              padding: "0.2rem 0.6rem",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Left Sidebar */}
        <aside className="glass-panel search-sidebar">
          <div className="sidebar-section">
            <h2 className="sidebar-title">Risk Query Solver</h2>

            <div className="form-group">
              <label className="input-label">Select Blockchain</label>
              <select
                className="select-input"
                value={searchChain}
                onChange={(e) => {
                  setSearchChain(e.target.value);
                  setChainAutoSwitched(false);
                }}
              >
                <option value="ETH">Ethereum (ETH)</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="SOL">Solana (SOL)</option>
                <option value="BSC">Binance Smart Chain (BSC)</option>
                <option value="POL">Polygon (POL)</option>
                <option value="ADA">Cardano (ADA)</option>
                <option value="AVAX">Avalanche (AVAX)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="input-label">Target Wallet Address</label>
              <input
                type="text"
                className="text-input"
                placeholder="Enter address..."
                value={searchAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            {chainAutoSwitched && !errorMessage && (
              <p
                style={{
                  color: "var(--color-primary)",
                  fontSize: "0.78rem",
                  margin: 0,
                }}
              >
                ℹ️ Detected a {searchChain} address — chain switched
                automatically.
              </p>
            )}

            {errorMessage && (
              <p style={{ color: "var(--risk-high)", fontSize: "0.8rem" }}>
                {errorMessage}
              </p>
            )}

            <button
              className="btn-primary"
              onClick={() => handleSearch()}
              disabled={searchLoading}
            >
              {searchLoading ? "Resolving Hops..." : "🔎 Trace Address"}
            </button>
          </div>

          <div
            className="sidebar-section"
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <h2 className="sidebar-title">Recent Traces</h2>
            <div className="history-list">
              {history.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-dark)",
                    fontSize: "0.8rem",
                    fontStyle: "italic",
                    textAlign: "center",
                    marginTop: "1rem",
                  }}
                >
                  No recent investigations.
                </p>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={idx}
                    className="history-card"
                    onClick={() =>
                      handleSuggestionClick(item.address, item.chain)
                    }
                  >
                    <div className="history-info">
                      <span className="history-alias">{item.alias}</span>
                      <span
                        className="history-badge"
                        style={{
                          background:
                            item.riskScore >= 75
                              ? "rgba(239,68,68,0.15)"
                              : item.riskScore >= 40
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(16,185,129,0.15)",
                          color:
                            item.riskScore >= 75
                              ? "var(--risk-high)"
                              : item.riskScore >= 40
                                ? "var(--risk-medium)"
                                : "var(--risk-low)",
                        }}
                      >
                        Risk {item.riskScore}%
                      </span>
                    </div>
                    <div className="history-address">
                      {item.chain}: {item.address}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h2 className="sidebar-title">Active Investigations</h2>
            <div className="history-list" style={{ maxHeight: "150px" }}>
              {cases.map((c, idx) => (
                <div
                  key={idx}
                  className="history-card"
                  style={{ borderLeft: "3px solid var(--color-primary)" }}
                  onClick={() => handleSuggestionClick(c.target, c.chain)}
                >
                  <div className="history-info">
                    <span
                      className="history-alias"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {c.name}
                    </span>
                  </div>
                  <div className="history-address">
                    {c.chain}: {c.target}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main area */}
        <main style={{ minWidth: 0 }}>
          {activeTab === "dashboard" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div className="stats-overview-grid">
                <div className="glass-panel stat-card">
                  <div className="stat-icon">📈</div>
                  <div className="stat-info">
                    <span className="stat-label">
                      Traced Volume ({searchChain})
                    </span>
                    <span className="stat-value">
                      {(
                        (stats.totalTracedVolume &&
                          stats.totalTracedVolume[searchChain]) ||
                        0
                      ).toLocaleString()}{" "}
                      {searchChain}
                    </span>
                  </div>
                </div>
                <div
                  className="glass-panel stat-card"
                  style={{ borderLeft: "3px solid var(--risk-high)" }}
                >
                  <div
                    className="stat-icon"
                    style={{ color: "var(--risk-high)" }}
                  >
                    ⚠️
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">
                      Flagged High-Risk Wallets
                    </span>
                    <span className="stat-value">
                      {stats.flaggedAddressesCount}
                    </span>
                  </div>
                </div>
                <div className="glass-panel stat-card">
                  <div
                    className="stat-icon"
                    style={{ color: "var(--color-primary)" }}
                  >
                    🔔
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Monitored Wallets</span>
                    <span className="stat-value">
                      {stats.monitoredAddressesCount} Rules
                    </span>
                  </div>
                </div>
                <div className="glass-panel stat-card">
                  <div
                    className="stat-icon"
                    style={{ color: "var(--risk-medium)" }}
                  >
                    🛡️
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">AML Compliance Score</span>
                    <span className="stat-value">{stats.complianceScore}%</span>
                  </div>
                </div>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: "1.5rem",
                  background:
                    "linear-gradient(135deg, rgba(13,20,38,0.9) 0%, rgba(20,10,50,0.4) 100%)",
                  border: "1px solid var(--border-accent)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: "1.25rem",
                        marginBottom: "0.25rem",
                        color: "var(--color-primary)",
                      }}
                    >
                      AML Transaction Simulation Engine
                    </h3>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      Force block listeners to run checks on target rules.
                      Instantly generates simulated multi-hop transfers to
                      trigger alarms.
                    </p>
                  </div>
                  <button className="btn-primary" onClick={triggerSimulation}>
                    🚀 Simulate Block Event
                  </button>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    marginBottom: "1rem",
                    borderBottom: "1px solid var(--border-light)",
                    paddingBottom: "0.5rem",
                  }}
                >
                  💡 Demo Investigation Targets (Select to Trace)
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  <div
                    className="history-card"
                    style={{
                      border: "1px solid rgba(239,68,68,0.2)",
                      padding: "1rem",
                    }}
                    onClick={() =>
                      handleSuggestionClick(
                        "1ptfNYmSARufBvBZFqYZ1KY2tNCL69pZJ",
                        "BTC",
                      )
                    }
                  >
                    <h4 style={{ color: "var(--risk-high)", fontWeight: 700 }}>
                      🔴 BTC LockBit Ransomware
                    </h4>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        margin: "0.25rem 0",
                      }}
                    >
                      Showcases a dynamic peeling chain where extorted Bitcoin
                      is laundered down.
                    </p>
                    <code style={{ fontSize: "0.75rem", color: "#fff" }}>
                      1ptfNYmSARufBvBZFqYZ1KY2tNCL69pZJ
                    </code>
                  </div>
                  <div
                    className="history-card"
                    style={{
                      border: "1px solid rgba(245,158,11,0.2)",
                      padding: "1rem",
                    }}
                    onClick={() =>
                      handleSuggestionClick(
                        "0x722122df12d4e14e13ac3b6895a86e84145b6967",
                        "ETH",
                      )
                    }
                  >
                    <h4
                      style={{ color: "var(--risk-medium)", fontWeight: 700 }}
                    >
                      🟡 ETH Tornado Cash Router
                    </h4>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        margin: "0.25rem 0",
                      }}
                    >
                      Traces funds routed through an automated sanctioned
                      privacy pool.
                    </p>
                    <code style={{ fontSize: "0.75rem", color: "#fff" }}>
                      0x71c20e241775e5332...f143789a71b
                    </code>
                  </div>
                  <div
                    className="history-card"
                    style={{
                      border: "1px solid rgba(0,242,254,0.2)",
                      padding: "1rem",
                    }}
                    onClick={() =>
                      handleSuggestionClick(
                        "HN7c5P28vPj3p83Vz18djs83hV9as8a8d11c8eD",
                        "SOL",
                      )
                    }
                  >
                    <h4
                      style={{ color: "var(--color-primary)", fontWeight: 700 }}
                    >
                      🔵 SOL Mango Markets Exploiter
                    </h4>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        margin: "0.25rem 0",
                      }}
                    >
                      Solana network asset routing layout following a
                      large-scale DeFi exploit.
                    </p>
                    <code style={{ fontSize: "0.75rem", color: "#fff" }}>
                      HN7c5P28vPj3p83Vz18djs83hV9as8a8d11c8eD
                    </code>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  🚨 Real-Time Compliance Alarms
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Risk Level</th>
                        <th>Network</th>
                        <th>Address</th>
                        <th>Alert Trigger Message</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            style={{
                              textAlign: "center",
                              padding: "2rem",
                              color: "var(--text-dark)",
                            }}
                          >
                            No alerts triggered. Set rules in "Realtime
                            Monitoring".
                          </td>
                        </tr>
                      ) : (
                        alertLogs.map((log) => (
                          <tr key={log.id}>
                            <td>
                              <span className={`severity-tag ${log.severity}`}>
                                {log.severity === "critical"
                                  ? "🔴 Critical"
                                  : "🟡 Warning"}
                              </span>
                            </td>
                            <td>
                              <strong>{log.chain}</strong>
                            </td>
                            <td>
                              <a
                                href="#"
                                className="addr-link"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSuggestionClick(log.address, log.chain);
                                }}
                              >
                                {log.address.slice(0, 10)}...
                                {log.address.slice(-6)}
                              </a>
                            </td>
                            <td>{log.message}</td>
                            <td style={{ color: "var(--text-muted)" }}>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "explorer" && (
            <div className="trace-workspace">
              {tracedData ? (
                <>
                  <div className="glass-panel graph-container">
                    <div className="graph-header">
                      <div>
                        <span className="graph-title">
                          🌐 Multi-Hop Money-Flow Map
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            marginLeft: "1rem",
                          }}
                        >
                          Traced:{" "}
                          <code
                            style={{
                              color: "var(--color-primary)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {tracedData.address}
                          </code>
                        </span>
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                        onClick={saveCurrentCase}
                      >
                        💾 Pin to Active Cases
                      </button>
                    </div>
                    <div className="graph-canvas-wrapper">
                      <GraphVisualizer
                        graph={tracedData.graph}
                        rootAddress={tracedData.address}
                      />
                    </div>
                  </div>
                  <div className="analysis-sidebar">
                    <RiskPanel
                      riskData={tracedData}
                      onNodeClick={(addr) =>
                        handleSearch(addr, tracedData.chain)
                      }
                    />
                  </div>
                </>
              ) : (
                <div
                  className="glass-panel"
                  style={{
                    padding: "4rem 2rem",
                    textAlign: "center",
                    gridColumn: "span 2",
                  }}
                >
                  <span style={{ fontSize: "3rem" }}>🕸️</span>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      margin: "1rem 0",
                    }}
                  >
                    Interactive Trace Visualization
                  </h3>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      maxWidth: "500px",
                      margin: "0 auto",
                    }}
                  >
                    Query a wallet address in the left sidebar to generate
                    automated traces, map payment flow networks, compute AML
                    metrics, and audit peeling hops.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "monitoring" && (
            <MonitorPanel
              alertLogs={alertLogs}
              onAddressSelect={handleSuggestionClick}
              onSimulationTrigger={triggerSimulation}
              fetchAlertLogs={fetchAlertLogs}
            />
          )}
          {activeTab === "compliance" && (
            <ReportView
              tracedData={tracedData}
              cases={cases}
              onLoadCase={handleSuggestionClick}
            />
          )}
          {activeTab === "antigravity" && <AntigravityResearch />}
        </main>
      </div>
    </div>
  );
}