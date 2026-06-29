import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Globe, Search, ArrowRight, Building, Link, AlertTriangle, Cpu } from 'lucide-react';
import { getRiskColor } from '../utils/helpers';

interface EntityProfile {
  name: string;
  category: 'Exchange' | 'Bridge' | 'Sanctioned Entity' | 'DeFi Protocol' | 'Mixer';
  verificationLevel: 'Publicly Verified' | 'Analyst Flagged' | 'Unverified';
  website: string;
  knownWalletsCount: number;
  associatedCasesCount: number;
  riskScore: number;
  confidence: 'High' | 'Medium' | 'Low';
  supportingData: string;
  addressList: string[];
}

export const EntityIntelligencePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const entities: EntityProfile[] = [
    {
      name: 'Garantex Exchange',
      category: 'Exchange',
      verificationLevel: 'Publicly Verified',
      website: 'https://garantex.org',
      knownWalletsCount: 142,
      associatedCasesCount: 5,
      riskScore: 95,
      confidence: 'High',
      supportingData: 'OFAC Sanctioned Entity — Designated for facilitating laundering of ransom proceeds.',
      addressList: [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28',
        '0x22086e3f43818e381042c1042c1042c1042c1042'
      ]
    },
    {
      name: 'Tornado.Cash Mixer',
      category: 'Mixer',
      verificationLevel: 'Publicly Verified',
      website: 'https://tornado.cash',
      knownWalletsCount: 89,
      associatedCasesCount: 12,
      riskScore: 98,
      confidence: 'High',
      supportingData: 'Smart contract coin mixer — sanctioned by US Treasury for laundering illicit assets.',
      addressList: [
        '0x71c20e241775e5332f143715df332f143789a71b',
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      ]
    },
    {
      name: 'Binance Hot Wallet #4',
      category: 'Exchange',
      verificationLevel: 'Publicly Verified',
      website: 'https://binance.com',
      knownWalletsCount: 1,
      associatedCasesCount: 3,
      riskScore: 12,
      confidence: 'High',
      supportingData: 'Verified institutional hot-wallet belonging to Binance exchange operations.',
      addressList: [
        '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE'
      ]
    },
    {
      name: 'Ronin Bridge Exploit Intermediary',
      category: 'Bridge',
      verificationLevel: 'Analyst Flagged',
      website: 'N/A',
      knownWalletsCount: 14,
      associatedCasesCount: 1,
      riskScore: 88,
      confidence: 'Medium',
      supportingData: 'Identified as a bridge multi-sig node compromised during Lazarus campaign transfers.',
      addressList: [
        '0x098b716b8a213715df332f143715df332f143789'
      ]
    }
  ];

  const filteredEntities = entities.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.supportingData.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Entity Intelligence Directory</h2>
        <p className="text-xs text-dark-400">Database of categorized centralized services, bridges, protocols, and sanctioned nodes</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Search service name, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 py-1.5 text-xs"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field py-1.5 px-3 text-xs w-40"
          >
            <option value="all">All Categories</option>
            <option value="Exchange">Exchanges</option>
            <option value="Mixer">Mixers</option>
            <option value="Bridge">Bridges</option>
            <option value="Sanctioned Entity">Sanctioned</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEntities.map((entity, idx) => (
          <div key={idx} className="glass-card p-5 space-y-4 border-dark-700/50">
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-primary-400">
                  <Building size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {entity.name}
                    {entity.verificationLevel === 'Publicly Verified' ? (
                      <span title="Verified Public Entry"><ShieldCheck size={14} className="text-accent-green" /></span>
                    ) : (
                      <span title="Analyst Flagged Entry"><ShieldAlert size={14} className="text-accent-gold" /></span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-dark-400 mt-0.5">
                    <span>{entity.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Globe size={10} /> {entity.website}</span>
                  </div>
                </div>
              </div>

              {/* Risk indicator */}
              <div className="text-right">
                <span className={`text-xs font-black ${getRiskColor(entity.riskScore)} block`}>
                  {entity.riskScore}% RISK
                </span>
                <span className="text-[9px] text-dark-500 font-semibold uppercase block mt-0.5">
                  Confidence: {entity.confidence}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-800 text-[11px] text-dark-300 leading-relaxed">
              <span className="font-bold text-white block mb-0.5">Supporting Public Info</span>
              {entity.supportingData}
            </div>

            {/* Wallets mapping */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Mapped On-Chain Nodes ({entity.knownWalletsCount})</span>
              <div className="space-y-1.5">
                {entity.addressList.map((addr, aIdx) => (
                  <div key={aIdx} className="p-2 bg-dark-800/40 rounded border border-dark-700/30 flex items-center justify-between text-[11px]">
                    <code className="text-primary-400 font-mono select-all truncate max-w-[280px]">{addr}</code>
                    <span className="text-[9px] text-dark-500 font-semibold font-mono uppercase">Etherscan</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data quality standard statement */}
            <div className="pt-2.5 border-t border-dark-800 flex items-center justify-between text-[9px] text-dark-500">
              <span className="flex items-center gap-1 font-semibold">
                <Cpu size={10} /> Verified blockchain database matching
              </span>
              <span>Case Associations: {entity.associatedCasesCount}</span>
            </div>
          </div>
        ))}

        {filteredEntities.length === 0 && (
          <div className="col-span-2 text-center py-16 bg-dark-800/10 border border-dashed border-dark-800 rounded-xl">
            <AlertTriangle size={32} className="mx-auto text-dark-500 mb-2" />
            <h4 className="text-sm font-semibold text-white">No entity records matched</h4>
            <p className="text-xs text-dark-400 mt-1">Refine your keyword search queries or select a different category filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
