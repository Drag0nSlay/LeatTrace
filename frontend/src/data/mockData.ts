import type { User, Case, WalletProfile, Transaction, Evidence, WatchlistEntry, Alert, AuditLog, DashboardStats, TimelineEntry, Report, GraphNode, GraphEdge } from '../types';

// ============================================================================
// MOCK DATA — Realistic Ethereum blockchain investigation data
// ============================================================================

export const mockUser: User = {
  id: 'usr-001',
  email: 'lakshaysoni@cybercrime.gov.in',
  username: 'Lakshay Soni',
  role: 'investigator',
  isActive: true,
  mfaEnabled: true,
  createdAt: '2024-01-15T08:00:00Z',
  lastLogin: '2026-06-18T10:30:00Z',
  department: 'Cyber Crime Investigation Cell',
};

export const mockCases: Case[] = [
  {
    id: 'case-001', caseNumber: 'CC-2026-0847', title: 'Crypto Ponzi Scheme — GainChain Network',
    description: 'Investigation into GainChain, a suspected Ponzi scheme operating through Ethereum smart contracts. Multiple victims reported losses exceeding ₹50 Crore.',
    priority: 'critical', status: 'active', investigatorId: 'usr-001', investigatorName: 'Inspector Verma',
    department: 'Cyber Crime Cell', notes: 'Primary suspect wallet identified. Multi-hop tracing in progress.',
    createdAt: '2026-05-10T09:00:00Z', updatedAt: '2026-06-18T08:00:00Z', walletCount: 12, evidenceCount: 34,
  },
  {
    id: 'case-002', caseNumber: 'CC-2026-0912', title: 'Ransomware Payment Tracing — MedLock Attack',
    description: 'Tracing ransom payments from MedLock ransomware attack targeting healthcare institutions. Bitcoin converted to ETH via DEX.',
    priority: 'high', status: 'active', investigatorId: 'usr-001', investigatorName: 'Inspector Verma',
    department: 'Cyber Crime Cell', notes: 'DEX swap transactions identified on Uniswap.',
    createdAt: '2026-06-01T11:00:00Z', updatedAt: '2026-06-17T16:00:00Z', walletCount: 8, evidenceCount: 19,
  },
  {
    id: 'case-003', caseNumber: 'CC-2026-0756', title: 'Money Laundering via NFT Wash Trading',
    description: 'Investigation into suspected money laundering through NFT marketplace wash trading. Circular transactions between related wallets.',
    priority: 'high', status: 'active', investigatorId: 'usr-002', investigatorName: 'SI Patel',
    department: 'Financial Intelligence', notes: 'Pattern analysis reveals coordinated wash trades.',
    createdAt: '2026-04-22T14:00:00Z', updatedAt: '2026-06-15T12:00:00Z', walletCount: 23, evidenceCount: 45,
  },
  {
    id: 'case-004', caseNumber: 'CC-2026-0633', title: 'Rug Pull — DeFi Protocol "YieldMaxx"',
    description: 'YieldMaxx DeFi protocol rug pull investigation. Developers drained liquidity pool of approximately $2.3M in ETH.',
    priority: 'medium', status: 'open', investigatorId: 'usr-003', investigatorName: 'ASI Khan',
    department: 'Cyber Crime Cell', notes: 'Deployer wallet under surveillance.',
    createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-06-10T09:00:00Z', walletCount: 5, evidenceCount: 12,
  },
  {
    id: 'case-005', caseNumber: 'CC-2025-1102', title: 'Phishing Wallet Cluster Analysis',
    description: 'Analysis of a cluster of wallets linked to phishing campaigns targeting Indian crypto exchanges.',
    priority: 'low', status: 'closed', investigatorId: 'usr-001', investigatorName: 'Inspector Verma',
    department: 'Cyber Crime Cell', notes: 'Case closed. Report submitted to court.',
    createdAt: '2025-11-02T08:00:00Z', updatedAt: '2026-02-28T17:00:00Z', closedAt: '2026-02-28T17:00:00Z',
    walletCount: 15, evidenceCount: 67,
  },
  {
    id: 'case-006', caseNumber: 'CC-2026-0988', title: 'Crypto Exchange Insider Trading',
    description: 'Suspected insider trading on a domestic crypto exchange. Unusual pre-listing wallet accumulations detected.',
    priority: 'medium', status: 'suspended', investigatorId: 'usr-002', investigatorName: 'SI Patel',
    department: 'Financial Intelligence', notes: 'Awaiting exchange cooperation for KYC data.',
    createdAt: '2026-06-05T13:00:00Z', updatedAt: '2026-06-12T10:00:00Z', walletCount: 3, evidenceCount: 8,
  },
];

export const mockWalletProfile: WalletProfile = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28',
  chain: 'ethereum', balance: 145.832, balanceUSD: 523847.52,
  totalTransactions: 1247, incomingTxns: 623, outgoingTxns: 624,
  firstActivity: '2023-08-15T10:23:00Z', lastActivity: '2026-06-18T14:05:00Z',
  totalVolumeIn: 12450.5, totalVolumeOut: 12304.668, riskScore: 78,
  riskIndicators: [
    { type: 'high_velocity', severity: 'high', description: 'High transaction velocity — 47 txns in last 24h', score: 25 },
    { type: 'fan_out', severity: 'critical', description: 'Fan-out pattern — funds distributed to 23 wallets in rapid succession', score: 30 },
    { type: 'large_concentration', severity: 'medium', description: 'Large transaction concentration — 80% volume in 5 transactions', score: 15 },
    { type: 'mixer_interaction', severity: 'high', description: 'Interaction with known mixing service addresses', score: 8 },
  ],
  tags: ['suspect', 'ponzi-linked', 'high-risk'], isContract: false, label: 'Primary Suspect Wallet',
};

export const mockTransactions: Transaction[] = [
  { hash: '0xa1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890', from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', to: '0x1234567890abcdef1234567890abcdef12345678', value: 15.5, valueUSD: 55677.5, gasUsed: 21000, gasPrice: 25, timestamp: '2026-06-18T14:05:00Z', blockNumber: 19234567, chain: 'ethereum', status: 'success', method: 'transfer' },
  { hash: '0xb2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890ab', from: '0xabcdef1234567890abcdef1234567890abcdef12', to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', value: 250.0, valueUSD: 897750.0, gasUsed: 21000, gasPrice: 30, timestamp: '2026-06-18T12:30:00Z', blockNumber: 19234500, chain: 'ethereum', status: 'success', method: 'transfer' },
  { hash: '0xc3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcd', from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', to: '0x9876543210abcdef9876543210abcdef98765432', value: 50.0, valueUSD: 179550.0, gasUsed: 45000, gasPrice: 28, timestamp: '2026-06-17T22:15:00Z', blockNumber: 19234100, chain: 'ethereum', status: 'success', method: 'swap' },
  { hash: '0xd4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', to: '0xfedcba0987654321fedcba0987654321fedcba09', value: 5.25, valueUSD: 18857.25, gasUsed: 21000, gasPrice: 22, timestamp: '2026-06-17T18:45:00Z', blockNumber: 19233900, chain: 'ethereum', status: 'success', method: 'transfer' },
  { hash: '0xe5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12', from: '0x5555555555555555555555555555555555555555', to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', value: 100.0, valueUSD: 359100.0, gasUsed: 65000, gasPrice: 35, timestamp: '2026-06-17T09:20:00Z', blockNumber: 19233500, chain: 'ethereum', status: 'success', method: 'withdraw' },
  { hash: '0xf67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234', from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', to: '0x2222222222222222222222222222222222222222', value: 0.5, valueUSD: 1795.5, gasUsed: 21000, gasPrice: 20, timestamp: '2026-06-16T15:10:00Z', blockNumber: 19233000, chain: 'ethereum', status: 'failed' },
];

export const mockGraphNodes: GraphNode[] = [
  { id: '0x742d35Cc', label: '0x742d...bD28', type: 'investigated', balance: 145.83, riskScore: 78, tags: ['suspect'] },
  { id: '0x1234abcd', label: '0x1234...5678', type: 'wallet', balance: 23.5, riskScore: 45 },
  { id: '0xabcdef12', label: '0xabcd...ef12', type: 'wallet', balance: 890.2, riskScore: 62, tags: ['high-volume'] },
  { id: '0x9876fedc', label: '0x9876...5432', type: 'exchange', balance: 15000, riskScore: 10, tags: ['exchange'] },
  { id: '0xfedcba09', label: '0xfedc...ba09', type: 'wallet', balance: 5.1, riskScore: 35 },
  { id: '0x55555555', label: '0x5555...5555', type: 'contract', balance: 2500, riskScore: 55, tags: ['defi'] },
  { id: '0x22222222', label: '0x2222...2222', type: 'watchlisted', balance: 0.8, riskScore: 92, tags: ['mixer'] },
  { id: '0x33333333', label: '0x3333...3333', type: 'wallet', balance: 12.4, riskScore: 40 },
  { id: '0x44444444', label: '0x4444...4444', type: 'wallet', balance: 67.8, riskScore: 28 },
  { id: '0x66666666', label: '0x6666...6666', type: 'contract', balance: 450, riskScore: 15, tags: ['verified'] },
  { id: '0x77777777', label: '0x7777...7777', type: 'wallet', balance: 3.2, riskScore: 70, tags: ['suspect'] },
  { id: '0x88888888', label: '0x8888...8888', type: 'exchange', balance: 50000, riskScore: 5, tags: ['cex'] },
];

export const mockGraphEdges: GraphEdge[] = [
  { id: 'e1', source: '0x742d35Cc', target: '0x1234abcd', value: 15.5, txCount: 3 },
  { id: 'e2', source: '0xabcdef12', target: '0x742d35Cc', value: 250, txCount: 5 },
  { id: 'e3', source: '0x742d35Cc', target: '0x9876fedc', value: 50, txCount: 8 },
  { id: 'e4', source: '0x742d35Cc', target: '0xfedcba09', value: 5.25, txCount: 2 },
  { id: 'e5', source: '0x55555555', target: '0x742d35Cc', value: 100, txCount: 4 },
  { id: 'e6', source: '0x742d35Cc', target: '0x22222222', value: 0.5, txCount: 1 },
  { id: 'e7', source: '0x33333333', target: '0xabcdef12', value: 45.2, txCount: 6 },
  { id: 'e8', source: '0x1234abcd', target: '0x44444444', value: 10.1, txCount: 2 },
  { id: 'e9', source: '0x44444444', target: '0x66666666', value: 30, txCount: 3 },
  { id: 'e10', source: '0x22222222', target: '0x77777777', value: 0.3, txCount: 1 },
  { id: 'e11', source: '0x77777777', target: '0x88888888', value: 2.5, txCount: 2 },
  { id: 'e12', source: '0x55555555', target: '0x33333333', value: 80, txCount: 7 },
];

export const mockEvidence: Evidence[] = [
  { id: 'ev-001', caseId: 'case-001', type: 'wallet_address', title: 'Primary Suspect Wallet', description: 'Main wallet identified in GainChain Ponzi scheme — receives victim deposits.', uploadedBy: 'usr-001', uploadedByName: 'Inspector Verma', createdAt: '2026-05-10T10:00:00Z', chainOfCustody: [{ action: 'Created', user: 'Inspector Verma', timestamp: '2026-05-10T10:00:00Z', notes: 'Initial wallet identification' }], metadata: { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28' } },
  { id: 'ev-002', caseId: 'case-001', type: 'transaction_hash', title: 'Victim Deposit — ₹25L', description: 'Transaction from victim wallet depositing 7 ETH to suspect wallet.', uploadedBy: 'usr-001', uploadedByName: 'Inspector Verma', createdAt: '2026-05-12T14:30:00Z', chainOfCustody: [{ action: 'Created', user: 'Inspector Verma', timestamp: '2026-05-12T14:30:00Z' }] },
  { id: 'ev-003', caseId: 'case-001', type: 'screenshot', title: 'GainChain Website Screenshot', description: 'Screenshot of GainChain promotional website promising 500% returns.', fileHash: 'sha256:a3f2b8c9d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8', uploadedBy: 'usr-001', uploadedByName: 'Inspector Verma', createdAt: '2026-05-11T16:00:00Z', chainOfCustody: [{ action: 'Created', user: 'Inspector Verma', timestamp: '2026-05-11T16:00:00Z' }] },
  { id: 'ev-004', caseId: 'case-001', type: 'analyst_note', title: 'Fund Flow Analysis Note', description: 'Detailed analysis of fund flow from victim wallets through intermediaries to suspected cashout points.', uploadedBy: 'usr-001', uploadedByName: 'Inspector Verma', createdAt: '2026-06-01T11:00:00Z', chainOfCustody: [{ action: 'Created', user: 'Inspector Verma', timestamp: '2026-06-01T11:00:00Z' }] },
  { id: 'ev-005', caseId: 'case-002', type: 'blockchain_record', title: 'Ransom Payment TX', description: 'Ethereum transaction representing ransom payment from victim hospital.', uploadedBy: 'usr-001', uploadedByName: 'Inspector Verma', createdAt: '2026-06-02T09:00:00Z', chainOfCustody: [{ action: 'Created', user: 'Inspector Verma', timestamp: '2026-06-02T09:00:00Z' }] },
];

export const mockWatchlist: WatchlistEntry[] = [
  { id: 'wl-001', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', chain: 'ethereum', tag: 'Suspect — GainChain', category: 'suspect', notes: 'Primary suspect wallet in GainChain case', addedBy: 'Inspector Verma', status: 'active', createdAt: '2026-05-10T10:00:00Z', lastActivity: '2026-06-18T14:05:00Z', alertCount: 12 },
  { id: 'wl-002', address: '0x22222222222222222222222222222222222222222', chain: 'ethereum', tag: 'Known Mixer', category: 'mixer', notes: 'Known mixing service — flagged by community', addedBy: 'SI Patel', status: 'active', createdAt: '2026-04-01T08:00:00Z', lastActivity: '2026-06-17T22:10:00Z', alertCount: 34 },
  { id: 'wl-003', address: '0xabcdef1234567890abcdef1234567890abcdef12', chain: 'ethereum', tag: 'High Volume Intermediary', category: 'intermediary', notes: 'Intermediary wallet used for layering', addedBy: 'Inspector Verma', status: 'active', createdAt: '2026-05-15T12:00:00Z', lastActivity: '2026-06-18T12:30:00Z', alertCount: 8 },
  { id: 'wl-004', address: '0x9876543210abcdef9876543210abcdef98765432', chain: 'ethereum', tag: 'Exchange Deposit', category: 'exchange', notes: 'Suspected exchange deposit address', addedBy: 'ASI Khan', status: 'active', createdAt: '2026-06-01T14:00:00Z', lastActivity: '2026-06-17T22:15:00Z', alertCount: 3 },
  { id: 'wl-005', address: '0x11111111111111111111111111111111111111111', chain: 'ethereum', tag: 'Phishing Wallet', category: 'phishing', notes: 'Linked to phishing campaign targeting WazirX users', addedBy: 'Inspector Verma', status: 'inactive', createdAt: '2025-11-05T09:00:00Z', alertCount: 0 },
];

export const mockAlerts: Alert[] = [
  { id: 'al-001', watchlistId: 'wl-001', severity: 'critical', type: 'large_transfer', message: 'Suspect wallet 0x742d...bD28 received 250 ETH ($897,750) from intermediary', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', isRead: false, createdAt: '2026-06-18T12:30:00Z' },
  { id: 'al-002', watchlistId: 'wl-002', severity: 'high', type: 'mixer_activity', message: 'Watched mixer 0x2222...2222 processed 15 transactions in last hour', address: '0x22222222222222222222222222222222222222222', isRead: false, createdAt: '2026-06-18T11:00:00Z' },
  { id: 'al-003', watchlistId: 'wl-001', severity: 'high', type: 'fan_out', message: 'Fan-out detected: 0x742d...bD28 distributed funds to 5 new wallets', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', isRead: false, createdAt: '2026-06-18T09:45:00Z' },
  { id: 'al-004', severity: 'medium', type: 'velocity_spike', message: 'Transaction velocity spike on watched wallet 0xabcd...ef12', address: '0xabcdef1234567890abcdef1234567890abcdef12', isRead: true, createdAt: '2026-06-17T16:20:00Z' },
  { id: 'al-005', severity: 'low', type: 'new_interaction', message: 'Watched wallet 0x9876...5432 interacted with new unidentified contract', address: '0x9876543210abcdef9876543210abcdef98765432', isRead: true, createdAt: '2026-06-17T10:00:00Z' },
  { id: 'al-006', watchlistId: 'wl-001', severity: 'critical', type: 'exchange_deposit', message: 'Suspect wallet 0x742d...bD28 deposited 50 ETH to exchange', isRead: false, createdAt: '2026-06-17T22:15:00Z' },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'aud-001', userId: 'usr-001', userName: 'Inspector Verma', action: 'WALLET_TRACE', resource: 'blockchain', resourceId: '0x742d35Cc', ipAddress: '10.0.1.45', caseRef: 'CC-2026-0847', createdAt: '2026-06-18T14:30:00Z' },
  { id: 'aud-002', userId: 'usr-001', userName: 'Inspector Verma', action: 'LOGIN', resource: 'auth', ipAddress: '10.0.1.45', createdAt: '2026-06-18T10:30:00Z' },
  { id: 'aud-003', userId: 'usr-002', userName: 'SI Patel', action: 'EVIDENCE_UPLOAD', resource: 'evidence', resourceId: 'ev-003', ipAddress: '10.0.1.52', caseRef: 'CC-2026-0756', createdAt: '2026-06-18T09:15:00Z' },
  { id: 'aud-004', userId: 'usr-001', userName: 'Inspector Verma', action: 'REPORT_EXPORT', resource: 'reports', resourceId: 'rpt-001', ipAddress: '10.0.1.45', caseRef: 'CC-2026-0847', createdAt: '2026-06-17T17:00:00Z' },
  { id: 'aud-005', userId: 'usr-003', userName: 'ASI Khan', action: 'CASE_CREATE', resource: 'cases', resourceId: 'case-004', ipAddress: '10.0.1.60', createdAt: '2026-06-17T15:00:00Z' },
  { id: 'aud-006', userId: 'usr-001', userName: 'Inspector Verma', action: 'WATCHLIST_ADD', resource: 'watchlist', resourceId: 'wl-003', ipAddress: '10.0.1.45', caseRef: 'CC-2026-0847', createdAt: '2026-06-17T12:00:00Z' },
  { id: 'aud-007', userId: 'usr-002', userName: 'SI Patel', action: 'LOGIN', resource: 'auth', ipAddress: '10.0.1.52', createdAt: '2026-06-17T09:00:00Z' },
  { id: 'aud-008', userId: 'usr-001', userName: 'Inspector Verma', action: 'GRAPH_EXPORT', resource: 'graph', ipAddress: '10.0.1.45', caseRef: 'CC-2026-0847', createdAt: '2026-06-16T16:30:00Z' },
];

export const mockDashboardStats: DashboardStats = {
  activeCases: 4, openInvestigations: 6, watchedWallets: 5,
  totalEvidence: 186, recentAlerts: 6, totalUsers: 12,
  casesThisMonth: 3, closedCases: 1,
};

export const mockTimeline: TimelineEntry[] = [
  { id: 'tl-001', type: 'alert', title: 'Critical Alert — Large Transfer', description: 'Suspect wallet received 250 ETH from intermediary', timestamp: '2026-06-18T12:30:00Z', user: 'System', caseRef: 'CC-2026-0847' },
  { id: 'tl-002', type: 'trace', title: 'Wallet Traced', description: 'Multi-hop trace completed on 0x742d...bD28', timestamp: '2026-06-18T10:45:00Z', user: 'Inspector Verma', caseRef: 'CC-2026-0847' },
  { id: 'tl-003', type: 'evidence', title: 'Evidence Uploaded', description: 'Screenshot of GainChain promotional material added', timestamp: '2026-06-18T09:15:00Z', user: 'SI Patel', caseRef: 'CC-2026-0756' },
  { id: 'tl-004', type: 'case', title: 'Case Updated', description: 'Case CC-2026-0912 status changed to Active', timestamp: '2026-06-17T16:00:00Z', user: 'Inspector Verma', caseRef: 'CC-2026-0912' },
  { id: 'tl-005', type: 'report', title: 'Report Generated', description: 'PDF forensic report exported for CC-2026-0847', timestamp: '2026-06-17T17:00:00Z', user: 'Inspector Verma', caseRef: 'CC-2026-0847' },
  { id: 'tl-006', type: 'alert', title: 'High Alert — Mixer Activity', description: 'Watched mixer processed 15 transactions', timestamp: '2026-06-18T11:00:00Z', user: 'System' },
];

export const mockReports: Report[] = [
  { id: 'rpt-001', caseId: 'case-001', caseNumber: 'CC-2026-0847', title: 'GainChain Network — Forensic Analysis Report', format: 'pdf', generatedBy: 'Inspector Verma', createdAt: '2026-06-17T17:00:00Z', fileSize: '2.4 MB' },
  { id: 'rpt-002', caseId: 'case-001', caseNumber: 'CC-2026-0847', title: 'Wallet Transaction Export — 0x742d', format: 'csv', generatedBy: 'Inspector Verma', createdAt: '2026-06-16T14:00:00Z', fileSize: '856 KB' },
  { id: 'rpt-003', caseId: 'case-002', caseNumber: 'CC-2026-0912', title: 'MedLock Ransom — Payment Trail Analysis', format: 'pdf', generatedBy: 'Inspector Verma', createdAt: '2026-06-15T11:00:00Z', fileSize: '1.8 MB' },
  { id: 'rpt-004', caseId: 'case-003', caseNumber: 'CC-2026-0756', title: 'NFT Wash Trading — Transaction Data', format: 'json', generatedBy: 'SI Patel', createdAt: '2026-06-14T09:00:00Z', fileSize: '3.1 MB' },
];
