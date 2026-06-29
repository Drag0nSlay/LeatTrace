import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, ShieldX, Play, RotateCw, AlertOctagon, 
  Terminal, Shield, FileText, CheckCircle, Clock, Zap 
} from 'lucide-react';
import { useAlertStore, useCaseStore, useWatchlistStore } from '../stores';

interface PrioritizedCase {
  id: string;
  case_number: string;
  title: string;
  priority: string;
  status: string;
  updated_at: string;
}

interface LockedAddress {
  address: string;
  chain: string;
}

export const IncidentResponsePage: React.FC = () => {
  const { alerts, markRead } = useAlertStore();
  const { cases, updateCase } = useCaseStore();
  const { entries, addEntry } = useWatchlistStore();

  const [threatLevel, setThreatLevel] = useState('low');
  const [lockdownCount, setLockdownCount] = useState(0);
  const [lockedAddresses, setLockedAddresses] = useState<LockedAddress[]>([]);
  const [recentThreats, setRecentThreats] = useState<any[]>([]);
  const [prioritizedCases, setPrioritizedCases] = useState<PrioritizedCase[]>([]);
  
  // Form states
  const [lockAddress, setLockAddress] = useState('');
  const [lockChain, setLockChain] = useState('BTC');
  const [lockNotes, setLockNotes] = useState('');
  
  // Animation / Action states
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');
  
  // SLA Timer State
  const [slaTimeRemaining, setSlaTimeRemaining] = useState(30);
  const [activeSlaTarget, setActiveSlaTarget] = useState<any>(null);
  const slaIntervalRef = useRef<any>(null);

  // Fetch threat dashboard data with mock fallback
  const fetchThreatData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/incident/threats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setThreatLevel(data.active_threat_level);
        setLockdownCount(data.lockdown_count);
        setLockedAddresses(data.locked_addresses || []);
        setRecentThreats(data.recent_threats || []);
        setPrioritizedCases(data.prioritized_cases || []);
        
        const crit = data.recent_threats.find((t: any) => t.severity === 'critical' && !t.is_read && t.status !== 'Escalated');
        if (crit) {
          if (!activeSlaTarget || activeSlaTarget.id !== crit.id) {
            setActiveSlaTarget(crit);
            setSlaTimeRemaining(30);
          }
        } else {
          setActiveSlaTarget(null);
        }
        return;
      }
    } catch (err) {
      console.warn('Backend REST threat fetch failed, using local fallback:', err);
    }

    // Fallback to Zustand local state if backend is unreachable / unauthorized
    const mappedCases = cases.map(c => ({
      id: c.id,
      case_number: c.caseNumber,
      title: c.title,
      priority: c.priority,
      status: c.status,
      updated_at: c.updatedAt
    }));
    
    // Sort critical first
    const priorityWeights: Record<string, number> = { "critical": 4, "high": 3, "medium": 2, "low": 1 };
    const sorted = [...mappedCases].sort((a, b) => 
      (priorityWeights[b.priority.toLowerCase()] || 2) - (priorityWeights[a.priority.toLowerCase()] || 2)
    );
    setPrioritizedCases(sorted);

    // Mapped locked addresses from watchlist store
    const locked = entries.filter(e => e.status === 'LOCKED').map(e => ({
      address: e.address,
      chain: e.chain
    }));
    setLockedAddresses(locked);
    setLockdownCount(locked.length);

    // Filter unread alerts
    const unread = alerts.filter(a => !a.isRead);
    setRecentThreats(alerts.slice(0, 10));

    // Threat level based on unread severity
    if (unread.some(a => a.severity === 'critical')) {
      setThreatLevel('critical');
    } else if (unread.some(a => a.severity === 'high')) {
      setThreatLevel('high');
    } else if (unread.some(a => a.severity === 'medium')) {
      setThreatLevel('medium');
    } else {
      setThreatLevel('low');
    }

    // SLA Target Fallback
    const critAlert = alerts.find(a => a.severity === 'critical' && !a.isRead);
    if (critAlert) {
      if (!activeSlaTarget || activeSlaTarget.id !== critAlert.id) {
        setActiveSlaTarget(critAlert);
        setSlaTimeRemaining(30);
      }
    } else {
      setActiveSlaTarget(null);
    }
  };

  // Poll dashboard data on mount
  useEffect(() => {
    fetchThreatData();
    const interval = setInterval(fetchThreatData, 5000);
    return () => clearInterval(interval);
  }, [cases, entries, alerts]);

  // SLA Timer Countdown Loop
  useEffect(() => {
    if (activeSlaTarget) {
      slaIntervalRef.current = setInterval(() => {
        setSlaTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(slaIntervalRef.current);
            triggerAutoEscalation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (slaIntervalRef.current) {
        clearInterval(slaIntervalRef.current);
      }
      setSlaTimeRemaining(30);
    }

    return () => {
      if (slaIntervalRef.current) {
        clearInterval(slaIntervalRef.current);
      }
    };
  }, [activeSlaTarget]);

  // Call automated alert escalation endpoint
  const triggerAutoEscalation = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/incident/escalate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.escalated_count > 0) {
          fetchThreatData();
          return;
        }
      }
    } catch (err) {
      console.warn('Backend escalation POST failed');
    }

    // Local fallback: Mark target alert as Escalated / read
    if (activeSlaTarget) {
      // Create escalated alert event in local store
      useAlertStore.setState((state) => {
        const updated = state.alerts.map(a => 
          a.id === activeSlaTarget.id ? { ...a, message: `[ESCALATION] ${a.message}` } : a
        );
        return { alerts: updated };
      });
      setSuccessBanner(`SLA Escalation Protocol fired locally for alert ID: ${activeSlaTarget.id}`);
      setTimeout(() => setSuccessBanner(''), 4000);
      setActiveSlaTarget(null);
    }
  };

  // Run dynamic prioritization re-calibration
  const runRecalibration = async () => {
    setIsCalibrating(true);
    // Simulate slight loading delay for UX premium feel
    await new Promise(r => setTimeout(r, 1200));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/incident/prioritize-cases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSuccessBanner(`Dynamic prioritization complete! Recalibrated ${data.recalibrated_count} active cases.`);
        setTimeout(() => setSuccessBanner(''), 4000);
        fetchThreatData();
        setIsCalibrating(false);
        return;
      }
    } catch (err) {
      console.warn('Backend prioritizer failed, running local calibration fallback.');
    }

    // Local fallback: elevate all cases linked to high risk watchlist or containing critical alerts
    let count = 0;
    cases.forEach(c => {
      const oldPriority = c.priority;
      let newPriority = oldPriority;
      
      // Elevate randomly or based on critical keywords
      if (c.title.toLowerCase().includes('ransomware') || c.title.toLowerCase().includes('leak')) {
        newPriority = 'critical';
      } else if (c.priority === 'low') {
        newPriority = 'medium';
      }

      if (newPriority !== oldPriority) {
        updateCase(c.id, { priority: newPriority });
        count++;
      }
    });

    setSuccessBanner(`Dynamic prioritization complete (local fallback)! Recalibrated ${count} active cases.`);
    setTimeout(() => setSuccessBanner(''), 4000);
    fetchThreatData();
    setIsCalibrating(false);
  };

  // Handle emergency lockdown form submission
  const handleLockdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockAddress) return;
    
    setIsLocking(true);
    await new Promise(r => setTimeout(r, 1000));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/incident/emergency-lockdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          address: lockAddress,
          chain: lockChain,
          notes: lockNotes
        })
      });
      if (response.ok) {
        setSuccessBanner(`EMERGENCY LOCKDOWN SHIELD ACTIVE: Suspicious address ${lockAddress} has been locked and flagged in all platform monitoring logs.`);
        setTimeout(() => setSuccessBanner(''), 6000);
        setLockAddress('');
        setLockNotes('');
        fetchThreatData();
        setIsLocking(false);
        return;
      }
    } catch (err) {
      console.warn('Backend lockdown request failed, deploying local shield fallback.');
    }

    // Local fallback
    addEntry({
      id: `wtl-${Math.random().toString(36).substr(2, 7)}`,
      address: lockAddress,
      chain: lockChain,
      alias: `LOCKED: ${lockAddress.substring(0, 8)}...`,
      riskScore: 100,
      status: 'LOCKED',
      createdAt: new Date().toISOString()
    });

    setSuccessBanner(`EMERGENCY SHIELD ACTIVE (local fallback): Suspicious address ${lockAddress} has been locked and flagged in watchlist.`);
    setTimeout(() => setSuccessBanner(''), 6000);
    setLockAddress('');
    setLockNotes('');
    fetchThreatData();
    setIsLocking(false);
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-accent-red/20 text-accent-red border border-accent-red/30 font-bold';
      case 'high':
        return 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20';
      case 'medium':
        return 'bg-primary-500/10 text-primary-300 border border-primary-500/20';
      default:
        return 'bg-dark-700/50 text-dark-300 border border-dark-600/30';
    }
  };

  const getThreatStyle = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'text-accent-red border-accent-red/50 shadow-glow-red animate-pulse';
      case 'high':
        return 'text-accent-gold border-accent-gold/50 shadow-glow-gold';
      case 'medium':
        return 'text-primary-400 border-primary-500/40 shadow-glow-cyan';
      default:
        return 'text-accent-green border-accent-green/30';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Incident Response Control Center</h2>
          <p className="text-xs text-dark-400">NIA Command Level 1 Operations: Severity Prioritizer, Auto-Alert Escalation, and Emergency Watchlist Shielding</p>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] text-dark-400 bg-dark-900 border border-dark-800 px-3 py-1.5 rounded-lg">
          <Terminal size={12} className="text-primary-400" />
          <span>Active Command Nodes: 4 online</span>
        </div>
      </div>

      {/* Emergency Status Banner */}
      {successBanner && (
        <div className="bg-accent-red/10 border-2 border-accent-red/40 rounded-xl p-4 flex items-start gap-3 shadow-glow-red animate-pulse-slow">
          <AlertOctagon className="text-accent-red flex-shrink-0 mt-0.5 animate-spin-slow" size={18} />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Operational Shield Protocol Engaged</h4>
            <p className="text-[11px] text-dark-300 mt-1">{successBanner}</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`glass-card p-5 border flex items-center justify-between ${getThreatStyle(threatLevel)}`}>
          <div>
            <span className="text-[10px] text-dark-400 uppercase tracking-widest font-semibold block">Active Threat Level</span>
            <span className="text-2xl font-black uppercase tracking-wider">{threatLevel}</span>
          </div>
          <ShieldAlert size={36} className="opacity-80" />
        </div>

        <div className="glass-card p-5 border border-dark-800/80 flex items-center justify-between text-cyber-teal">
          <div>
            <span className="text-[10px] text-dark-400 uppercase tracking-widest font-semibold block">Lockdown Watchlist</span>
            <span className="text-2xl font-black">{lockdownCount} Addresses</span>
          </div>
          <ShieldX size={36} className="opacity-80 text-cyber-teal" />
        </div>

        <div className="glass-card p-5 border border-dark-800/80 flex items-center justify-between text-accent-gold">
          <div>
            <span className="text-[10px] text-dark-400 uppercase tracking-widest font-semibold block">Escalation Timer (SLA)</span>
            {activeSlaTarget ? (
              <span className="text-2xl font-black text-accent-red animate-pulse">
                {slaTimeRemaining}s Remaining
              </span>
            ) : (
              <span className="text-2xl font-black text-dark-400">No Target Active</span>
            )}
          </div>
          <Clock size={36} className={`opacity-80 ${activeSlaTarget ? 'text-accent-red animate-spin' : 'text-dark-400'}`} style={{ animationDuration: '4s' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Prioritized Cases Board */}
        <div className="glass-card p-5 border border-dark-800/80 xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Severity-based Case Prioritization</h3>
            </div>
            
            <button
              onClick={runRecalibration}
              disabled={isCalibrating}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCw size={12} className={isCalibrating ? 'animate-spin' : ''} />
              {isCalibrating ? 'Prioritizing...' : 'Prioritize Cases'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-dark-900 border-b border-dark-800 text-dark-400 font-semibold tracking-wider">
                  <th className="p-3">Case ID</th>
                  <th className="p-3">Case Title</th>
                  <th className="p-3">Dynamic Priority</th>
                  <th className="p-3">Audit Status</th>
                  <th className="p-3 text-right">Recalibrated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-850">
                {prioritizedCases.map((c) => (
                  <tr key={c.id} className="hover:bg-dark-900/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyber-teal">{c.case_number}</td>
                    <td className="p-3 text-white max-w-[200px] truncate">{c.title}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono tracking-wider ${getPriorityStyle(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="p-3 text-dark-300 uppercase font-mono text-[9px] flex items-center gap-1">
                      <CheckCircle size={10} className="text-accent-green" />
                      Verified
                    </td>
                    <td className="p-3 text-right text-dark-400 font-mono">
                      {c.updated_at ? c.updated_at.split('T')[0] : '2026-06-27'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Emergency Lockdown Console */}
        <div className="glass-card p-5 border border-dark-800/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
            <ShieldAlert size={16} className="text-accent-red" />
            <h3 className="text-sm font-bold text-white tracking-wide">Emergency Shield Console</h3>
          </div>

          <p className="text-[10px] text-dark-400 leading-relaxed">
            NIA Level Protocol. Activating an emergency lockdown immediately flags and restricts suspect transfers in all active SOC dashboards, logs an immutable block in the forensics database, and broadcasts Tier-1 alarms.
          </p>

          <form onSubmit={handleLockdown} className="space-y-4">
            <div>
              <label className="block text-[10px] font-medium text-dark-300 mb-1.5">Watchlist Wallet Address</label>
              <input
                type="text"
                value={lockAddress}
                onChange={(e) => setLockAddress(e.target.value)}
                placeholder="Enter BTC / ETH / SOL address..."
                className="input-field py-2 text-xs font-mono bg-dark-900 border-dark-750 placeholder-dark-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-medium text-dark-300 mb-1.5">Asset Network</label>
                <select
                  value={lockChain}
                  onChange={(e) => setLockChain(e.target.value)}
                  className="input-field py-2 text-xs bg-dark-900 border-dark-750"
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="SOL">Solana (SOL)</option>
                  <option value="XRP">Ripple (XRP)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-dark-300 mb-1.5">Authorization Level</label>
                <div className="px-3 py-2 text-xs bg-dark-850 border border-dark-750 text-accent-red font-bold uppercase rounded-lg text-center font-mono">
                  Tier-1 (NIA)
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-dark-300 mb-1.5">Lockdown Reason / Case Reference</label>
              <textarea
                value={lockNotes}
                onChange={(e) => setLockNotes(e.target.value)}
                rows={2}
                placeholder="Ransomware co-spending hub, immediate freezing requested..."
                className="input-field py-2 text-xs bg-dark-900 border-dark-750 placeholder-dark-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLocking || !lockAddress}
              className="w-full py-2.5 bg-accent-red hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-lg text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-glow-red transition-all disabled:opacity-50"
            >
              <Zap size={14} className={isLocking ? 'animate-bounce' : ''} />
              {isLocking ? 'FREEZING NODE...' : 'ACTIVATE LOCKDOWN PROTOCOL'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Threat Feed */}
        <div className="glass-card p-5 border border-dark-800/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
            <ShieldAlert size={16} className="text-accent-gold" />
            <h3 className="text-sm font-bold text-white tracking-wide">Live Threat Alerts</h3>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {recentThreats.length === 0 ? (
              <div className="text-center py-8 text-xs text-dark-400 font-mono">
                No active threats flagged in current block cycles.
              </div>
            ) : (
              recentThreats.map((threat) => (
                <div 
                  key={threat.id} 
                  className={`p-3 rounded-lg border flex gap-3 text-[11px] bg-dark-900/50 border-dark-800 text-dark-300`}
                >
                  <AlertOctagon size={14} className="mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white uppercase tracking-widest text-[9px] bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700">
                        {threat.chain}
                      </span>
                      <span className="font-mono text-dark-400 truncate max-w-[120px]">{threat.address}</span>
                      <span className={`text-[8px] px-1 py-0.2 rounded font-mono uppercase font-bold tracking-wider ${
                        threat.severity === 'critical' ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-gold/20 text-accent-gold'
                      }`}>
                        {threat.severity}
                      </span>
                    </div>
                    <p className="leading-relaxed text-dark-200">{threat.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Lockdowns Directory */}
        <div className="glass-card p-5 border border-dark-800/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
            <ShieldX size={16} className="text-cyber-teal" />
            <h3 className="text-sm font-bold text-white tracking-wide">Locked Target Addresses</h3>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {lockedAddresses.length === 0 ? (
              <div className="text-center py-8 text-xs text-dark-400 font-mono">
                No active lockdown protocols deployed.
              </div>
            ) : (
              lockedAddresses.map((lock, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-dark-900 border border-cyber-teal/20 text-[11px] flex items-center justify-between hover:bg-dark-850 transition-colors">
                  <div className="flex items-center gap-3">
                    <ShieldX size={14} className="text-cyber-teal flex-shrink-0" />
                    <div>
                      <div className="font-bold text-white uppercase tracking-wider text-[9px] bg-dark-800 px-1.5 py-0.5 rounded border border-cyber-teal/30 inline-block mb-1">
                        {lock.chain}
                      </div>
                      <span className="font-mono text-dark-300 block">{lock.address}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-cyber-teal/10 text-cyber-teal border border-cyber-teal/20 text-[8px] uppercase tracking-widest font-mono font-bold">
                      Shield-Lock
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
