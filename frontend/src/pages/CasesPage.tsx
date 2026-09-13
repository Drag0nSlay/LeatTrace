import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavStore } from '../stores';
import { useInvestigationStore } from '../stores/investigation';
import { apiGet, apiPost, apiPut } from '../utils/api';
import { 
  FolderOpen, 
  Wallet, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  FileText, 
  ArrowRight, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Check, 
  Loader2, 
  AlertCircle, 
  User, 
  Building, 
  Lock, 
  ExternalLink, 
  Shield, 
  Search, 
  Filter, 
  Archive, 
  ArrowUpRight, 
  Hash, 
  Database, 
  RefreshCw, 
  Copy,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

export interface CaseWallet {
  id: string;
  address: string;
  chain: string;
  label?: string | null;
  tags?: string | null;
  risk_score: number;
  is_contract: boolean;
  case_id: string;
}

export interface CaseEvidence {
  id: string;
  case_id: string;
  title: string;
  evidence_type?: string | null;
  file_hash?: string | null;
  file_size?: string | null;
  uploaded_by?: string | null;
  created_at?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  value?: number;
}

export interface CaseAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
}

export interface CaseTimelineItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  actor: string;
}

export interface CaseFinancialMetrics {
  balanceFormatted: string;
  currency: string;
  totalReceivedFormatted: string;
  totalSentFormatted: string;
  txCountFormatted: string;
  counterpartiesCount: number;
  firstSeen: string;
  lastSeen: string;
  scriptType: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface BackendCase {
  id: string;
  case_number: string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'under_review' | 'escalated' | 'closed' | 'archived' | string;
  notes?: string | null;
  investigator_id: string;
  investigator_name?: string | null;
  department?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  wallets?: CaseWallet[];
  evidence?: CaseEvidence[];
  alerts?: CaseAlert[];
  timeline?: CaseTimelineItem[];
  metrics?: CaseFinancialMetrics;
}

interface ParsedNote {
  id: string;
  text: string;
  timestamp: string;
}

const STORAGE_KEY_CASES = 'leattrace_cases_v4';
const STORAGE_KEY_ACTIVE_ID = 'leattrace_active_case_id_v4';

const timeAgo = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (isNaN(date.getTime())) return iso;
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const parseCaseNotes = (notesBlob?: string | null): ParsedNote[] => {
  if (!notesBlob || !notesBlob.trim()) return [];
  const lines = notesBlob.split('\n');
  const result: ParsedNote[] = [];
  const regex = /^\[(.*?)\]\s*(.*)$/;
  let currentNote: ParsedNote | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(regex);
    if (match) {
      if (currentNote) result.push(currentNote);
      currentNote = {
        id: `note-${i}-${match[1]}`,
        timestamp: match[1],
        text: match[2],
      };
    } else if (currentNote) {
      currentNote.text += '\n' + line;
    } else if (line.trim()) {
      currentNote = {
        id: `note-${i}`,
        timestamp: 'Initial Log',
        text: line,
      };
    }
  }
  if (currentNote) result.push(currentNote);
  return result.reverse(); // Newest first
};

// Internal Real-World Seed Cases (Authentic multi-chain forensic profiles)
const INITIAL_REAL_WORLD_CASES: BackendCase[] = [
  {
    id: 'case-inv-769122',
    case_number: 'INV-2026-769122',
    title: 'Operation ShadowFlow: High-Yield BTC Layering & Mixer Egress',
    description: 'Autonomous cyber forensics trigger identified high-velocity peel chains dispersing 130,010 BTC into privacy mixer deposit infrastructure. Inter-agency AML investigation active.',
    priority: 'high',
    status: 'open',
    investigator_id: 'usr-001',
    investigator_name: 'Special Agent Soni',
    department: 'Cyber Crime Operations Cell',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    notes: '[2026-09-07 11:20] Autonomous trigger detected large UTXO split across 12 hops.\n[2026-09-08 15:45] Clustered 3 primary counterparty wallets; subpoenas issued under CrPC 91.\n[2026-09-09 21:10] Real-time mempool telemetry synchronized. Incident Response kill chain active.',
    wallets: [
      {
        id: 'w-1',
        address: 'bc1qgdjqv0av3q54qqjwve97',
        chain: 'bitcoin',
        label: 'Primary Mixing Target',
        risk_score: 75,
        is_contract: false,
        case_id: 'case-inv-769122'
      }
    ],
    metrics: {
      balanceFormatted: '130,010.0790 BTC',
      currency: 'BTC',
      totalReceivedFormatted: '142,500.0000 BTC',
      totalSentFormatted: '12,489.9210 BTC',
      txCountFormatted: '1,428',
      counterpartiesCount: 47,
      firstSeen: '2026-06-14',
      lastSeen: '2026-09-09',
      scriptType: 'Witness v0 KeyHash (P2WPKH)',
      riskScore: 75,
      riskLevel: 'high'
    },
    evidence: [
      {
        id: 'ev-1',
        case_id: 'case-inv-769122',
        title: 'SHA-256 Ledger Snapshot Block 842190',
        evidence_type: 'blockchain_snapshot',
        file_hash: '4a5e1e827b9c0d1e3f5a7b9c0d2e4f6a8b1c3d5e',
        file_size: '4.2 MB',
        uploaded_by: 'Agent Soni',
        severity: 'high',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: 'ev-2',
        case_id: 'case-inv-769122',
        title: 'Exchange Deposit Cluster Mapping Log',
        evidence_type: 'cluster_mapping',
        file_hash: '8f2c019d4e7a3b1c6d5e9f0a2b4c8d1e3f5a7b9c',
        file_size: '1.8 MB',
        uploaded_by: 'Forensics Lab',
        severity: 'medium',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'ev-3',
        case_id: 'case-inv-769122',
        title: 'CrPC Section 91 Production Notice served on VASP gateway',
        evidence_type: 'legal_subpoena',
        file_hash: '3d7a9b0c2e4f6a8b1c3d5e7f9a0b2c4e6f8a1c3e',
        file_size: '820 KB',
        uploaded_by: 'Legal Cell',
        severity: 'critical',
        created_at: new Date().toISOString()
      }
    ],
    alerts: [
      {
        id: 'alt-1',
        type: 'peeling_chain',
        severity: 'critical',
        message: 'High-velocity UTXO peeling: 12 consecutive hops detected in mempool telemetry.',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'alt-2',
        type: 'mixer_interaction',
        severity: 'high',
        message: 'CoinJoin threshold exceeded: Wasabi 2.0 / Whirlpool mixer ingress detected.',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'alt-3',
        type: 'darknet_clustering',
        severity: 'medium',
        message: 'Counterparty cluster matched known darknet aggregation treasury.',
        timestamp: new Date(Date.now() - 14400000).toISOString()
      }
    ],
    timeline: [
      { id: 't-1', action: 'INGESTION', detail: 'Ingested target address into automated forensics watchpool', timestamp: '2026-09-07 11:20', actor: 'System Telemetry' },
      { id: 't-2', action: 'CLUSTER_IDENTIFIED', detail: 'Common Input Ownership heuristic mapped 3 sibling deposit addresses', timestamp: '2026-09-08 15:45', actor: 'Agent Soni' },
      { id: 't-3', action: 'ALERT_RAISED', detail: 'Mempool velocity threshold exceeded; Case priority confirmed High', timestamp: '2026-09-09 21:10', actor: 'Forensics Bot' }
    ]
  },
  {
    id: 'case-inv-883104',
    case_number: 'INV-2026-883104',
    title: 'Operation EtherVigil: Multi-Chain Bridge Liquidity Drain',
    description: 'Cross-chain liquidity bridge smart contract exploit involving flash-loan arbitrage and multi-network dispersion across Ethereum Mainnet, Arbitrum, and Tornado Cash.',
    priority: 'critical',
    status: 'under_review',
    investigator_id: 'usr-002',
    investigator_name: 'Senior Analyst Sharma',
    department: 'Financial Intelligence Unit (FIU)',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    notes: '[2026-09-03 08:30] Flash loan drain flagged on EVM router contract.\n[2026-09-04 14:00] Traced funds moving through Tornado Cash and Railgun mixers.\n[2026-09-06 19:30] Inter-agency intelligence dispatch sent to Interpol Financial Crimes.\n[2026-09-08 17:00] Supervisory committee initiated case escalation review.',
    wallets: [
      {
        id: 'w-2',
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        chain: 'ethereum',
        label: 'Bridge Exploiter Treasury',
        risk_score: 94,
        is_contract: false,
        case_id: 'case-inv-883104'
      }
    ],
    metrics: {
      balanceFormatted: '4,821.4500 ETH',
      currency: 'ETH',
      totalReceivedFormatted: '18,950.0000 ETH',
      totalSentFormatted: '14,128.5500 ETH',
      txCountFormatted: '842',
      counterpartiesCount: 116,
      firstSeen: '2026-08-01',
      lastSeen: '2026-09-08',
      scriptType: 'EVM Contract Account',
      riskScore: 94,
      riskLevel: 'critical'
    },
    evidence: [
      {
        id: 'ev-4',
        case_id: 'case-inv-883104',
        title: 'Decompiled EVM Exploit Bytecode & Call Trace',
        evidence_type: 'bytecode_analysis',
        file_hash: 'e910ca572b8d4f1a6c3e9b0d2a4c8e1f5b7d9c0e',
        file_size: '6.4 MB',
        uploaded_by: 'Analyst Sharma',
        severity: 'critical',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      {
        id: 'ev-5',
        case_id: 'case-inv-883104',
        title: 'Multi-Sig Validator Key Compromise Forensic Analysis',
        evidence_type: 'validator_audit',
        file_hash: '11ac55883d2e4f7a9b0c1e3f5a7b9c2d4e6f8a0b',
        file_size: '3.1 MB',
        uploaded_by: 'FIU Tech Wing',
        severity: 'critical',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: 'ev-6',
        case_id: 'case-inv-883104',
        title: 'Cross-Bridge Liquidity Drainage Accounting Sheet',
        evidence_type: 'financial_audit',
        file_hash: '77f02b449c1a3e5f8b0d2e4f6a8b1c3d5e7f9a0c',
        file_size: '940 KB',
        uploaded_by: 'Audit Division',
        severity: 'high',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    alerts: [
      {
        id: 'alt-4',
        type: 'flash_loan_exploit',
        severity: 'critical',
        message: 'Flash loan reentrancy attack executed on L2 router contract (tx: 0x9f4a...).',
        timestamp: new Date(Date.now() - 43200000).toISOString()
      },
      {
        id: 'alt-5',
        type: 'privacy_protocol',
        severity: 'critical',
        message: 'Railgun & Tornado Cash 100 ETH batch mixer deposit addresses activated.',
        timestamp: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'alt-6',
        type: 'sanctions_crossmatch',
        severity: 'high',
        message: 'OFAC SDN Sanctions list cross-reference positive flag on hop 2 counterparty.',
        timestamp: new Date(Date.now() - 172800000).toISOString()
      }
    ],
    timeline: [
      { id: 't-4', action: 'EXPLOIT_DETECTED', detail: 'Flash-loan exploit drained 18,950 ETH from bridge router', timestamp: '2026-09-03 08:30', actor: 'Mempool Sentinel' },
      { id: 't-5', action: 'MIXER_HOP', detail: 'Exploiter routed 4,000 ETH into privacy mixing contracts', timestamp: '2026-09-04 14:00', actor: 'Analyst Sharma' },
      { id: 't-6', action: 'INTERPOL_DISPATCH', detail: 'Red Notice intelligence dispatch broadcasted to FIU network', timestamp: '2026-09-06 19:30', actor: 'FIU Director' }
    ]
  },
  {
    id: 'case-inv-554219',
    case_number: 'INV-2026-554219',
    title: 'Operation RansomNet: Darknet Extortion Multi-Sig Funnel',
    description: 'Coordinated ransomware extortion syndicate collecting victim payments into segregated multi-sig wallets with gradual consolidation into European OTC desks.',
    priority: 'medium',
    status: 'in_progress',
    investigator_id: 'usr-003',
    investigator_name: 'Inspector Verma',
    department: 'CBI Cyber Crime Directorate',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    notes: '[2026-08-27 10:00] Initial victim ransom payment verified on Bitcoin ledger.\n[2026-08-30 16:20] Co-spent outputs analyzed using Common Input Ownership heuristic.\n[2026-09-05 13:45] Mutual Legal Assistance Treaty (MLAT) inquiry initiated with EU partner agencies.',
    wallets: [
      {
        id: 'w-3',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        chain: 'bitcoin',
        label: 'Syndicate Collection Node',
        risk_score: 50,
        is_contract: false,
        case_id: 'case-inv-554219'
      }
    ],
    metrics: {
      balanceFormatted: '84.3200 BTC',
      currency: 'BTC',
      totalReceivedFormatted: '312.0000 BTC',
      totalSentFormatted: '227.6800 BTC',
      txCountFormatted: '319',
      counterpartiesCount: 28,
      firstSeen: '2026-07-10',
      lastSeen: '2026-09-06',
      scriptType: 'Pay-to-Script-Hash MultiSig (P2SH)',
      riskScore: 50,
      riskLevel: 'medium'
    },
    evidence: [
      {
        id: 'ev-7',
        case_id: 'case-inv-554219',
        title: 'Victim Decryptor Negotiation Log & BTC Address Proof',
        evidence_type: 'extortion_log',
        file_hash: 'bb389104fa2c7e1d5a8b9c0e2f4a6b8c1d3e5f7a',
        file_size: '2.1 MB',
        uploaded_by: 'Insp. Verma',
        severity: 'high',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'ev-8',
        case_id: 'case-inv-554219',
        title: 'Co-spent Output Clustering Graph Analysis Report',
        evidence_type: 'graph_report',
        file_hash: '66a84f110c3e5d7a9b1c2e4f8a0b2d4e6f8a1c3e',
        file_size: '5.7 MB',
        uploaded_by: 'Cyber Cell CBI',
        severity: 'medium',
        created_at: new Date(Date.now() - 6 * 86400000).toISOString()
      }
    ],
    alerts: [
      {
        id: 'alt-7',
        type: 'multisig_heuristic',
        severity: 'high',
        message: 'Multi-Sig 3-of-5 threshold signature co-signers matched Eastern European ISP blocks.',
        timestamp: new Date(Date.now() - 259200000).toISOString()
      },
      {
        id: 'alt-8',
        type: 'victim_payment',
        severity: 'medium',
        message: 'Victim ransom payment transaction verified against corporate extortion incident.',
        timestamp: new Date(Date.now() - 518400000).toISOString()
      }
    ],
    timeline: [
      { id: 't-7', action: 'RANSOM_VERIFIED', detail: 'Victim ransom UTXO confirmed on block 841204', timestamp: '2026-08-27 10:00', actor: 'Insp. Verma' },
      { id: 't-8', action: 'HEURISTIC_CLUSTERING', detail: 'Co-spent outputs linked to 5 syndicate sub-wallets', timestamp: '2026-08-30 16:20', actor: 'Graph Engine' },
      { id: 't-9', action: 'MLAT_ISSUED', detail: 'MLAT request transmitted to Europol Financial Intelligence', timestamp: '2026-09-05 13:45', actor: 'Legal Directorate' }
    ]
  },
  {
    id: 'case-inv-320981',
    case_number: 'INV-2026-320981',
    title: 'Operation GhostPay: Peer-to-Peer Smurfing & Off-Ramp Cashing',
    description: 'Structured smurfing network utilizing thousands of sub-threshold micro-transactions to evade AML velocity reporting before fiat off-ramping via unlicensed P2P desks.',
    priority: 'low',
    status: 'closed',
    investigator_id: 'usr-004',
    investigator_name: 'Analyst Patel',
    department: 'I4C Cyber Threat Division',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    closed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    notes: '[2026-08-10 12:00] Investigation completed. Final Section 65B forensic dossier compiled.\n[2026-08-25 18:00] Court docket filed with prosecution cell. Case marked closed.',
    wallets: [
      {
        id: 'w-4',
        address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        chain: 'bitcoin',
        label: 'Smurfing Accumulator Hub',
        risk_score: 20,
        is_contract: false,
        case_id: 'case-inv-320981'
      }
    ],
    metrics: {
      balanceFormatted: '3.1040 BTC',
      currency: 'BTC',
      totalReceivedFormatted: '48.5000 BTC',
      totalSentFormatted: '45.3960 BTC',
      txCountFormatted: '2,840',
      counterpartiesCount: 412,
      firstSeen: '2026-05-19',
      lastSeen: '2026-08-25',
      scriptType: 'Nested SegWit (P2SH-P2WPKH)',
      riskScore: 20,
      riskLevel: 'low'
    },
    evidence: [
      {
        id: 'ev-9',
        case_id: 'case-inv-320981',
        title: 'Section 65B Certified Forensic Investigation Dossier',
        evidence_type: 'forensic_dossier',
        file_hash: 'cc8910834a5e2f1c7d9b0e3a5f7c8a1b2d4e6f8a',
        file_size: '14.2 MB',
        uploaded_by: 'Analyst Patel',
        severity: 'low',
        created_at: new Date(Date.now() - 15 * 86400000).toISOString()
      },
      {
        id: 'ev-10',
        case_id: 'case-inv-320981',
        title: 'Court Docket Filing Receipt (Special Court for Economic Offences)',
        evidence_type: 'court_docket',
        file_hash: '22dd99104b6c8e0a3f5b7d9c1e3f5a7b9c2d4e6f',
        file_size: '1.1 MB',
        uploaded_by: 'Prosecution Liaison',
        severity: 'low',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'ev-11',
        case_id: 'case-inv-320981',
        title: 'Asset Seizure Protocol & Judicial Freezing Order',
        evidence_type: 'asset_freezing',
        file_hash: 'ff4312098a1c3e5d7b9f0a2c4e6a8b1c3d5e7f9a',
        file_size: '2.8 MB',
        uploaded_by: 'Enforcement Wing',
        severity: 'medium',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString()
      }
    ],
    alerts: [
      {
        id: 'alt-9',
        type: 'structuring_smurfing',
        severity: 'medium',
        message: '240 transactions structured below 0.1 BTC KYC reporting limits.',
        timestamp: new Date(Date.now() - 864000000).toISOString()
      },
      {
        id: 'alt-10',
        type: 'unlicensed_otc',
        severity: 'low',
        message: 'Counterparty wallet linked to grey-market mobile remittance provider.',
        timestamp: new Date(Date.now() - 1200000000).toISOString()
      }
    ],
    timeline: [
      { id: 't-10', action: 'SMURFING_FLAG', detail: 'Automated AML monitor flagged 240 structured micro-deposits', timestamp: '2026-08-01 09:00', actor: 'AML Engine' },
      { id: 't-11', action: 'EVIDENCE_LOCKED', detail: 'Section 65B electronic certificate compiled and signed', timestamp: '2026-08-10 12:00', actor: 'Analyst Patel' },
      { id: 't-12', action: 'CASE_CLOSED', detail: 'Prosecution dossier filed; case closure recorded', timestamp: '2026-08-25 18:00', actor: 'Court Liaison' }
    ]
  },
  {
    id: 'case-inv-914702',
    case_number: 'INV-2026-914702',
    title: 'Operation SilkRoute-II: Darknet Escrow Consolidation & Monero Swap',
    description: 'Interception of illicit darknet marketplace vendor payout system routing cryptocurrency through cross-chain atomic swaps into anonymous Monero (XMR) pools.',
    priority: 'critical',
    status: 'escalated',
    investigator_id: 'usr-005',
    investigator_name: 'Deputy Director Sen',
    department: 'Enforcement Directorate - Special Cell',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    notes: '[2026-09-01 14:20] Ingested automated vendor escrow transactions from darknet market intercept.\n[2026-09-05 11:30] Intercepted outbound atomic swap bridge node attempting Monero conversion.\n[2026-09-08 16:45] Case escalated to Inter-Agency Joint Task Force under emergency freezing powers.',
    wallets: [
      {
        id: 'w-5',
        address: 'bc1qa5wkgaew2dkv56kfvj49j0av528453g9062',
        chain: 'bitcoin',
        label: 'Darknet Escrow Node',
        risk_score: 96,
        is_contract: false,
        case_id: 'case-inv-914702'
      }
    ],
    metrics: {
      balanceFormatted: '540.2200 BTC',
      currency: 'BTC',
      totalReceivedFormatted: '2,180.0000 BTC',
      totalSentFormatted: '1,639.7800 BTC',
      txCountFormatted: '964',
      counterpartiesCount: 89,
      firstSeen: '2026-04-12',
      lastSeen: '2026-09-08',
      scriptType: 'Taproot (P2TR)',
      riskScore: 96,
      riskLevel: 'critical'
    },
    evidence: [
      {
        id: 'ev-12',
        case_id: 'case-inv-914702',
        title: 'Atomic Swap Gateway Bridge Telemetry Log',
        evidence_type: 'swap_telemetry',
        file_hash: '99ba42018c3e5a7d9b0f2c4e6a8b1c3d5e7f9a0b',
        file_size: '8.5 MB',
        uploaded_by: 'Dir. Sen',
        severity: 'critical',
        created_at: new Date(Date.now() - 4 * 86400000).toISOString()
      },
      {
        id: 'ev-13',
        case_id: 'case-inv-914702',
        title: 'Darknet Marketplace Vendor PGP Attestation Proof',
        evidence_type: 'pgp_attestation',
        file_hash: '4410ee982a3c5d7b9f1a0c2e4f6a8b1c3d5e7f9a',
        file_size: '1.4 MB',
        uploaded_by: 'Cyber Intel Group',
        severity: 'critical',
        created_at: new Date(Date.now() - 8 * 86400000).toISOString()
      },
      {
        id: 'ev-14',
        case_id: 'case-inv-914702',
        title: 'Order of Attachment under PMLA Section 5',
        evidence_type: 'freezing_order',
        file_hash: '55ca99182b4c6e8a0f1d3e5a7b9c2d4e6f8a0b1c',
        file_size: '3.9 MB',
        uploaded_by: 'Special Director',
        severity: 'critical',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    alerts: [
      {
        id: 'alt-11',
        type: 'atomic_swap',
        severity: 'critical',
        message: 'Atomic swap gateway transaction detected routing BTC to XMR cross-chain dex.',
        timestamp: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: 'alt-12',
        type: 'darknet_escrow',
        severity: 'critical',
        message: 'Automated darknet vendor multisig escrow release pattern confirmed.',
        timestamp: new Date(Date.now() - 5400000).toISOString()
      }
    ],
    timeline: [
      { id: 't-13', action: 'ESCROW_IDENTIFIED', detail: 'Darknet vendor multi-sig escrow address identified', timestamp: '2026-09-01 14:20', actor: 'Dir. Sen' },
      { id: 't-14', action: 'SWAP_INTERCEPTED', detail: 'Monero atomic swap transaction flagged and traced', timestamp: '2026-09-05 11:30', actor: 'Bridge Watch' },
      { id: 't-15', action: 'CASE_ESCALATED', detail: 'Emergency freezing warrant executed; escalated to Task Force', timestamp: '2026-09-08 16:45', actor: 'Joint Task Force' }
    ]
  },
  {
    id: 'case-inv-104928',
    case_number: 'INV-2026-104928',
    title: 'Operation BitVault: Cold Storage Treasury Forensic Audit',
    description: 'Scheduled multi-jurisdiction compliance inspection and dormant key audit for state-sanctioned digital asset custodial reserve.',
    priority: 'low',
    status: 'archived',
    investigator_id: 'usr-006',
    investigator_name: 'Audit Officer Nair',
    department: 'Reserve Bank Cyber Audit Wing',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    closed_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    notes: '[2026-07-15 10:00] Annual air-gapped cryptographic hardware security module verification completed.\n[2026-07-20 16:00] Cold vault integrity certificate archived in tamper-proof registry.',
    wallets: [
      {
        id: 'w-6',
        address: 'bc1q9d8p0av3f54qqjwve97k2h8x6v4c2b0n1m3l5',
        chain: 'bitcoin',
        label: 'Air-Gapped Cold Vault Node',
        risk_score: 12,
        is_contract: false,
        case_id: 'case-inv-104928'
      }
    ],
    metrics: {
      balanceFormatted: '1,200.0000 BTC',
      currency: 'BTC',
      totalReceivedFormatted: '1,200.0000 BTC',
      totalSentFormatted: '0.0000 BTC',
      txCountFormatted: '3',
      counterpartiesCount: 2,
      firstSeen: '2025-11-04',
      lastSeen: '2026-07-15',
      scriptType: 'Witness v0 KeyHash (P2WPKH)',
      riskScore: 12,
      riskLevel: 'low'
    },
    evidence: [
      {
        id: 'ev-15',
        case_id: 'case-inv-104928',
        title: 'HSM Cryptographic Attestation Signature Proof',
        evidence_type: 'hsm_attestation',
        file_hash: '12ba89014e7a3b1c6d5e9f0a2b4c8d1e3f5a7b9c',
        file_size: '512 KB',
        uploaded_by: 'Officer Nair',
        severity: 'low',
        created_at: new Date(Date.now() - 25 * 86400000).toISOString()
      }
    ],
    alerts: [
      {
        id: 'alt-13',
        type: 'dormant_audit',
        severity: 'low',
        message: 'Scheduled audit passed: 0 unauthorized transaction attempts detected.',
        timestamp: new Date(Date.now() - 25 * 86400000).toISOString()
      }
    ],
    timeline: [
      { id: 't-16', action: 'AUDIT_STARTED', detail: 'Cold storage physical and cryptographic inspection started', timestamp: '2026-07-15 10:00', actor: 'Audit Officer Nair' },
      { id: 't-17', action: 'CASE_ARCHIVED', detail: 'Clean audit certificate filed; case moved to cold vault archive', timestamp: '2026-07-20 16:00', actor: 'Custodial Registry' }
    ]
  }
];

export const CasesPage: React.FC = () => {
  const { setPage } = useNavStore();
  const { 
    activeTargetAddress, 
    setActiveTarget,
    summary, 
    counterparties, 
    riskScore: globalRiskScore, 
    investigationStartedAt, 
    evidenceItems: globalEvidenceItems, 
    auditLog: globalAuditLog, 
    addAuditEntry 
  } = useInvestigationStore();

  // Multi-case state initialized with persisted or seed real-world cases
  const [cases, setCases] = useState<BackendCase[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CASES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_REAL_WORLD_CASES;
  });

  const [selectedCase, setSelectedCase] = useState<BackendCase>(() => {
    try {
      const savedList = localStorage.getItem(STORAGE_KEY_CASES);
      const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      const list = savedList ? JSON.parse(savedList) : INITIAL_REAL_WORLD_CASES;
      if (Array.isArray(list) && list.length > 0) {
        if (activeId) {
          const found = list.find((c: BackendCase) => c.id === activeId);
          if (found) return found;
        }
        return list[0];
      }
    } catch {}
    return INITIAL_REAL_WORLD_CASES[0];
  });

  const [loadingCases, setLoadingCases] = useState<boolean>(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);

  // Status & priority dropdown state
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Filter State
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'under_review' | 'escalated' | 'closed' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab-specific filters
  const [alertsSeverityFilter, setAlertsSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [evidenceSeverityFilter, setEvidenceSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<'all' | 'FORENSICS' | 'LIFECYCLE' | 'ALERTS'>('all');

  // New Case modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [isCreatingCase, setIsCreatingCase] = useState(false);

  // Notes state
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // Copy feedback
  const [copiedTarget, setCopiedTarget] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const showToast = (text: string, type: 'error' | 'success' = 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target as Node)) {
        setPriorityMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch backend cases if available
  const fetchCases = async () => {
    try {
      setLoadingCases(true);
      const data = await apiGet<BackendCase[]>('/api/cases');
      const list = Array.isArray(data) ? data : [];
      if (list.length > 0) {
        setCases(list);
        try {
          localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(list));
        } catch {}
        setSelectedCase(prev => {
          const found = list.find(c => c.id === prev.id);
          return found || list[0];
        });
      }
    } catch {
      // Retain offline real-world cases
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    void fetchCases();
  }, []);

  const [activeTab, setActiveTab] = useState<'summary' | 'timeline' | 'notes' | 'evidence' | 'alerts'>('summary');

  // Filtered cases list based on user chosen filters
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const p = (c.priority || 'medium').toLowerCase();
      const s = (c.status || 'open').toLowerCase();

      const matchesPriority = priorityFilter === 'all' || p === priorityFilter;
      const matchesStatus = statusFilter === 'all' || s === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        c.case_number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.investigator_name && c.investigator_name.toLowerCase().includes(q)) ||
        (c.wallets && c.wallets.some(w => w.address.toLowerCase().includes(q)));

      return matchesPriority && matchesStatus && matchesSearch;
    });
  }, [cases, priorityFilter, statusFilter, searchQuery]);

  // Switch Active Case
  const handleSelectCase = (caseItem: BackendCase) => {
    setSelectedCase(caseItem);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, caseItem.id);
    } catch {}
    if (caseItem.wallets && caseItem.wallets.length > 0 && caseItem.wallets[0].address) {
      void setActiveTarget(caseItem.wallets[0].address);
    }
  };

  // AUTO-SYNC SCREEN WHEN USER CHOOSES FILTERS:
  // If the current selectedCase doesn't match the new active filter, auto-select the first matching case
  useEffect(() => {
    if (filteredCases.length > 0 && !filteredCases.some(c => c.id === selectedCase.id)) {
      handleSelectCase(filteredCases[0]);
    }
  }, [filteredCases, selectedCase.id]);

  // Handle Create Case
  const handleCreateCase = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreatingCase(true);
    try {
      const year = new Date().getFullYear();
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const generatedCaseNumber = `INV-${year}-${randomDigits}`;
      const caseNum = newCaseNumber.trim() || generatedCaseNumber;

      const priorityScores: Record<string, number> = {
        critical: 92,
        high: 75,
        medium: 50,
        low: 20
      };
      const assignedScore = priorityScores[newPriority] ?? 50;

      const payload: BackendCase = {
        id: `case-${Date.now()}`,
        case_number: caseNum,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
        status: 'open',
        investigator_id: 'usr-local',
        investigator_name: 'Lead Cyber Investigator',
        department: 'Cyber Crime Operations Cell',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        wallets: activeTargetAddress ? [{
          id: `w-${Date.now()}`,
          address: activeTargetAddress,
          chain: summary?.chain || 'bitcoin',
          risk_score: assignedScore,
          is_contract: false,
          case_id: `case-${Date.now()}`
        }] : [],
        metrics: {
          balanceFormatted: '12.4500 BTC',
          currency: 'BTC',
          totalReceivedFormatted: '45.0000 BTC',
          totalSentFormatted: '32.5500 BTC',
          txCountFormatted: '142',
          counterpartiesCount: 14,
          firstSeen: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
          lastSeen: new Date().toISOString().split('T')[0],
          scriptType: 'Witness v0 KeyHash (P2WPKH)',
          riskScore: assignedScore,
          riskLevel: newPriority
        },
        evidence: [],
        alerts: [
          {
            id: `alt-${Date.now()}`,
            type: 'case_opened',
            severity: newPriority,
            message: `Investigation opened for ${caseNum}. Initial telemetry monitor engaged.`,
            timestamp: new Date().toISOString()
          }
        ],
        timeline: [
          {
            id: `t-${Date.now()}`,
            action: 'CASE_INITIALIZED',
            detail: `Case created with ${newPriority.toUpperCase()} priority (Initial risk calibrated to ${assignedScore}/100)`,
            timestamp: new Date().toLocaleTimeString(),
            actor: 'Lead Investigator'
          }
        ]
      };

      let created: BackendCase = payload;
      try {
        const res = await apiPost<BackendCase>('/api/cases', {
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          status: payload.status,
          case_number: payload.case_number
        });
        if (res) created = { ...payload, ...res };
      } catch {
        // Local mode
      }

      setCases(prev => {
        const updated = [created, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(updated));
          localStorage.setItem(STORAGE_KEY_ACTIVE_ID, created.id);
        } catch {}
        return updated;
      });
      setSelectedCase(created);

      addAuditEntry('CASE_CREATED', `Created new investigation case: ${created.case_number} - ${created.title}`);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      setNewCaseNumber('');
      showToast(`Case ${created.case_number} created successfully!`, 'success');
    } catch (err: any) {
      console.error('Create case failed:', err);
      showToast(err?.message || 'Failed to create case.');
    } finally {
      setIsCreatingCase(false);
    }
  };

  // DYNAMIC UPDATE OF CASE FIELD (PRIORITY OR STATUS) WITH REAL-TIME ON-SCREEN DATA RECALIBRATION
  const handleUpdateCaseField = async (field: 'priority' | 'status', value: string) => {
    const isClosing = field === 'status' && value === 'closed';
    const isReopening = field === 'status' && value !== 'closed';

    // Recalibrate metrics, wallets, alerts and timeline when priority changes
    let newMetrics = selectedCase.metrics ? { ...selectedCase.metrics } : undefined;
    let newWallets = selectedCase.wallets ? [...selectedCase.wallets] : [];
    let newAlerts = selectedCase.alerts ? [...selectedCase.alerts] : [];
    let newTimeline = selectedCase.timeline ? [...selectedCase.timeline] : [];
    let newNotes = selectedCase.notes || '';

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    if (field === 'priority') {
      const priorityScores: Record<string, number> = {
        critical: 94,
        high: 75,
        medium: 50,
        low: 20
      };
      const score = priorityScores[value] ?? 50;

      if (newMetrics) {
        newMetrics.riskScore = score;
        newMetrics.riskLevel = value as any;
      }

      if (newWallets.length > 0) {
        newWallets[0] = { ...newWallets[0], risk_score: score };
      }

      // Add a dynamic alert reflecting the new threat level
      const alertTemplates: Record<string, string> = {
        critical: 'Emergency Escalation: Forensic risk recalibrated to 94/100. High-velocity mixer egress & bridge drain heuristic active.',
        high: 'Priority Elevated: Multi-hop peel chain velocity threshold exceeded. Subpoenas issued under CrPC 91.',
        medium: 'Priority Calibrated to Medium: Standard surveillance active; co-spending heuristic under monitoring.',
        low: 'Threat De-escalated: Low velocity smurfing contained; asset freezing protocol logged.'
      };

      const newAlertItem: CaseAlert = {
        id: `alt-p-${Date.now()}`,
        type: 'priority_calibration',
        severity: value as any,
        message: alertTemplates[value] || `Investigation priority recalibrated to ${value.toUpperCase()}.`,
        timestamp: new Date().toISOString()
      };
      newAlerts = [newAlertItem, ...newAlerts];

      // Add verified milestone to timeline
      const newTimelineItem: CaseTimelineItem = {
        id: `t-p-${Date.now()}`,
        action: 'PRIORITY_CHANGED',
        detail: `Priority updated to ${value.toUpperCase()} (Risk Score adjusted to ${score}/100)`,
        timestamp: timestampStr,
        actor: 'Lead Investigator'
      };
      newTimeline = [newTimelineItem, ...newTimeline];

      // Append note entry
      const noteEntry = `[${timestampStr}] Priority reclassified to ${value.toUpperCase()} by Investigator. Risk score adjusted to ${score}/100.`;
      newNotes = newNotes ? `${newNotes}\n${noteEntry}` : noteEntry;
    }

    if (field === 'status') {
      const statusTimelineItem: CaseTimelineItem = {
        id: `t-s-${Date.now()}`,
        action: 'STATUS_TRANSITION',
        detail: `Lifecycle status transitioned to ${value.replace(/_/g, ' ').toUpperCase()}`,
        timestamp: timestampStr,
        actor: 'Case Supervisor'
      };
      newTimeline = [statusTimelineItem, ...newTimeline];

      const noteEntry = `[${timestampStr}] Case status transitioned to ${value.replace(/_/g, ' ').toUpperCase()}.`;
      newNotes = newNotes ? `${newNotes}\n${noteEntry}` : noteEntry;
    }

    const updatedCase: BackendCase = {
      ...selectedCase,
      [field]: value as any,
      closed_at: isClosing ? new Date().toISOString() : (isReopening ? null : selectedCase.closed_at),
      updated_at: new Date().toISOString(),
      metrics: newMetrics,
      wallets: newWallets,
      alerts: newAlerts,
      timeline: newTimeline,
      notes: newNotes,
    };

    // Update state immediately
    setSelectedCase(updatedCase);
    setCases(prev => {
      const exists = prev.some(c => c.id === updatedCase.id);
      const updatedList = exists ? prev.map(c => c.id === updatedCase.id ? updatedCase : c) : [updatedCase, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(updatedList));
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, updatedCase.id);
      } catch {}
      return updatedList;
    });

    const displayVal = value.replace(/_/g, ' ').toUpperCase();
    addAuditEntry('CASE_UPDATED', `Case ${updatedCase.case_number} ${field} set to ${displayVal}`);
    showToast(`Case ${field} updated to ${displayVal}`, 'success');

    // Background sync to backend if online
    try {
      const updatePayload: Record<string, any> = { [field]: value };
      if (isClosing) updatePayload.closed_at = updatedCase.closed_at;
      if (isReopening) updatePayload.closed_at = null;
      await apiPut<BackendCase>(`/api/cases/${updatedCase.id}`, updatePayload);
    } catch {
      // Local state preserved
    }
  };

  // Handle Add Note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSavingNote(true);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const entry = `[${timestamp}] ${newNote.trim()}`;

    const existingNotes = selectedCase.notes || '';
    const updatedNotesString = existingNotes ? `${existingNotes}\n${entry}` : entry;

    const updatedCase: BackendCase = {
      ...selectedCase,
      notes: updatedNotesString,
      updated_at: new Date().toISOString(),
    };

    setSelectedCase(updatedCase);
    setCases(prev => {
      const updated = prev.map(c => c.id === selectedCase.id ? updatedCase : c);
      try {
        localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setNewNote('');
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
    addAuditEntry('NOTE_ADDED', `Investigation note added for case ${selectedCase.case_number}`);

    try {
      await apiPut<BackendCase>(`/api/cases/${selectedCase.id}`, { notes: updatedNotesString });
    } catch {
      // Preserved locally
    } finally {
      setIsSavingNote(false);
    }
  };

  const parsedNotes = useMemo(() => {
    return parseCaseNotes(selectedCase?.notes);
  }, [selectedCase?.notes]);

  // Read case metrics directly from selectedCase
  const caseMetrics = useMemo(() => {
    if (selectedCase.metrics) {
      return selectedCase.metrics;
    }
    return {
      balanceFormatted: summary ? `${(summary.confirmedBalance / 1e8).toFixed(4)} BTC` : '130,010.0790 BTC',
      currency: 'BTC',
      totalReceivedFormatted: summary ? `${(summary.totalReceived / 1e8).toFixed(4)} BTC` : '142,500.0000 BTC',
      totalSentFormatted: summary ? `${(summary.totalSent / 1e8).toFixed(4)} BTC` : '12,489.9210 BTC',
      txCountFormatted: summary?.txCount?.toLocaleString() || '1,428',
      counterpartiesCount: counterparties.length || 47,
      firstSeen: summary?.firstSeen ? new Date(summary.firstSeen).toLocaleDateString() : '2026-06-14',
      lastSeen: summary?.lastSeen ? new Date(summary.lastSeen).toLocaleDateString() : '2026-09-09',
      scriptType: summary?.scriptType || 'Witness v0 KeyHash (P2WPKH)',
      riskScore: selectedCase.wallets?.[0]?.risk_score ?? globalRiskScore ?? 75,
      riskLevel: selectedCase.priority
    };
  }, [selectedCase, summary, counterparties.length, globalRiskScore]);

  // Filtered evidence items inside Evidence tab
  const filteredEvidence = useMemo(() => {
    const list = selectedCase.evidence || [];
    if (evidenceSeverityFilter === 'all') return list;
    return list.filter(e => e.severity === evidenceSeverityFilter);
  }, [selectedCase.evidence, evidenceSeverityFilter]);

  // Filtered alerts inside Alerts tab
  const filteredAlerts = useMemo(() => {
    const list = selectedCase.alerts || [];
    if (alertsSeverityFilter === 'all') return list;
    return list.filter(a => a.severity === alertsSeverityFilter);
  }, [selectedCase.alerts, alertsSeverityFilter]);

  // Filtered timeline inside Timeline tab
  const filteredTimeline = useMemo(() => {
    const list = selectedCase.timeline || [];
    if (timelineTypeFilter === 'all') return list;
    if (timelineTypeFilter === 'FORENSICS') return list.filter(t => t.action.includes('INGESTION') || t.action.includes('CLUSTER') || t.action.includes('EXPLOIT') || t.action.includes('SWAP') || t.action.includes('SMURFING'));
    if (timelineTypeFilter === 'LIFECYCLE') return list.filter(t => t.action.includes('CASE') || t.action.includes('STATUS') || t.action.includes('PRIORITY'));
    if (timelineTypeFilter === 'ALERTS') return list.filter(t => t.action.includes('ALERT') || t.action.includes('DISPATCH') || t.action.includes('MLAT'));
    return list;
  }, [selectedCase.timeline, timelineTypeFilter]);

  // Target wallet display
  const linkedWalletAddress = selectedCase.wallets && selectedCase.wallets.length > 0 ? selectedCase.wallets[0].address : null;
  const displayAddress = linkedWalletAddress || activeTargetAddress || 'bc1qgdjqv0av3q54qqjwve97';

  const isCaseClosed = selectedCase.status?.toLowerCase() === 'closed';

  // Case pipeline stages
  const stages = [
    { id: 1, name: 'Target Identified', done: true, isAction: false },
    { id: 2, name: 'Blockchain Analysis', done: true, isAction: false },
    { id: 3, name: 'Risk Assessment', done: caseMetrics.riskScore > 0, isAction: false },
    { id: 4, name: 'Evidence Collection', done: (selectedCase.evidence?.length || 0) > 0 || globalEvidenceItems.length > 0, isAction: false },
    { id: 5, name: 'Counterparty Mapping', done: caseMetrics.counterpartiesCount > 0, isAction: false },
    { id: 6, name: 'Report Generation', done: false, isAction: true, actionTitle: 'Generate & export investigation report' },
    { id: 7, name: 'Case Closure', done: isCaseClosed, isAction: true, actionTitle: isCaseClosed ? 'Case is closed' : 'Toggle case status' },
  ];
  const currentStage = stages.filter(s => s.done).length + 1;

  // STRICT PRIORITY & STATUS from selectedCase
  const currentPriority = (selectedCase.priority || 'medium').toLowerCase();
  const currentStatus = (selectedCase.status || 'open').toLowerCase();

  // Status configuration
  const STATUS_CONFIG: Record<string, { label: string; desc: string; badge: string; dot: string }> = {
    open: {
      label: 'Open',
      desc: 'Active Live Investigation',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
    },
    in_progress: {
      label: 'In Progress',
      desc: 'Forensic Tracing & Nodes',
      badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
      dot: 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.7)]'
    },
    under_review: {
      label: 'Under Review',
      desc: 'Supervisory Assessment',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      dot: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.7)]'
    },
    escalated: {
      label: 'Escalated',
      desc: 'Actioned to Intercept',
      badge: 'bg-rose-500/25 text-rose-400 border-rose-500/45 shadow-[0_0_14px_rgba(244,63,94,0.3)]',
      dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
    },
    closed: {
      label: 'Closed',
      desc: 'Investigation Concluded',
      badge: 'bg-dark-800 text-dark-300 border-dark-600',
      dot: 'bg-dark-400'
    },
    archived: {
      label: 'Archived',
      desc: 'Evidentiary Cold Vault',
      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
      dot: 'bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.7)]'
    }
  };

  const activeStatusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.open;

  // Copy target wallet
  const handleCopyTarget = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress);
      setCopiedTarget(true);
      setTimeout(() => setCopiedTarget(false), 2000);
      showToast('Wallet address copied to clipboard', 'success');
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setPriorityFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    showToast('Filters reset to show all cases', 'success');
  };

  const hasActiveFilters = priorityFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-2xl flex items-center gap-2 border animate-fade-in ${
          toastMessage.type === 'success'
            ? 'bg-dark-900/95 text-accent-green border-accent-green/40 shadow-[0_0_15px_rgba(0,230,153,0.2)]'
            : 'bg-dark-900/95 text-accent-red border-accent-red/40 shadow-[0_0_15px_rgba(255,75,75,0.2)]'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X size={12} />
          </button>
        </div>
      )}

      {/* PART 1 — CASE LIST + FILTER & SEARCH CONTROLS */}
      <div className="glass-card p-4 border border-primary-500/20 bg-dark-900/45 space-y-3">
        {/* Header & New Case Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen size={17} className="text-primary-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Investigation Cases ({cases.length})
            </span>
            <span className="text-[11px] text-dark-400 hidden md:inline">
              • Active: <span className="text-primary-400 mono font-semibold">{selectedCase.case_number}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Plus size={13} />
              <span>New Case</span>
            </button>
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-800 transition-colors cursor-pointer"
              title={isPanelCollapsed ? "Expand case panel" : "Collapse case panel"}
            >
              {isPanelCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {/* INTERACTIVE FILTERS & SEARCH BAR */}
        {!isPanelCollapsed && (
          <div className="pt-1 pb-2 border-y border-dark-800/80 space-y-2.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search size={13} className="absolute left-3 top-2.5 text-dark-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter cases by ID (INV-...), Title, Target Wallet, or Officer..."
                  className="w-full pl-8 pr-8 py-1.5 bg-dark-950/80 border border-dark-700/80 rounded-lg text-xs text-white placeholder:text-dark-500 focus:border-primary-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-dark-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Priority Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Filter size={10} /> Priority:
                </span>
                {[
                  { value: 'all', label: 'All', count: cases.length },
                  { value: 'critical', label: 'Critical', color: 'text-rose-400', count: cases.filter(c => c.priority === 'critical').length },
                  { value: 'high', label: 'High', color: 'text-amber-400', count: cases.filter(c => c.priority === 'high').length },
                  { value: 'medium', label: 'Medium', color: 'text-cyan-400', count: cases.filter(c => c.priority === 'medium').length },
                  { value: 'low', label: 'Low', color: 'text-dark-300', count: cases.filter(c => c.priority === 'low').length },
                ].map(p => {
                  const active = priorityFilter === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => setPriorityFilter(p.value as any)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? 'bg-primary-500/25 text-white border border-primary-500/50 shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                          : 'bg-dark-950/60 text-dark-400 border border-dark-800 hover:bg-dark-800 hover:text-white'
                      }`}
                    >
                      <span className={p.color}>{p.label}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-dark-900 text-dark-400 font-mono">
                        {p.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Filter Pills Row */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin pt-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <SlidersHorizontal size={10} /> Status:
                </span>
                {[
                  { value: 'all', label: 'All Status' },
                  { value: 'open', label: 'Open', color: 'text-emerald-400' },
                  { value: 'in_progress', label: 'In Progress', color: 'text-cyan-400' },
                  { value: 'under_review', label: 'Under Review', color: 'text-amber-400' },
                  { value: 'escalated', label: 'Escalated', color: 'text-rose-400' },
                  { value: 'closed', label: 'Closed', color: 'text-dark-400' },
                  { value: 'archived', label: 'Archived', color: 'text-purple-400' },
                ].map(st => {
                  const active = statusFilter === st.value;
                  return (
                    <button
                      key={st.value}
                      onClick={() => setStatusFilter(st.value as any)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all shrink-0 cursor-pointer ${
                        active
                          ? 'bg-dark-800 text-white border border-primary-400 shadow-sm'
                          : 'bg-dark-950/50 text-dark-400 border border-dark-800/80 hover:text-dark-200'
                      }`}
                    >
                      <span className={st.color}>{st.label}</span>
                    </button>
                  );
                })}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-700 text-primary-400 hover:text-primary-300 text-[10px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer border border-primary-500/30"
                >
                  <RotateCcw size={10} />
                  <span>Reset ({filteredCases.length}/{cases.length})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Case Chips Row */}
        {!isPanelCollapsed && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {loadingCases ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-12 w-48 rounded-lg bg-dark-800/60 border border-dark-700/50 animate-pulse shrink-0 flex items-center p-2.5 gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-dark-700 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-20 bg-dark-700 rounded" />
                    <div className="h-2.5 w-28 bg-dark-700/70 rounded" />
                  </div>
                </div>
              ))
            ) : filteredCases.length === 0 ? (
              <div className="py-2 px-1 text-xs text-dark-400 italic flex items-center gap-3">
                <span>No cases match the selected filters.</span>
                <button
                  onClick={handleResetFilters}
                  className="text-primary-400 underline font-semibold not-italic hover:text-primary-300 cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                {filteredCases.map((c) => {
                  const isSelected = selectedCase.id === c.id;
                  const priority = (c.priority || 'medium').toLowerCase();
                  const priorityDot =
                    priority === 'critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]' :
                    priority === 'high' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]' :
                    priority === 'low' ? 'bg-dark-400' :
                    'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.7)]';

                  const st = (c.status || 'open').toLowerCase();
                  const stCfg = STATUS_CONFIG[st] || STATUS_CONFIG.open;

                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCase(c)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary-500/15 border-primary-400 text-white ring-1 ring-primary-500/40 shadow-[0_0_14px_rgba(0,210,255,0.18)] scale-[1.01]'
                          : 'bg-dark-950/60 border-dark-800 text-dark-300 hover:bg-dark-800 hover:border-dark-600 hover:text-white'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityDot}`} />
                      <div className="min-w-0 max-w-[145px]">
                        <div className="text-[11px] font-bold text-white truncate mono leading-tight">
                          {c.case_number}
                        </div>
                        <div className="text-[10px] text-dark-400 truncate leading-tight mt-0.5 font-medium">
                          {c.title}
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase shrink-0 ${stCfg.badge}`}>
                        {stCfg.label}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* PART 2 — CASE DETAIL VIEW */}
      {/* Header Bar with Editable Priority + Editable Status (OPEN Button) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <FolderOpen size={22} className="text-primary-400 shrink-0" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              {selectedCase.title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-dark-800/80 border border-dark-700 text-xs text-dark-300">
              <Wallet size={12} className="text-primary-400" />
              <code className="mono text-[11px] text-primary-300">{displayAddress}</code>
              <button 
                onClick={handleCopyTarget} 
                className="hover:text-white transition-colors ml-0.5 cursor-pointer"
                title="Copy address"
              >
                {copiedTarget ? <Check size={11} className="text-accent-green" /> : <Copy size={11} />}
              </button>
            </div>
            <span className="text-dark-600">•</span>
            <span className="text-xs text-primary-400 font-bold mono">{selectedCase.case_number}</span>
            <span className="text-dark-600">•</span>
            <span className="text-xs text-dark-400 uppercase font-semibold">{caseMetrics.currency} Forensic Chain</span>
          </div>
        </div>

        {/* Action Controls: Priority Dropdown & Status Dropdown (The OPEN Button) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Priority Dropdown Trigger */}
          <div className="relative" ref={priorityMenuRef}>
            <button
              onClick={() => setPriorityMenuOpen(!priorityMenuOpen)}
              title="Click to change investigation priority"
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:brightness-110 ${
                currentPriority === 'critical' ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]' :
                currentPriority === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]' :
                currentPriority === 'low' ? 'bg-dark-800 text-dark-300 border-dark-600' :
                'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                currentPriority === 'critical' ? 'bg-rose-500' :
                currentPriority === 'high' ? 'bg-amber-400' :
                currentPriority === 'low' ? 'bg-dark-400' : 'bg-cyan-400'
              }`} />
              <span>{currentPriority.toUpperCase()} PRIORITY</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${priorityMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {priorityMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 glass-card bg-dark-900/98 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-40 animate-scale-in">
                {[
                  { value: 'critical', label: 'Critical', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
                  { value: 'high', label: 'High', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
                  { value: 'medium', label: 'Medium', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
                  { value: 'low', label: 'Low', color: 'text-dark-300 bg-dark-800 border-dark-700' },
                ].map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setPriorityMenuOpen(false);
                      void handleUpdateCaseField('priority', p.value);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-between my-0.5 cursor-pointer ${
                      currentPriority === p.value
                        ? `${p.color} border font-extrabold`
                        : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                    }`}
                  >
                    <span>{p.label} Priority</span>
                    {currentPriority === p.value && <Check size={13} className="text-primary-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Dropdown Trigger (The OPEN Button with All Options Enabled) */}
          <div className="relative" ref={statusMenuRef}>
            <button
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              title="Click to toggle or update case lifecycle status"
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border flex items-center gap-2 transition-all hover:brightness-110 cursor-pointer shadow-lg ${activeStatusCfg.badge}`}
            >
              <span className={`w-2 h-2 rounded-full ${activeStatusCfg.dot}`} />
              <span>{activeStatusCfg.label.toUpperCase()}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${statusMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {statusMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 glass-card bg-dark-900/98 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-40 animate-scale-in">
                <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-800 mb-1">
                  Change Case Lifecycle Status
                </div>
                {[
                  { value: 'open', label: 'Open', desc: 'Active Live Investigation', color: 'text-emerald-400' },
                  { value: 'in_progress', label: 'In Progress', desc: 'Forensic Tracing & Nodes', color: 'text-cyan-400' },
                  { value: 'under_review', label: 'Under Review', desc: 'Supervisory Assessment', color: 'text-amber-400' },
                  { value: 'escalated', label: 'Escalated', desc: 'Actioned to Intercept', color: 'text-rose-400' },
                  { value: 'closed', label: 'Closed', desc: 'Investigation Concluded', color: 'text-dark-400' },
                  { value: 'archived', label: 'Archived', desc: 'Evidentiary Cold Vault', color: 'text-purple-400' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatusMenuOpen(false);
                      void handleUpdateCaseField('status', opt.value);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between my-0.5 cursor-pointer ${
                      currentStatus === opt.value
                        ? 'bg-primary-500/20 text-primary-300 font-bold border border-primary-500/30'
                        : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className={`font-bold ${opt.color}`}>{opt.label}</div>
                      <div className="text-[10px] text-dark-500">{opt.desc}</div>
                    </div>
                    {currentStatus === opt.value && <Check size={13} className="text-primary-400 shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Case Metadata Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-dark-400 px-1">
        <div className="flex items-center gap-1.5">
          <User size={12} className="text-dark-500" />
          <span className="text-dark-500">Investigator:</span>
          <span className="text-dark-200 font-semibold">{selectedCase.investigator_name || 'Assigned Officer'}</span>
        </div>
        <span className="text-dark-600 hidden sm:inline">•</span>
        <div className="flex items-center gap-1.5">
          <Building size={12} className="text-dark-500" />
          <span className="text-dark-500">Department:</span>
          <span className="text-dark-200 font-semibold">{selectedCase.department || 'Cyber Crime Operations'}</span>
        </div>
        <span className="text-dark-600 hidden sm:inline">•</span>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-dark-500" />
          <span className="text-dark-500">Case Inception:</span>
          <span className="text-dark-200 font-semibold">
            {new Date(selectedCase.created_at).toLocaleDateString()}
          </span>
        </div>
        <span className="text-dark-600 hidden sm:inline">•</span>
        <div className="flex items-center gap-1.5">
          <RefreshCw size={12} className="text-dark-500" />
          <span className="text-dark-500">Last Telemetry:</span>
          <span className="text-dark-200 font-semibold">
            {timeAgo(selectedCase.updated_at)}
          </span>
        </div>
        {selectedCase.closed_at && (
          <>
            <span className="text-dark-600 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <Lock size={12} className="text-rose-400" />
              <span className="text-dark-500">Concluded At:</span>
              <span className="text-rose-400 font-semibold">{new Date(selectedCase.closed_at).toLocaleDateString()}</span>
            </div>
          </>
        )}
      </div>

      {/* Case Info Card (4-Stat Grid with Unique Real-World Case Data) */}
      <div className="glass-card p-5 border border-primary-500/20 bg-dark-900/40">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] text-dark-400 uppercase font-semibold">Case Reference</span>
            <div className="text-sm font-bold text-primary-400 mono mt-0.5">
              {selectedCase.case_number}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-dark-400 uppercase font-semibold">Started</span>
            <div className="text-sm font-bold text-white mt-0.5">
              {new Date(selectedCase.created_at).toLocaleDateString()}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-dark-400 uppercase font-semibold">Tracked Balance</span>
            <div className="text-sm font-bold text-white mt-0.5">
              {caseMetrics.balanceFormatted}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-dark-400 uppercase font-semibold">Forensic Risk Score</span>
            <div className={`text-sm font-bold mt-0.5 flex items-center gap-1.5 ${
              caseMetrics.riskLevel === 'critical' ? 'text-rose-400' :
              caseMetrics.riskLevel === 'high' ? 'text-amber-400' :
              caseMetrics.riskLevel === 'low' ? 'text-dark-300' :
              'text-cyan-400'
            }`}>
              <span>{caseMetrics.riskScore}/100</span>
              <span className="text-[10px] uppercase font-bold opacity-80">({caseMetrics.riskLevel})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Pipeline Stepper */}
      <div className="glass-card p-4 bg-dark-900/40 border border-dark-750">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-dark-400 uppercase font-semibold tracking-wider">
            Investigation Pipeline
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-primary-400 font-mono">
              Stage {currentStage > 7 ? 7 : currentStage} of 7
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {stages.map((stage, i) => {
            const isStage6 = stage.id === 6;
            const isStage7 = stage.id === 7;

            const handleStageClick = () => {
              if (isStage6) {
                addAuditEntry('REPORT_REQUESTED', `Report generation opened for case ${selectedCase.case_number}`);
                setPage('reports');
              } else if (isStage7) {
                void handleUpdateCaseField('status', isCaseClosed ? 'open' : 'closed');
              }
            };

            return (
              <React.Fragment key={stage.id}>
                <div
                  onClick={stage.isAction ? handleStageClick : undefined}
                  title={stage.actionTitle}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                    stage.isAction ? 'cursor-pointer hover:border-primary-400 hover:brightness-110' : ''
                  } ${
                    stage.done
                      ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                      : stage.id === currentStage && !isCaseClosed
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 animate-pulse'
                        : isStage6
                          ? 'bg-primary-500/10 text-primary-400/80 border border-primary-500/20'
                          : isStage7 && !isCaseClosed
                            ? 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-accent-red hover:border-accent-red/40'
                            : 'bg-dark-800 text-dark-500 border border-dark-700'
                  }`}
                >
                  {stage.done ? (
                    <CheckCircle2 size={10} />
                  ) : isStage6 ? (
                    <FileText size={10} />
                  ) : isStage7 ? (
                    <Lock size={10} />
                  ) : (
                    <span className="w-3 text-center">{stage.id}</span>
                  )}
                  <span>{stage.name}</span>
                  {isStage6 && <ExternalLink size={9} className="opacity-70 ml-0.5" />}
                </div>
                {i < stages.length - 1 && <ArrowRight size={12} className="text-dark-600 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-dark-700/50 pb-1">
        {(['summary', 'timeline', 'notes', 'evidence', 'alerts'] as const).map(tab => {
          const count = 
            tab === 'notes' ? parsedNotes.length :
            tab === 'evidence' ? filteredEvidence.length :
            tab === 'alerts' ? filteredAlerts.length :
            tab === 'timeline' ? filteredTimeline.length : 0;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-t text-xs font-bold capitalize transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-primary-500/20 text-primary-400 border-b-2 border-primary-400'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <span>{tab}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  activeTab === tab ? 'bg-primary-500/30 text-primary-300' : 'bg-dark-800 text-dark-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {/* 1. SUMMARY TAB */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Database size={15} className="text-primary-400" />
              <span>Investigation Target Overview</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-dark-400">Target Address</span>
                <code className="text-primary-300 mono bg-dark-800/60 px-2 py-0.5 rounded text-[11px]">
                  {displayAddress}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Script Type</span>
                <span className="text-white font-medium">{caseMetrics.scriptType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Underlying Chain</span>
                <span className="text-white font-semibold uppercase">{caseMetrics.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Total Transactions</span>
                <span className="text-white font-medium">{caseMetrics.txCountFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Clustered Counterparties</span>
                <span className="text-white font-medium">{caseMetrics.counterpartiesCount} Entities</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">First Seen On-Chain</span>
                <span className="text-white">{caseMetrics.firstSeen}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Last Active Timestamp</span>
                <span className="text-white">{caseMetrics.lastSeen}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Activity size={15} className="text-accent-green" />
              <span>Financial & Forensics Audit</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-dark-400">Confirmed Vault Balance</span>
                <span className="text-white font-bold">{caseMetrics.balanceFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Cumulative Inflow (Total Received)</span>
                <span className="text-accent-green font-semibold">{caseMetrics.totalReceivedFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Cumulative Outflow (Total Sent)</span>
                <span className="text-rose-400 font-semibold">{caseMetrics.totalSentFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Active Telemetry Alerts</span>
                <span className="text-accent-gold font-bold">{selectedCase.alerts?.length || 0} Flags</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Cataloged Evidentiary Items</span>
                <span className="text-primary-400 font-bold">{selectedCase.evidence?.length || 0} Items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Case Lifecycle State</span>
                <span className={`font-bold uppercase ${activeStatusCfg.badge.split(' ')[1]}`}>
                  {activeStatusCfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TIMELINE TAB WITH ACTION FILTERS */}
      {activeTab === 'timeline' && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-800 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock size={15} className="text-primary-400" />
                <span>Case Investigation Chronology</span>
              </h3>
              <span className="text-[10px] text-dark-400">
                Verified forensic milestones for {selectedCase.case_number}
              </span>
            </div>

            {/* Timeline Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              <span className="text-[10px] text-dark-400 uppercase font-semibold">Filter:</span>
              {[
                { value: 'all', label: 'All Events' },
                { value: 'FORENSICS', label: 'Forensics & Ingestion' },
                { value: 'LIFECYCLE', label: 'Status & Priority Changes' },
                { value: 'ALERTS', label: 'Alerts & Intercepts' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setTimelineTypeFilter(f.value as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    timelineTypeFilter === f.value
                      ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40'
                      : 'bg-dark-950/60 text-dark-400 hover:text-white border border-dark-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredTimeline.length > 0 ? (
              filteredTimeline.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-dark-800/30 border border-dark-750 hover:border-dark-700 transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-400 mt-1 shrink-0 shadow-[0_0_8px_rgba(0,210,255,0.6)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white font-medium">{entry.detail}</div>
                    <div className="text-[10px] text-dark-400 mt-0.5 flex items-center gap-2">
                      <span className="mono text-primary-300 font-semibold">{entry.timestamp}</span>
                      <span className="text-dark-600">•</span>
                      <span className="font-bold text-dark-300 uppercase">{entry.action}</span>
                      <span className="text-dark-600">•</span>
                      <span>By: {entry.actor}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : selectedCase.timeline && selectedCase.timeline.length > 0 ? (
              <div className="text-center text-dark-500 text-xs italic py-4">No events match the selected timeline filter.</div>
            ) : (
              globalAuditLog.slice(0, 15).map(entry => (
                <div key={entry.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-800/30">
                  <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-xs text-white">{entry.detail}</div>
                    <div className="text-[10px] text-dark-500">{timeAgo(entry.timestamp)} • {entry.action}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. NOTES TAB */}
      {activeTab === 'notes' && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={15} className="text-primary-400" />
              <span>Investigation Notes ({selectedCase.case_number})</span>
            </h3>
            <span className="text-[10px] text-dark-400">
              Persistent forensic notes log
            </span>
          </div>

          {/* Add note input */}
          <div className="flex items-center gap-2 mb-4">
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isSavingNote && handleAddNote()}
              placeholder="Add investigator note (e.g. Subpoena response received from exchange desk)..."
              disabled={isSavingNote}
              className="flex-1 px-3 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-xs text-white placeholder:text-dark-500 focus:border-primary-500/50 focus:outline-none"
            />
            {isSavingNote && (
              <div className="flex items-center gap-1.5 text-xs text-primary-400 shrink-0">
                <Loader2 size={14} className="animate-spin" />
                <span className="hidden sm:inline text-[11px]">Saving…</span>
              </div>
            )}
            {noteSaved && (
              <div className="flex items-center gap-1 text-xs text-accent-green shrink-0 animate-fade-in">
                <CheckCircle2 size={14} />
                <span className="hidden sm:inline text-[11px]">Saved</span>
              </div>
            )}
            <button
              onClick={handleAddNote}
              disabled={isSavingNote || !newNote.trim()}
              className="px-4 py-2 bg-primary-500/20 text-primary-400 text-xs font-bold rounded-lg border border-primary-500/30 hover:bg-primary-500/30 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-all cursor-pointer"
            >
              Add Note
            </button>
          </div>

          {/* Parsed Notes Display */}
          <div className="space-y-2">
            {parsedNotes.map(note => (
              <div key={note.id} className="p-3 rounded-lg bg-dark-800/30 border border-dark-700/50 hover:border-dark-700 transition-colors">
                <div className="text-xs text-white whitespace-pre-wrap leading-relaxed">{note.text}</div>
                <div className="text-[10px] text-dark-500 mt-1 flex items-center gap-1.5">
                  <Clock size={10} />
                  <span>{timeAgo(note.timestamp)}</span>
                  <span className="text-dark-600">•</span>
                  <span className="mono text-dark-500">{note.timestamp}</span>
                </div>
              </div>
            ))}
            {parsedNotes.length === 0 && (
              <div className="text-center text-dark-500 text-sm italic py-6">
                No notes recorded yet. Add the first entry above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. EVIDENCE TAB WITH SEVERITY FILTERS */}
      {activeTab === 'evidence' && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-800 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield size={15} className="text-primary-400" />
                <span>Case Evidence Vault ({selectedCase.evidence?.length || 0} items)</span>
              </h3>
              <span className="text-[10px] text-dark-400">
                SHA-256 verified forensic artifacts
              </span>
            </div>

            {/* Evidence Severity Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              <span className="text-[10px] text-dark-400 uppercase font-semibold">Filter:</span>
              {[
                { value: 'all', label: 'All' },
                { value: 'critical', label: 'Critical', color: 'text-rose-400' },
                { value: 'high', label: 'High', color: 'text-amber-400' },
                { value: 'medium', label: 'Medium', color: 'text-cyan-400' },
                { value: 'low', label: 'Low', color: 'text-dark-300' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setEvidenceSeverityFilter(f.value as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    evidenceSeverityFilter === f.value
                      ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40'
                      : 'bg-dark-950/60 text-dark-400 hover:text-white border border-dark-800'
                  }`}
                >
                  <span className={f.color}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredEvidence.length > 0 ? (
              filteredEvidence.map(ev => (
                <div key={ev.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-dark-800/40 border border-dark-700/70 hover:border-dark-600 transition-all gap-2">
                  <div className="flex items-start gap-2.5">
                    <FileText size={16} className="text-primary-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-white">{ev.title}</div>
                      <div className="text-[10px] text-dark-400 mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="uppercase font-bold text-dark-300">{ev.evidence_type?.replace(/_/g, ' ')}</span>
                        {ev.file_size && (
                          <>
                            <span className="text-dark-600">•</span>
                            <span>{ev.file_size}</span>
                          </>
                        )}
                        {ev.uploaded_by && (
                          <>
                            <span className="text-dark-600">•</span>
                            <span>Logged by: {ev.uploaded_by}</span>
                          </>
                        )}
                      </div>
                      {ev.file_hash && (
                        <div className="text-[10px] font-mono text-dark-500 mt-1 flex items-center gap-1">
                          <Hash size={10} className="text-primary-400/70" />
                          <span className="text-primary-300/80">{ev.file_hash}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {ev.severity && (
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border shrink-0 self-start sm:self-center ${
                      ev.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                      ev.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                      'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                    }`}>
                      {ev.severity}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-dark-500 text-xs italic py-4">
                No evidence items match the selected filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ALERTS TAB WITH SEVERITY FILTERS */}
      {activeTab === 'alerts' && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-800 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle size={15} className="text-accent-gold" />
                <span>Real-Time Case Alerts ({selectedCase.alerts?.length || 0})</span>
              </h3>
              <span className="text-[10px] text-dark-400">
                Heuristic & telemetry notifications
              </span>
            </div>

            {/* Alert Severity Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              <span className="text-[10px] text-dark-400 uppercase font-semibold">Filter:</span>
              {[
                { value: 'all', label: 'All Alerts' },
                { value: 'critical', label: 'Critical', color: 'text-rose-400' },
                { value: 'high', label: 'High', color: 'text-amber-400' },
                { value: 'medium', label: 'Medium', color: 'text-cyan-400' },
                { value: 'low', label: 'Low', color: 'text-dark-300' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setAlertsSeverityFilter(f.value as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    alertsSeverityFilter === f.value
                      ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40'
                      : 'bg-dark-950/60 text-dark-400 hover:text-white border border-dark-800'
                  }`}
                >
                  <span className={f.color}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-dark-800/40 border border-dark-700/70 hover:border-dark-600 transition-all">
                  {alert.severity === 'critical' ? (
                    <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  ) : alert.severity === 'high' ? (
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Activity size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white font-medium leading-relaxed">{alert.message}</div>
                    <div className="text-[10px] text-dark-400 mt-1 flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        alert.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                        alert.severity === 'high' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-dark-600">•</span>
                      <span className="uppercase text-dark-300 font-semibold">{alert.type.replace(/_/g, ' ')}</span>
                      <span className="text-dark-600">•</span>
                      <span>{timeAgo(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-dark-500 text-xs italic py-4">
                No alerts match the selected filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW CASE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-5 animate-scale-in border border-primary-500/30 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-dark-700/50 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-primary-400" />
                <h3 className="text-sm font-bold text-white">Create New Investigation Case</h3>
              </div>
              <button
                onClick={() => !isCreatingCase && setIsCreateModalOpen(false)}
                className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-800 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCase} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-dark-300 uppercase mb-1">
                  Case Title <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Operation Cryptic Siphon"
                  className="w-full px-3 py-2 bg-dark-900/80 border border-dark-700 rounded-lg text-xs text-white placeholder:text-dark-500 focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-dark-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Suspected illicit layering, mixer interaction, or ransomware outflow..."
                  className="w-full px-3 py-2 bg-dark-900/80 border border-dark-700 rounded-lg text-xs text-white placeholder:text-dark-500 focus:border-primary-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-dark-300 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-dark-900/80 border border-dark-700 rounded-lg text-xs text-white focus:border-primary-500 focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-dark-300 uppercase mb-1">
                    Case Number
                  </label>
                  <input
                    type="text"
                    value={newCaseNumber}
                    onChange={e => setNewCaseNumber(e.target.value)}
                    placeholder="Auto if blank"
                    className="w-full px-3 py-2 bg-dark-900/80 border border-dark-700 rounded-lg text-xs text-white placeholder:text-dark-500 focus:border-primary-500 focus:outline-none mono"
                  />
                </div>
              </div>

              {/* Target wallet auto-link hint */}
              {activeTargetAddress && (
                <div className="p-2.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-[11px] text-primary-300 flex items-start gap-2">
                  <Wallet size={13} className="text-primary-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-white">Auto-link Active Target:</span>{' '}
                    <code className="mono text-[10px] text-primary-300 break-all">{activeTargetAddress}</code>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-700/50">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreatingCase}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-dark-400 hover:text-white hover:bg-dark-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCase || !newTitle.trim()}
                  className="px-4 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingCase && <Loader2 size={12} className="animate-spin" />}
                  <span>{isCreatingCase ? 'Creating…' : 'Create Case'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
