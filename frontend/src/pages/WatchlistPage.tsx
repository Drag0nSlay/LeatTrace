import React, { useState } from 'react';
import { useWatchlistStore, useAlertStore, useBlockchainStore, useNavStore } from '../stores';
import { Eye, Plus, Trash2, ShieldAlert, Activity, Play, EyeOff, Search } from 'lucide-react';
import { formatAddress, formatDate, getRiskColor } from '../utils/helpers';
import type { WatchlistEntry } from '../types';

export const WatchlistPage: React.FC = () => {
  const { entries, addEntry, removeEntry } = useWatchlistStore();
  const { alerts, markAllRead } = useAlertStore();
  const { setSearchAddress } = useBlockchainStore();
  const { setPage } = useNavStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('BTC');
  const [alias, setAlias] = useState('');
  const [risk, setRisk] = useState(50);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    const newEntry: WatchlistEntry = {
      id: `wtl-${Math.random().toString(36).substr(2, 7)}`,
      address: address.trim(),
      chain: chain,
      alias: alias || 'Unlabeled Node',
      riskScore: risk,
      status: 'Monitored',
      createdAt: new Date().toISOString()
    };

    addEntry(newEntry);
    setShowAddModal(false);
    
    // Reset states
    setAddress('');
    setChain('BTC');
    setAlias('');
    setRisk(50);
  };

  const handleSimulateBlock = async () => {
    setIsSimulating(true);
    setSimulationLogs(['Initializing simulated blockchain block listener...']);
    
    await new Promise((r) => setTimeout(r, 1000));
    setSimulationLogs((prev) => [...prev, 'Scanning active watchlist addresses...']);
    
    await new Promise((r) => setTimeout(r, 800));
    const randomEntry = entries[Math.floor(Math.random() * entries.length)] || {
      address: '1LbcPeel5s9zARansom993vX78cDf',
      chain: 'BTC',
      alias: 'LockBit Ransomware Receiver'
    };

    const val = (Math.random() * 45).toFixed(2);
    const mockTx = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    
    setSimulationLogs((prev) => [
      ...prev,
      `Detected block activity on chain: ${randomEntry.chain}`,
      `Target address matched: ${randomEntry.address}`,
      `Tx details: Moving ${val} ${randomEntry.chain} (Tx: ${mockTx.slice(0, 12)}...)`,
      'Raising critical security alarm notification!'
    ]);

    // Force alert trigger in store
    const alertId = `alr_${Math.random().toString(36).substr(2, 7)}`;
    useAlertStore.setState((s) => ({
      alerts: [
        {
          id: alertId,
          chain: randomEntry.chain,
          address: randomEntry.address,
          type: 'layering_activity',
          message: `Trigger Alert [${randomEntry.alias}]: Transaction detected moving ${val} ${randomEntry.chain} (Threshold: 0.1).`,
          severity: 'critical',
          createdAt: new Date().toISOString(),
          isRead: false
        },
        ...s.alerts
      ]
    }));

    setIsSimulating(false);
  };

  const handleTraceAddress = (addr: string) => {
    setSearchAddress(addr);
    setPage('blockchain');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Active Watchlist Surveillance</h2>
          <p className="text-xs text-dark-400">Establish tracing listener rules on target crypto wallets to raise alarms on fund updates</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleSimulateBlock}
            disabled={isSimulating}
            className="px-4 py-2 bg-accent-gold/20 text-accent-gold border border-accent-gold/30 rounded-lg font-medium text-sm hover:bg-accent-gold/30 hover:border-accent-gold/50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play size={14} className={isSimulating ? 'animate-spin' : ''} />
            {isSimulating ? 'Simulating...' : 'Simulate Block Event'}
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add Rule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Watchlist Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-dark-800/40 border-b border-dark-700/40 text-dark-400 font-semibold uppercase tracking-wider">
                    <th className="p-4">Chain / Target</th>
                    <th className="p-4">Alias</th>
                    <th className="p-4">Risk</th>
                    <th className="p-4">Surveillance Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/50">
                  {entries.map((item) => (
                    <tr key={item.id} className="hover:bg-dark-800/10 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-dark-800 border border-dark-700 text-primary-400">
                            {item.chain}
                          </span>
                          <code className="text-white font-medium mono">{formatAddress(item.address, 6)}</code>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-dark-100">
                        {item.alias}
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${getRiskColor(item.riskScore || 0)}`}>
                          {item.riskScore || 0}%
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-accent-green">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleTraceAddress(item.address)}
                            className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                            title="Run Trace Graph"
                          >
                            <Search size={14} />
                          </button>
                          <button 
                            onClick={() => removeEntry(item.id)}
                            className="p-1 rounded text-dark-400 hover:text-accent-red hover:bg-dark-800 transition-colors"
                            title="Remove Rule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Simulation Logs */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5 space-y-4 h-full min-h-[300px] flex flex-col">
            <div className="flex items-center justify-between border-b border-dark-700/50 pb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-accent-gold" />
                <h3 className="text-sm font-bold text-white">Block Engine Terminal</h3>
              </div>
              
              <div className="pulse-dot bg-accent-gold" />
            </div>

            <div className="flex-1 bg-dark-950 p-4 rounded-lg border border-dark-800/80 font-mono text-[10px] text-dark-300 space-y-1.5 overflow-y-auto max-h-[300px]">
              {simulationLogs.length === 0 ? (
                <div className="text-center py-12 text-dark-500 italic">
                  Launch the block listener simulation to stream dynamic blockchain events.
                </div>
              ) : (
                simulationLogs.map((log, idx) => (
                  <div key={idx} className={log.includes('Alarm') || log.includes('Matched') ? 'text-accent-gold font-semibold' : ''}>
                    {log.startsWith('Detect') || log.startsWith('Target') ? `> ${log}` : log}
                  </div>
                ))
              )}
            </div>

            <div className="text-[10px] text-dark-500 leading-normal flex items-start gap-1">
              <ShieldAlert size={12} className="mt-0.5 flex-shrink-0" />
              Simulating alerts generates on-chain transaction inputs to verify the rate monitoring engines.
            </div>
          </div>
        </div>
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center gap-2 mb-4 border-b border-dark-700/50 pb-3">
              <Eye size={18} className="text-primary-400" />
              <h3 className="text-base font-semibold text-white">Create Surveillance Rule</h3>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-dark-300 mb-1">Blockchain</label>
                  <select 
                    value={chain} 
                    onChange={(e) => setChain(e.target.value)}
                    className="input-field py-2 text-xs bg-dark-900 border-dark-700/50"
                  >
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="SOL">SOL</option>
                    <option value="BSC">BSC</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-dark-300 mb-1">Wallet Alias</label>
                  <input 
                    type="text" required value={alias} onChange={(e) => setAlias(e.target.value)}
                    placeholder="e.g. LockBit Ransomware Collector"
                    className="input-field py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">Target Address</label>
                <input 
                  type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter crypto wallet address..."
                  className="input-field py-2 text-xs mono"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-dark-300 mb-1">
                  <span>Assigned Initial Risk Score</span>
                  <span className="font-bold text-primary-400">{risk}%</span>
                </div>
                <input 
                  type="range" min="10" max="99" value={risk} onChange={(e) => setRisk(Number(e.target.value))}
                  className="w-full h-1 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-700/50">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost py-2 text-xs px-4"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary py-2 text-xs px-4"
                >
                  Enable Tracing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
