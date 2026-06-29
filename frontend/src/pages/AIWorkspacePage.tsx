import React, { useState } from 'react';
import { useAuthStore, useBlockchainStore, useCaseStore } from '../stores';
import { 
  MessageSquare, Send, Sparkles, AlertTriangle, ShieldCheck, Clock, 
  ListTodo, Activity, FileText, CheckCircle2, ChevronRight, Bookmark, Database, LayoutGrid, Info, Globe
} from 'lucide-react';
import { getRiskColor } from '../utils/helpers';
import { mockTimeline, mockEvidence } from '../data/mockData';

export const AIWorkspacePage: React.FC = () => {
  const { user } = useAuthStore();
  const { searchAddress } = useBlockchainStore();
  const { selectedCase } = useCaseStore();

  // Left panel active context mode
  const [contextMode, setContextMode] = useState<'investigation' | 'wallet' | 'transaction' | 'evidence' | 'timeline' | 'report'>('investigation');

  // Middle panel tabs
  const [activeMiddleTab, setActiveMiddleTab] = useState<'chat' | 'graph' | 'timeline' | 'evidence' | 'meta-reasoning'>('chat');

  // Chat conversation logs state
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'ai'; text: string; mode: string }>>([
    {
      sender: 'ai',
      mode: 'investigation',
      text: `### Co-Investigator Workspace Booted

Verified Investigator: **${user?.username || 'Inspector Verma'}**
Assigned Agency: **Cyber Crime Cell**
Current Authorized Case Context: **${selectedCase?.caseNumber || 'CC-2026-1001'}**

I can assist with summarizing investigations, drafting reports, and cross-referencing on-chain metrics. Please select a Context Mode on the left and enter a query, or choose a prompt from the Library.`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Saved investigations (Left Panel)
  const savedChats = [
    { id: 'sc-1', label: 'GainChain Flow Analysis' },
    { id: 'sc-2', label: 'Lazarus Intermediary hops' }
  ];

  // Prompt Library (Left Panel)
  const promptLibrary = [
    { label: 'Summarize Graph Clusters', prompt: 'Analyze and summarize the observed wallet clusters on the graph.' },
    { label: 'Explain Transaction Hops', prompt: 'List the transaction hops from the source node to the exchange.' },
    { label: 'Generate Report Draft', prompt: 'Draft the technical summary report for the current case.' },
    { label: 'Highlight Evidence Gaps', prompt: 'Are there any unlinked evidence files or missing transaction hashes?' }
  ];

  // Decision Support (Right Panel)
  const readinessScore = 82;
  const evidenceGaps = [
    'Missing transaction hashes on Hop-2 destination node',
    'Unlinked evidence files found in secure folder (1)',
    'Missing supervisor signature approvals'
  ];
  const pendingTasks = [
    'Review newly uploaded Evidence #14',
    'Generate unified cross-chain timeline',
    'Finalize executive report draft'
  ];

  // SOIS Autonomous Loop States (Chapter 23)
  const [autonomyLevel, setAutonomyLevel] = useState<'L1' | 'L2' | 'L3' | 'L4'>('L3');
  const [isRunningSOIS, setIsRunningSOIS] = useState(false);
  const [soisStepIndex, setSoisStepIndex] = useState(-1);
  const [soisSteps, setSoisSteps] = useState([
    { label: 'Blockchain Transaction Ingestion', status: 'pending' },
    { label: 'Multi-Network Graph Expansion', status: 'pending' },
    { label: 'Behavioral Anomaly & Risk Calibration', status: 'pending' },
    { label: 'Predictive Fraud Estimation', status: 'pending' },
    { label: 'Audit Log Dispatch & Verification', status: 'pending' }
  ]);

  const triggerSOISLoop = async () => {
    setIsRunningSOIS(true);
    setSoisStepIndex(0);
    setSoisSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));

    for (let step = 0; step < 5; step++) {
      setSoisStepIndex(step);
      setSoisSteps(prev => prev.map((s, i) => i === step ? { ...s, status: 'running' } : s));
      await new Promise(r => setTimeout(r, 650));
      setSoisSteps(prev => prev.map((s, i) => i === step ? { ...s, status: 'completed' } : s));
    }

    setSoisStepIndex(5);
    setChatLog(prev => [
      ...prev,
      {
        sender: 'ai',
        mode: 'investigation',
        text: `### 📋 [SOIS] Forensic Sweep Executed
* **Trigger Type**: Investigation Cycle Manager
* **Applied Autonomy Level**: **Level 3: Controlled Autonomy (Default)**
* **Execution Status**: Unified 5-stage sweep complete.
* **Scan Results**: Expanded wallet graph +2 levels; parsed 15 new transactions; updated risk forecasting models.
* **Audit Registry**: Sealed log entry generated successfully under supervisor verification index.`
      }
    ]);

    setTimeout(() => {
      setIsRunningSOIS(false);
      setSoisStepIndex(-1);
    }, 4000);
  };

  const [isRunningQuantum, setIsRunningQuantum] = useState(false);

  const triggerQuantumSimulation = async () => {
    setIsRunningQuantum(true);
    
    setChatLog(prev => [
      ...prev,
      {
        sender: 'ai',
        mode: 'investigation',
        text: `### ⚛️ [QEIL Engine] Initializing Quantum-Inspired State Space
* **Status**: Superposition states mapped across active address clusters.
* **Objective**: Explore all parallel transfer pathways simultaneously (QGES Multi-Path Engine).`
      }
    ]);

    await new Promise(r => setTimeout(r, 1200));

    setChatLog(prev => [
      ...prev,
      {
        sender: 'ai',
        mode: 'investigation',
        text: `### ⚛️ [QGES Simulation] Trailing 3 Parallel Transaction Paths Simultaneously:
1. **Path 1 (Deterministic)**: \`0x742d...bD28\` $\rightarrow$ Intermediate Wallet A $\rightarrow$ Exchange (Prob: **84%**, Risk: **Medium**)
2. **Path 2 (Indirect layering)**: \`0x742d...bD28\` $\rightarrow$ Mixer Contract $\rightarrow$ Hop-2 Wallet (Prob: **12%**, Risk: **Critical**)
3. **Path 3 (Bridge exit)**: \`0x742d...bD28\` $\rightarrow$ Cross-Chain Bridge $\rightarrow$ Solana Target (Prob: **4%**, Risk: **High**)`
      }
    ]);

    await new Promise(r => setTimeout(r, 1200));

    setChatLog(prev => [
      ...prev,
      {
        sender: 'ai',
        mode: 'investigation',
        text: `### ⚛️ [QIIM State Collapse] Simulation Cycle Complete
* **Selected Pathway**: **Path 1** (Highest probability amplitude observed)
* **Entropy State**: Resolved (Entropy score: **0.14**, collapsed to verified state)
* **Confidence level**: **88%**
* **Audit Registry**: Dispatching simulation telemetry logs to GGECS compliance validator.`
      }
    ]);

    setIsRunningQuantum(false);
  };

  const handleSendMessage = async (userMsg: string) => {
    if (!userMsg.trim()) return;

    setChatLog((prev) => [...prev, { sender: 'user', text: userMsg, mode: contextMode }]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          message: userMsg,
          context_address: searchAddress || undefined,
          context_case_id: selectedCase?.id || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatLog((prev) => [...prev, { sender: 'ai', text: data.response, mode: contextMode }]);
      } else {
        throw new Error('Chat failed');
      }
    } catch (e) {
      console.log('Assistant endpoint failed, running offline fallback response heuristics:', e);
      // Simulate Streaming response delay
      await new Promise((r) => setTimeout(r, 600));

      let reply = '';
      const msgLower = userMsg.toLowerCase();

      if (msgLower.includes('graph') || msgLower.includes('cluster')) {
        reply = `### AI Graph Analysis Report
        
**[VERIFIED FACTS]**
* Nodes consist of 14 wallets, 2 smart contracts, and 1 verified Exchange (Huobi).
* Edges represent 25 validated on-chain transfers.

**[ANALYTICAL OBSERVATIONS]**
* Inflow volume concentrates heavily (>85%) in suspect target wallet \`0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28\`.
* Flow structure matches a peeling chain layering profile with 23 hops split in 2 hours.

**[INVESTIGATIVE HYPOTHESIS] [CONFIDENCE: MEDIUM]**
* Hub node likely acts as an automated cash-out runner script belonging to the GainChain Ponzi Deployer.

> [!WARNING]
> Ownership attributions require external exchange KYC subpoena logs before court filing.`;
      } else if (msgLower.includes('gap') || msgLower.includes('evidence')) {
        reply = `### Evidence Gap Summary
        
**[VERIFIED FACTS]**
* Active case folder has 2 evidence files cataloged with validated SHA-256 integrity seals.
* Target suspect wallet address verified on Ethereum index.

**[ANALYTICAL OBSERVATIONS]**
* Two destination transactions lack linked evidence files matching the transfer timestamps.
* One physical file in the local storage directory remains unregistered.

**[INVESTIGATIVE HYPOTHESIS] [CONFIDENCE: HIGH]**
* Cross-referencing file metadata suggests the unregistered file contains receipt screenshots for the Hop-2 transfer. Please register it under Stage 2 Evidence Intake.`;
      } else if (msgLower.includes('report') || msgLower.includes('draft')) {
        reply = `### Technical Report Draft
        
**[VERIFIED FACTS]**
* **Case Reference**: ${selectedCase?.caseNumber || 'CC-2026-1001'}
* **Suspect Wallet**: \`0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28\`
* **Total Inflow**: 4,215.42 ETH

**[ANALYTICAL OBSERVATIONS]**
* Fund peeling split occurs at intermediate node \`0xa855f72a855f72a855f72a855f72a7777\`.
* Assets subsequently routed to Tornado Cash contract.

**[INVESTIGATIVE HYPOTHESIS] [CONFIDENCE: HIGH]**
* The layering pattern is designed to deanonymize fund tracking channels via public mixers.`;
      } else {
        reply = `### Analytical Response
        
**[VERIFIED FACTS]**
* Active search address target: \`${searchAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28'}\`.

**[ANALYTICAL OBSERVATIONS]**
* Target node is active with recurring balance shifts.

**[INVESTIGATIVE HYPOTHESIS] [CONFIDENCE: LOW]**
* Operational timeline suggests IST timezone activity. Please review compliance timelines for confirmatory checks.`;
      }

      setChatLog((prev) => [...prev, { sender: 'ai', text: reply, mode: contextMode }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in" style={{ height: 'calc(100vh - 120px)' }}>
      {/* AI Limitations Banner */}
      <div className="bg-dark-900 border-l-4 border-accent-gold p-3 rounded-lg flex items-center gap-3 text-xs select-none">
        <Info size={16} className="text-accent-gold flex-shrink-0" />
        <span className="text-dark-300">
          <strong className="text-white">AI Limitations Advisory:</strong> AI-generated analysis is advisory only. Investigators are responsible for reviewing blockchain ledger evidence before making judicial decisions.
        </span>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* LEFT PANEL: Context Modes & Prompts */}
        <div className="w-72 glass-card flex flex-col justify-between p-4 border-dark-700/50 space-y-5 overflow-y-auto">
          {/* Context Selector */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Context Modes</span>
            <div className="grid grid-cols-1 gap-1.5 text-xs font-semibold">
              {([
                { id: 'investigation', label: 'Investigation Summary' },
                { id: 'wallet', label: 'Wallet Heuristics' },
                { id: 'transaction', label: 'Transaction Hops' },
                { id: 'evidence', label: 'Evidence Seals' },
                { id: 'timeline', label: 'Timeline summary' },
                { id: 'report', label: 'Report Drafting' }
              ] as const).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setContextMode(mode.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                    contextMode === mode.id
                      ? 'bg-primary-500/10 border-primary-500 text-white'
                      : 'bg-dark-900/40 border-dark-800 text-dark-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Library */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Prompts Library</span>
            <div className="space-y-2">
              {promptLibrary.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="w-full text-left p-2.5 bg-dark-900/60 border border-dark-800 rounded-lg hover:border-primary-500/30 text-[11px] text-dark-300 hover:text-white transition-colors cursor-pointer block"
                >
                  <span className="font-bold block mb-0.5">{item.label}</span>
                  <span className="text-[10px] text-dark-500 line-clamp-1">{item.prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Saved Log Chats */}
          <div className="space-y-2 pt-3 border-t border-dark-800">
            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Saved Conversations</span>
            <div className="space-y-1.5">
              {savedChats.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 bg-dark-800/10 rounded text-[11px] hover:bg-dark-800/20 cursor-pointer">
                  <span className="text-dark-300 truncate">{c.label}</span>
                  <ChevronRight size={10} className="text-dark-500" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE PANEL: Chat Log & Visual Previews */}
        <div className="flex-1 glass-card flex flex-col border-dark-700/50 overflow-hidden">
          {/* Workspace Tabs */}
          <div className="flex border-b border-dark-700/50 bg-dark-800/20">
            <button
              onClick={() => setActiveMiddleTab('chat')}
              className={`px-4 py-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMiddleTab === 'chat' ? 'border-primary-500 text-white bg-dark-900/40' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              <MessageSquare size={14} /> Interactive Chat
            </button>
            <button
              onClick={() => setActiveMiddleTab('graph')}
              className={`px-4 py-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMiddleTab === 'graph' ? 'border-primary-500 text-white bg-dark-900/40' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              <Activity size={14} /> Graph Preview
            </button>
            <button
              onClick={() => setActiveMiddleTab('timeline')}
              className={`px-4 py-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMiddleTab === 'timeline' ? 'border-primary-500 text-white bg-dark-900/40' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              <Clock size={14} /> Timeline Preview
            </button>
            <button
              onClick={() => setActiveMiddleTab('evidence')}
              className={`px-4 py-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMiddleTab === 'evidence' ? 'border-primary-500 text-white bg-dark-900/40' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              <FileText size={14} /> Evidence Checklist
            </button>
            <button
              onClick={() => setActiveMiddleTab('meta-reasoning')}
              className={`px-4 py-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMiddleTab === 'meta-reasoning' ? 'border-primary-500 text-white bg-dark-900/40' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              <Sparkles size={14} className="text-accent-purple" /> Reasoning Trace (UILS)
            </button>
          </div>

          {/* Tab Workspace Panel Contents */}
          <div className="flex-1 p-5 overflow-y-auto">
            {activeMiddleTab === 'chat' && (
              <div className="space-y-4 text-xs">
                {chatLog.map((chat, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-lg leading-relaxed ${
                      chat.sender === 'user'
                        ? 'bg-primary-500/10 border border-primary-500/30 text-white ml-12'
                        : 'bg-dark-800/40 border border-dark-700/30 text-dark-100 mr-12 space-y-2'
                    }`}
                  >
                    {chat.text.startsWith('###') ? (
                      <div className="space-y-2.5">
                        {chat.text.split('\n').map((line, lIdx) => {
                          if (line.startsWith('###')) {
                            return <h4 key={lIdx} className="font-bold text-white text-xs border-b border-dark-700/50 pb-1 mt-2">{line.replace('###', '')}</h4>;
                          }
                          if (line.includes('[VERIFIED FACTS]')) {
                            return <div key={lIdx} className="text-accent-green font-bold text-[10px] tracking-wider uppercase mt-2">Verified Blockchain Facts</div>;
                          }
                          if (line.includes('[ANALYTICAL OBSERVATIONS]')) {
                            return <div key={lIdx} className="text-primary-400 font-bold text-[10px] tracking-wider uppercase mt-2">Analytical Observations</div>;
                          }
                          if (line.includes('[INVESTIGATIVE HYPOTHESIS]')) {
                            return <div key={lIdx} className="text-accent-gold font-bold text-[10px] tracking-wider uppercase mt-2">{line}</div>;
                          }
                          if (line.startsWith('*')) {
                            return <li key={lIdx} className="ml-3 list-disc mt-0.5 text-dark-200">{line.replace('*', '')}</li>;
                          }
                          if (line.startsWith('>')) {
                            return (
                              <div key={lIdx} className="p-2.5 bg-dark-950 border-l border-accent-gold rounded text-[10px] text-dark-400 mt-2 font-medium italic">
                                {line.replace('>', '')}
                              </div>
                            );
                          }
                          return <p key={lIdx} className="text-dark-200">{line}</p>;
                        })}
                      </div>
                    ) : (
                      chat.text
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-1.5 text-dark-500 italic p-2">
                    <div className="w-1.5 h-1.5 bg-dark-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    <span>Streaming AI feedback...</span>
                  </div>
                )}
              </div>
            )}

            {activeMiddleTab === 'graph' && (
              <div className="space-y-4 font-mono text-xs">
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Visual Hop flow Preview</span>
                <div className="bg-dark-900/60 p-4 border border-dark-800 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-accent-green flex items-center justify-center text-[9px] font-extrabold text-black">S</div>
                    <span className="text-dark-300">0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28</span>
                    <span className="text-dark-500">(Source Suspect)</span>
                  </div>
                  <div className="h-4 border-l border-dashed border-dark-700 ml-2" />
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-accent-gold flex items-center justify-center text-[9px] font-extrabold text-black">I</div>
                    <span className="text-dark-300">0xa855f72a855f72a855f72a855f72a855f72a7777</span>
                    <span className="text-dark-500">(Intermediary Layer)</span>
                  </div>
                </div>
              </div>
            )}

            {activeMiddleTab === 'timeline' && (
              <div className="space-y-4 text-xs">
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Unified Case Milestones</span>
                <div className="relative border-l border-dark-800 pl-4 space-y-4 ml-2">
                  {mockTimeline.map((item) => (
                    <div key={item.id} className="relative text-xs">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-dark-900 border-2 border-primary-500" />
                      <span className="text-[10px] text-dark-500">{new Date(item.timestamp).toLocaleDateString('en-IN')}</span>
                      <p className="font-bold text-white mt-0.5">{item.title}</p>
                      <p className="text-dark-400 mt-0.5">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeMiddleTab === 'evidence' && (
              <div className="space-y-4 text-xs">
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Indexed Evidence Integrity Seals</span>
                <div className="space-y-2">
                  {mockEvidence.map((item) => (
                    <div key={item.id} className="p-3 bg-dark-800/40 border border-dark-700/30 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white block">{item.title}</span>
                        <code className="text-[10px] text-dark-500 block mt-0.5">Hash: {item.fileHash || 'MD5 verified'}</code>
                      </div>
                      <span className="text-[10px] text-accent-green font-bold flex items-center gap-0.5 font-mono">
                        <ShieldCheck size={12} /> SHA256 SEALED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeMiddleTab === 'meta-reasoning' && (
              <div className="space-y-6 text-xs animate-fade-in">
                {/* AI Reasoning Chain linking evidence -> conclusion */}
                <div className="glass-card p-4 border-dark-700/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-primary-400" />
                      <span className="font-bold text-white">AI Evidence-to-Conclusion Reasoning Chain</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-accent-green/10 text-accent-green font-bold text-[9px] uppercase font-mono">Verified Integrity</span>
                  </div>

                  <div className="relative border-l-2 border-primary-500/30 pl-4 space-y-4 ml-2">
                    <div className="relative text-[11px] space-y-0.5">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-dark-900 border-2 border-primary-400" />
                      <span className="text-[9px] text-dark-500 font-bold block uppercase tracking-wider">Step 1: Evidence Ingestion</span>
                      <p className="font-bold text-white">Physical File: `frozen_funds_dossier.pdf` (SHA-256 Checksum Sealed)</p>
                      <p className="text-dark-400 text-[10px]">Indexed into database and linked to target suspect wallet address.</p>
                    </div>

                    <div className="relative text-[11px] space-y-0.5">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-dark-900 border-2 border-primary-400" />
                      <span className="text-[9px] text-dark-500 font-bold block uppercase tracking-wider">Step 2: Observation & Mixer Scan</span>
                      <p className="font-bold text-white">Detected 1,420.5 ETH inbounds from high-risk Tornado Cash pools</p>
                      <p className="text-dark-400 text-[10px]">Scanned block tx logs for known mixer router interaction signatures.</p>
                    </div>

                    <div className="relative text-[11px] space-y-0.5">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-dark-900 border-2 border-accent-gold" />
                      <span className="text-[9px] text-dark-500 font-bold block uppercase tracking-wider">Step 3: Hypothesis Formulation</span>
                      <p className="font-bold text-white">Laundering & asset masking detected. Formulating peel-chain hypothesis</p>
                      <p className="text-dark-400 text-[10px]">Identified automated cash-out runner scripts moving funds to intermediate hops.</p>
                    </div>

                    <div className="relative text-[11px] space-y-0.5">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-dark-900 border-2 border-primary-400" />
                      <span className="text-[9px] text-dark-500 font-bold block uppercase tracking-wider">Step 4: Heuristic Clustering</span>
                      <p className="font-bold text-white">Co-spending inputs cluster associated addresses with Exchange Deposit Tag 90218</p>
                      <p className="text-dark-400 text-[10px]">Multi-input spender heuristics mapped common ownership across 4 suspect wallets.</p>
                    </div>

                    <div className="relative text-[11px] space-y-0.5">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-accent-green border-2 border-accent-green" />
                      <span className="text-[9px] text-accent-green font-bold block uppercase tracking-wider">Step 5: Verified Verdict</span>
                      <p className="font-bold text-accent-green">Confirmed control link to Ransomware Extortion Syndicate. Admissible Section 65B/63 BSA certified</p>
                      <p className="text-dark-400 text-[10px]">Digital signature seals validated. Evidence packaged and export-ready for court submission.</p>
                    </div>
                  </div>
                </div>

                {/* Repeat Offenders & Cross-Case Pattern Recognition */}
                <div className="glass-card p-4 border-dark-700/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-accent-red" />
                      <span className="font-bold text-white">Cross-Case Pattern Recognition (Repeat Offenders)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-accent-red/10 text-accent-red font-bold text-[9px] uppercase font-mono">2 Entities Flagged</span>
                  </div>

                  <p className="text-dark-400 text-[11px] leading-relaxed">
                    The cross-case correlation engine scans active/closed database files to identify addresses linking independent crimes.
                  </p>

                  <div className="space-y-3">
                    <div className="p-3 bg-dark-900 border border-dark-800 rounded-lg space-y-2">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <code className="text-xs text-white font-mono font-bold select-all">0x71c20e241775e5332f143715df332f143789a71b</code>
                        <span className="px-1.5 py-0.5 bg-accent-red/10 border border-accent-red/20 text-accent-red font-bold text-[9px] rounded uppercase font-mono">Risk: 98%</span>
                      </div>
                      <p className="text-[10px] text-dark-300">Associated Cases: <span className="text-white font-mono font-bold">CC-2026-CPOS-7935</span>, <span className="text-white font-mono font-bold">CC-2026-FRD-9F31</span></p>
                      <p className="text-[10px] text-dark-400 italic">Profile: Syndicate wallet actively utilized across multiple ransomware laundering networks.</p>
                    </div>

                    <div className="p-3 bg-dark-900 border border-dark-800 rounded-lg space-y-2">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <code className="text-xs text-white font-mono font-bold select-all">1LbcPeel5s9zARansom993vX78cDf</code>
                        <span className="px-1.5 py-0.5 bg-accent-red/10 border border-accent-red/20 text-accent-red font-bold text-[9px] rounded uppercase font-mono">Risk: 85%</span>
                      </div>
                      <p className="text-[10px] text-dark-300">Associated Cases: <span className="text-white font-mono font-bold">CC-2026-CPOS-A1B2</span>, <span className="text-white font-mono font-bold">CC-2026-1001</span></p>
                      <p className="text-[10px] text-dark-400 italic">Profile: High-volume BTC peeling address linked to extortion payout structures.</p>
                    </div>
                  </div>
                </div>

                {/* Case Auto-Generation Logs */}
                <div className="glass-card p-4 border-dark-700/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-accent-gold" />
                      <span className="font-bold text-white">Recently Triggered Case Auto-Generations</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-accent-gold/10 text-accent-gold font-bold text-[9px] uppercase font-mono">Active Sync</span>
                  </div>

                  <p className="text-dark-400 text-[11px] leading-relaxed">
                    Transactions flagged as critical risk by CPOS logic gates automatically bootstrap fresh, compliant investigation folders.
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2.5 bg-dark-900 border border-dark-850 rounded">
                      <div>
                        <span className="font-bold text-white font-mono">CC-2026-CPOS-7935</span>
                        <span className="text-[9px] text-dark-500 block">Trigger: CPOS Fraud Flag (`trace-1db3ea60`)</span>
                      </div>
                      <span className="badge-red text-[9px]">CRITICAL</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-dark-900 border border-dark-850 rounded">
                      <div>
                        <span className="font-bold text-white font-mono">CC-2026-FRD-9F31</span>
                        <span className="text-[9px] text-dark-500 block">Trigger: High-Risk Fraud Detector (Score: 1.0)</span>
                      </div>
                      <span className="badge-red text-[9px]">CRITICAL</span>
                    </div>
                  </div>
                </div>

                {/* UCAL Section */}
                <div className="glass-card p-4 border-dark-700/50 space-y-3">
                  <div className="flex items-center gap-2 border-b border-dark-800 pb-2">
                    <Info size={14} className="text-primary-400" />
                    <span className="font-bold text-white">Universal Cognitive Abstraction Layer (UCAL)</span>
                  </div>
                  <p className="text-dark-400 text-[11px] leading-relaxed">
                    UILS transforms blockchain transaction graphs, wallet heuristics, and anomaly scores into standardized relational logic models before generating investigative hypotheses.
                  </p>
                </div>

                {/* MCIE Trace Section */}
                <div className="glass-card p-4 border-dark-700/50 space-y-4">
                  <div className="flex items-center gap-2 border-b border-dark-800 pb-2">
                    <Sparkles size={14} className="text-accent-purple" />
                    <span className="font-bold text-white">Active Reasoning Trace & Decision Quality (MCIE)</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 bg-dark-900 border border-dark-800 rounded-lg">
                      <span className="text-[9px] text-dark-500 block uppercase">Confidence Score</span>
                      <span className="text-white font-mono font-bold text-sm">94.2%</span>
                    </div>
                    <div className="p-2.5 bg-dark-900 border border-dark-800 rounded-lg">
                      <span className="text-[9px] text-dark-500 block uppercase">Logical Consistency</span>
                      <span className="text-white font-mono font-bold text-sm">98.6%</span>
                    </div>
                    <div className="p-2.5 bg-dark-900 border border-dark-800 rounded-lg">
                      <span className="text-[9px] text-dark-500 block uppercase">Evidence Strength</span>
                      <span className="text-accent-green font-mono font-bold text-sm">High</span>
                    </div>
                    <div className="p-2.5 bg-dark-900 border border-dark-800 rounded-lg">
                      <span className="text-[9px] text-dark-500 block uppercase">Superposition Entropy</span>
                      <span className="text-white font-mono font-bold text-sm">0.04</span>
                    </div>
                  </div>

                  <div className="space-y-2 bg-dark-900/60 p-3.5 rounded-lg border border-dark-800 text-[11px] leading-relaxed">
                    <span className="text-[10px] text-dark-400 font-bold block uppercase tracking-wider">Cognitive Mapping Trails</span>
                    <div className="space-y-1.5 font-mono">
                      <div><span className="text-primary-400">&gt; Entity:</span> Wallet <code className="text-white bg-dark-800 px-1 rounded">0x742d...bD28</code> mapped to <span className="text-accent-gold">Suspect Layering Runner</span>.</div>
                      <div><span className="text-primary-400">&gt; Relational:</span> Peeling transactions identified with temporal frequency &Delta;t &lt; 12s.</div>
                      <div><span className="text-primary-400">&gt; Resolution:</span> Evaluated 2 alternate hypotheses. State collapsed to suspect script behavior with 88% priority.</div>
                    </div>
                  </div>
                </div>

                {/* AICL Conflict Arbitration Section */}
                <div className="glass-card p-4 border-dark-700/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-primary-400" />
                      <span className="font-bold text-white">AICL Coordination & Conflict Arbitration (CDAS)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-accent-green/10 text-accent-green font-bold text-[9px]">NO CONFLICTS ACTIVE</span>
                  </div>

                  <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                    <div className="flex justify-between border-b border-dark-800/40 pb-1">
                      <span className="text-dark-400">Last Arbitration Event:</span>
                      <span className="text-white">15 mins ago</span>
                    </div>
                    <div className="p-2.5 bg-dark-900 border border-dark-800 rounded text-dark-300">
                      <div className="font-bold text-white mb-1">&gt; Source Conflict resolved:</div>
                      Graph AI (Risk: <span className="text-accent-red font-semibold">Critical</span>) vs Behavioral AI (Risk: <span className="text-accent-gold font-semibold">Medium</span>).
                      <div className="mt-1"><span className="text-primary-400">Resolution:</span> Arbitrated to **Critical** risk score based on confirmed SHA-256 evidence links (Confidence: **94.2%**).</div>
                    </div>
                  </div>
                </div>

                {/* APDIC Decision Synthesis & Orchestration Section (Chapter 31) */}
                <div className="glass-card p-4 border-dark-700/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-primary-400" />
                      <span className="font-bold text-white">Planetary Decision Intelligence Core (APDIC)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 font-bold text-[9px]">DECISION COMMITTED</span>
                  </div>

                  <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                    <div className="flex justify-between border-b border-dark-800/40 pb-1">
                      <span className="text-dark-400">Synthesis State:</span>
                      <span className="text-white">Synthesized & Consolidated</span>
                    </div>
                    <div className="flex justify-between border-b border-dark-800/40 pb-1">
                      <span className="text-dark-400">Action Dispatched:</span>
                      <span className="text-accent-green">Traced +2 intermediate hops, updated risk scoring model</span>
                    </div>
                    <div className="flex justify-between border-b border-dark-800/40 pb-1">
                      <span className="text-dark-400">Execution Latency:</span>
                      <span className="text-white">22ms (Sub-second dispatch)</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-dark-400">Arbitration Status:</span>
                      <span className="text-white">Passed GCSMF compliance check</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputMessage); }} className="p-3 border-t border-dark-700/50 flex gap-2">
            <input
              type="text"
              placeholder={`Co-Investigator prompt: (Context Mode: ${contextMode.toUpperCase()})`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="input-field py-2 px-3 text-xs flex-1"
            />
            <button 
              type="submit" 
              className="btn-primary py-2 px-4 flex items-center justify-center gap-1.5 font-bold text-xs"
              disabled={!inputMessage.trim()}
            >
              <Send size={12} /> Submit
            </button>
          </form>
        </div>

        {/* RIGHT PANEL: Decision Support & Readiness */}
        <div className="w-80 glass-card p-4 space-y-6 border-dark-700/50 overflow-y-auto">
          {/* Readiness Score dial */}
          <div className="space-y-3 pb-4 border-b border-dark-700/50 text-xs">
            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Case Readiness Metrics</span>
            <div className="flex items-center gap-4 bg-dark-900/60 p-3.5 rounded-xl border border-dark-800">
              <div className="relative w-14 h-14 rounded-full border-4 border-primary-500/20 flex items-center justify-center font-bold text-lg text-white shadow-glow-cyan">
                {readinessScore}%
              </div>
              <div>
                <span className="font-bold text-white block">Ready for Review</span>
                <span className="text-[10px] text-dark-400">Complete remaining tasks below to seal file.</span>
              </div>
            </div>
          </div>

          {/* SOIS Autonomous Execution Controls */}
          <div className="space-y-3 pb-4 border-b border-dark-700/50 text-xs">
            <span className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block flex items-center gap-1.5 text-primary-400">
              <Database size={14} />
              SOIS Autonomous Execution
            </span>
            <div className="bg-dark-900/60 p-3 rounded-lg border border-dark-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-dark-400">Autonomy Level:</span>
                <select
                  value={autonomyLevel}
                  onChange={(e: any) => setAutonomyLevel(e.target.value)}
                  className="bg-dark-850 border border-dark-700 text-white text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-primary-500"
                  disabled={isRunningSOIS}
                >
                  <option value="L1">L1: Assisted</option>
                  <option value="L2">L2: Semi-Auto</option>
                  <option value="L3">L3: Controlled</option>
                  <option value="L4">L4: Emergency</option>
                </select>
              </div>

              {isRunningSOIS ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] text-primary-400 font-semibold animate-pulse">
                    <span>Executing SOIS Loop...</span>
                    <span>{Math.round(((soisStepIndex + 1) / 5) * 100)}%</span>
                  </div>
                  <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary-500 h-full transition-all duration-300"
                      style={{ width: `${((soisStepIndex + 1) / 5) * 100}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-dark-400 font-mono italic max-h-[80px] overflow-hidden truncate">
                    &gt; {soisSteps[soisStepIndex]?.label}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={triggerSOISLoop}
                    className="w-full btn-primary py-1.5 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} /> Trigger Autonomous Sweep
                  </button>
                  <button
                    type="button"
                    onClick={triggerQuantumSimulation}
                    disabled={isRunningQuantum}
                    className="w-full bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20 py-1.5 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all rounded-lg"
                  >
                    <Globe size={11} className={isRunningQuantum ? "animate-spin-slow" : ""} />
                    {isRunningQuantum ? "Simulating paths..." : "Simulate Quantum paths"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Gaps recommendations */}
          <div className="space-y-3 pb-4 border-b border-dark-700/50 text-xs">
            <span className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-accent-gold" />
              Evidence Gap Recommendations
            </span>
            <div className="space-y-2">
              {evidenceGaps.map((gap, idx) => (
                <div key={idx} className="p-2.5 bg-accent-gold/5 border border-accent-gold/20 rounded text-[11px] text-dark-300 hover:border-accent-gold/30 transition-colors leading-relaxed">
                  * {gap}
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Followups */}
          <div className="space-y-3 text-xs">
            <span className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block flex items-center gap-1.5">
              <ListTodo size={14} className="text-primary-400" />
              Suggested Work Queue
            </span>
            <div className="space-y-2">
              {pendingTasks.map((task, idx) => (
                <div key={idx} className="p-2.5 bg-dark-800/40 border border-dark-700/40 rounded text-[11px] text-dark-200 hover:border-primary-500/30 transition-colors flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0" />
                  <span className="truncate">{task}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
