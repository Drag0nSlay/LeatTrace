import React, { useState } from 'react';
import { useAlertStore, useBlockchainStore, useNavStore } from '../stores';
import { Bell, Check, Trash2, ShieldAlert, ArrowRight, Filter, Eye, AlertTriangle } from 'lucide-react';
import { formatDate, getSeverityColor } from '../utils/helpers';

export const AlertsPage: React.FC = () => {
  const { alerts, markRead, markAllRead } = useAlertStore();
  const { setSearchAddress } = useBlockchainStore();
  const { setPage } = useNavStore();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredAlerts = alerts.filter((a) => {
    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
    let matchesCategory = true;
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'security') matchesCategory = a.type === 'mixer_interaction' || a.type === 'exchange_deposit' || a.type === 'layering_activity';
      if (categoryFilter === 'evidence') matchesCategory = a.type === 'new_evidence';
      if (categoryFilter === 'tasks') matchesCategory = a.type === 'task_assigned';
      if (categoryFilter === 'health') matchesCategory = a.type === 'system_alert';
    }
    return matchesSeverity && matchesCategory;
  });

  const handleTraceAlert = (addr: string) => {
    setSearchAddress(addr);
    setPage('blockchain');
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert size={16} className="text-accent-red animate-pulse" />;
      case 'high':
        return <AlertTriangle size={16} className="text-accent-gold" />;
      default:
        return <Bell size={16} className="text-primary-400" />;
    }
  };

  const getBgStyle = (severity: string, isRead: boolean) => {
    if (isRead) return 'bg-dark-800/20 border-dark-800 opacity-60';
    switch (severity) {
      case 'critical':
        return 'bg-accent-red/5 border-accent-red/20 shadow-glow-red/5 hover:border-accent-red/30';
      case 'high':
        return 'bg-accent-gold/5 border-accent-gold/20 hover:border-accent-gold/30';
      default:
        return 'bg-primary-500/5 border-primary-500/20 hover:border-primary-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Security Notifications Center</h2>
          <p className="text-xs text-dark-400">Review triggered triggers matched on watched addresses and suspect funds layering hops</p>
        </div>

        <button 
          onClick={markAllRead}
          className="btn-ghost flex items-center gap-1 text-xs border border-dark-700/50"
        >
          <Check size={14} /> Mark all read
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Severity */}
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-dark-400" />
          <span className="text-xs text-dark-300">Severity:</span>
          <div className="flex items-center gap-1">
            {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold capitalize transition-all cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'bg-dark-800 text-dark-400 border border-transparent hover:border-dark-700'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-300">Category:</span>
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'security', label: 'Security' },
              { id: 'evidence', label: 'Evidence' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'health', label: 'Health' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'bg-dark-800 text-dark-400 border border-transparent hover:border-dark-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div 
            key={alert.id}
            className={`p-4 rounded-xl border transition-all duration-200 flex items-start justify-between gap-4 ${getBgStyle(alert.severity, alert.isRead)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {getAlertIcon(alert.severity)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-dark-800 border border-dark-700 text-primary-400">
                    {alert.chain}
                  </span>
                  <code className="text-[10px] text-dark-400 mono select-all">{alert.address}</code>
                  <span className="text-[9px] text-dark-500">•</span>
                  <span className="text-[10px] text-dark-400">{formatDate(alert.createdAt)}</span>
                  {!alert.isRead && (
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-ping" />
                  )}
                </div>

                <p className="text-sm font-medium text-white mb-2 leading-relaxed">
                  {alert.message}
                </p>

                <div className="flex items-center gap-4 text-[10px] font-semibold text-primary-400">
                  <button 
                    onClick={() => handleTraceAlert(alert.address || '')}
                    className="hover:underline flex items-center gap-1.5"
                  >
                    Trace Transaction Graph <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            </div>

            {/* Read action */}
            {!alert.isRead && (
              <button 
                onClick={() => markRead(alert.id)}
                className="p-1 rounded text-dark-400 hover:text-accent-green hover:bg-dark-800 transition-colors flex-shrink-0"
                title="Mark Read"
              >
                <Check size={14} />
              </button>
            )}
          </div>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="glass-card p-12 text-center text-dark-500 italic">
            No active triggers matching severity "{severityFilter}" are logged.
          </div>
        )}
      </div>
    </div>
  );
};
