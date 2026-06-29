import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, ShieldCheck, Activity, Users, Clock, AlertOctagon, Terminal, Play, 
  Search, RefreshCw, Layers, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, UserCheck
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export const SocDashboardPage: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshes, setRefreshes] = useState(0);
  
  // Timeline Correlation Search
  const [searchTarget, setSearchTarget] = useState('0x71c20e241775e5332f143715df332f143789a71b');
  const [correlatedTimeline, setCorrelatedTimeline] = useState<any>(null);
  const [loadingCorrelation, setLoadingCorrelation] = useState(false);

  // Threat Intel Checker
  const [checkIndicator, setCheckIndicator] = useState('');
  const [intelResult, setIntelResult] = useState<any>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/siem/alerts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrelation = async (target: string) => {
    setLoadingCorrelation(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/siem/correlation?wallet_address=${target}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCorrelatedTimeline(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCorrelation(false);
    }
  };

  const checkThreatIntel = async () => {
    if (!checkIndicator.trim()) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/siem/threat-intel/ioc-check?indicator=${checkIndicator}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIntelResult(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/siem/alerts/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignAnalyst = async (id: string, analyst: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/siem/alerts/${id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ analyst })
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchCorrelation(searchTarget);
  }, [refreshes]);

  // Chart data
  const mitreData = [
    { name: 'T1078 Auth', count: 4 },
    { name: 'T1071 Proxy', count: 7 },
    { name: 'T1562 Logs', count: 2 },
    { name: 'T1041 Exfil', count: 9 },
  ];

  const severityPieData = [
    { name: 'Critical', value: incidents.filter(i => i.severity === 'critical').length, color: '#ef4444' },
    { name: 'High', value: incidents.filter(i => i.severity === 'high').length, color: '#f97316' },
    { name: 'Medium', value: incidents.filter(i => i.severity === 'medium').length, color: '#eab308' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Security Operations Center (SOC)</h1>
          <p className="text-xs text-dark-400">SIEM Event Correlation, Threat Intelligence, and Audits Console</p>
        </div>
        <button 
          onClick={() => setRefreshes(r => r + 1)}
          className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Stream
        </button>
      </div>

      {/* Stats Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
        <div className="glass-card p-4 border-dark-700/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-dark-500 uppercase block font-bold">Unassigned Incidents</span>
            <span className="text-xl font-black text-white mt-1 block">
              {incidents.filter(i => i.status === 'unassigned').length} Alerts
            </span>
          </div>
          <AlertCircle size={24} className="text-accent-red animate-pulse" />
        </div>

        <div className="glass-card p-4 border-dark-700/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-dark-500 uppercase block font-bold">Avg. Alert SLA</span>
            <span className="text-xl font-black text-white mt-1 block">22 Mins</span>
          </div>
          <Clock size={24} className="text-accent-gold" />
        </div>

        <div className="glass-card p-4 border-dark-700/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-dark-500 uppercase block font-bold">WAF Threats Blocked</span>
            <span className="text-xl font-black text-white mt-1 block">8,412 / Day</span>
          </div>
          <ShieldAlert size={24} className="text-accent-blue" />
        </div>

        <div className="glass-card p-4 border-dark-700/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-dark-500 uppercase block font-bold">ELK Log Ingestion Rate</span>
            <span className="text-xl font-black text-white mt-1 block">154 events/sec</span>
          </div>
          <Activity size={24} className="text-accent-green" />
        </div>
      </div>

      {/* Main Charts & Incidents Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Security Incident Queue */}
        <div className="lg:col-span-2 glass-card p-5 border-dark-700/50 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
              <ShieldAlert size={15} className="text-accent-red" />
              <h3 className="text-sm font-bold text-white">Active Correlated Security Incidents</h3>
            </div>
            
            <div className="divide-y divide-dark-850 mt-2">
              {loading ? (
                <div className="py-8 text-center text-dark-500 font-mono">Loading incident logs...</div>
              ) : incidents.length > 0 ? (
                incidents.map((inc) => (
                  <div key={inc.id} className="py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          inc.severity === 'critical' ? 'bg-accent-red/20 text-accent-red' : 
                          inc.severity === 'high' ? 'bg-accent-gold/20 text-accent-gold' : 'bg-accent-blue/20 text-accent-blue'
                        }`}>
                          {inc.severity}
                        </span>
                        <span className="text-white font-bold">{inc.category}</span>
                      </div>
                      <span className="text-[10px] text-dark-500 font-mono">{inc.timestamp}</span>
                    </div>

                    <p className="text-xs text-dark-300 leading-relaxed font-semibold">{inc.message}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] font-mono text-dark-400">
                      <div>MITRE: <span className="text-white">{inc.mitre_technique}</span></div>
                      <div>Source: <span className="text-white">{inc.source}</span></div>
                      <div>Assigned To: <span className="text-accent-blue font-bold">{inc.analyst_assigned}</span></div>
                    </div>

                    <div className="flex items-center gap-2 pt-1.5">
                      <button
                        onClick={() => handleUpdateStatus(inc.id, 'resolved')}
                        className="px-2 py-1 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded hover:bg-accent-green/20 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(inc.id, 'suppressed')}
                        className="px-2 py-1 bg-dark-800 text-dark-300 border border-dark-700/60 rounded hover:text-white text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Suppress
                      </button>
                      <select
                        onChange={(e) => handleAssignAnalyst(inc.id, e.target.value)}
                        className="bg-dark-950 border border-dark-700/60 rounded px-2 py-1 text-[10px] text-white focus:outline-none cursor-pointer"
                        value={inc.analyst_assigned}
                      >
                        <option value="None">Assign Analyst...</option>
                        <option value="Senior Investigator Verma">Investigator Verma</option>
                        <option value="Forensic Analyst Gupta">Analyst Gupta</option>
                      </select>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-dark-500 italic">No security incidents detected.</div>
              )}
            </div>
          </div>
        </div>

        {/* SIEM Metrics Visualization Charts */}
        <div className="glass-card p-5 border-dark-700/50 space-y-4">
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
            <Activity size={15} className="text-accent-blue" />
            <h3 className="text-sm font-bold text-white">MITRE ATT&CK Technique Distribution</h3>
          </div>
          
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mitreData}>
                <XAxis dataKey="name" stroke="#525876" fontSize={8} />
                <YAxis stroke="#525876" fontSize={8} />
                <Tooltip contentStyle={{ backgroundColor: '#111528', borderColor: '#2a3253' }} />
                <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-2 border-b border-dark-800 pb-3 pt-2">
            <Layers size={15} className="text-accent-gold" />
            <h3 className="text-sm font-bold text-white">Alert Severity Breakdown</h3>
          </div>

          <div className="h-32 w-full flex items-center justify-between">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityPieData} dataKey="value" innerRadius={25} outerRadius={40} paddingAngle={4}>
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 text-[10px] space-y-1.5 font-bold">
              {severityPieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-dark-300">{d.name}:</span>
                  <span className="text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Correlation timeline panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kill Chain Correlation Timeline */}
        <div className="lg:col-span-2 glass-card p-5 border-dark-700/50 space-y-4">
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal size={15} className="text-accent-blue" />
              <h3 className="text-sm font-bold text-white">Correlated Incident Timeline Explorer</h3>
            </div>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Target address..."
                value={searchTarget}
                onChange={(e) => setSearchTarget(e.target.value)}
                className="bg-dark-950 border border-dark-750 rounded px-2 py-1 text-[10px] text-white focus:outline-none w-48 font-mono"
              />
              <button 
                onClick={() => fetchCorrelation(searchTarget)}
                className="px-2.5 py-1 bg-primary-600 hover:bg-primary-500 rounded text-[10px] text-white font-bold cursor-pointer"
              >
                Scan
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {loadingCorrelation ? (
              <div className="py-8 text-center text-dark-500 font-mono">Running log correlation scanner...</div>
            ) : correlatedTimeline ? (
              <div className="space-y-3 font-semibold">
                <div className="flex justify-between items-center text-[10px] bg-dark-900 p-3 rounded-lg border border-dark-850">
                  <div>Correlation ID: <span className="text-white font-mono">{correlatedTimeline.correlation_id}</span></div>
                  <div>Current Phase: <span className="text-accent-red uppercase font-black">{correlatedTimeline.kill_chain_phase}</span></div>
                  <div>Confidence score: <span className="text-accent-green">{correlatedTimeline.confidence_score}%</span></div>
                </div>

                <div className="space-y-3.5 relative border-l border-dark-800 ml-3 pl-4 pt-2">
                  {correlatedTimeline.timeline_events.map((evt: any) => (
                    <div key={evt.step} className="relative">
                      <span className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-accent-blue" />
                      <div className="text-[10px] text-dark-500 font-mono">{evt.timestamp} | {evt.source}</div>
                      <div className="text-xs text-white mt-0.5">{evt.event}</div>
                      <div className="text-[9px] text-dark-400 font-mono mt-0.5">MITRE Technique: {evt.technique}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-dark-500 italic">Provide a wallet target and scan to correlate logs.</div>
            )}
          </div>
        </div>

        {/* Threat Intel IOC lookup */}
        <div className="glass-card p-5 border-dark-700/50 space-y-4">
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
            <Search size={15} className="text-accent-green" />
            <h3 className="text-sm font-bold text-white">IOC Threat Intelligence Enricher</h3>
          </div>
          
          <div className="space-y-3 text-xs">
            <span className="text-[10px] text-dark-500 block uppercase font-bold">Query Indicators (IP / Wallet Hash)</span>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="IP address or suspect address..."
                value={checkIndicator}
                onChange={(e) => setCheckIndicator(e.target.value)}
                className="bg-dark-950 border border-dark-750 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none w-full font-mono placeholder-dark-500"
              />
              <button 
                onClick={checkThreatIntel}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded text-xs text-white font-bold cursor-pointer"
              >
                Query
              </button>
            </div>

            {intelResult ? (
              <div className="p-3 bg-dark-900 border border-dark-850 rounded-lg space-y-2 mt-2">
                {intelResult.match_found ? (
                  <>
                    <div className="flex items-center gap-1 text-accent-red font-bold">
                      <AlertTriangle size={12} /> MATCH FOUND (STIX FEED)
                    </div>
                    <div className="space-y-1.5 text-[10px] text-dark-400 font-mono">
                      <div>Actor: <span className="text-white">{intelResult.ioc_details.threat_actor}</span></div>
                      <div>Type: <span className="text-white">{intelResult.ioc_details.type.toUpperCase()}</span></div>
                      <div>Campaign: <span className="text-white">{intelResult.ioc_details.malware}</span></div>
                      <div>Severity: <span className="text-accent-red font-bold uppercase">{intelResult.ioc_details.severity}</span></div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1 text-accent-green font-bold">
                    <CheckCircle2 size={12} /> NO MATCH IN THREAT REGISTER
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
};
