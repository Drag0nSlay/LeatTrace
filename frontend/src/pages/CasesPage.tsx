import React, { useState } from 'react';
import { useCaseStore, useNavStore, useBlockchainStore } from '../stores';
import { FolderOpen, Plus, Folder, Search, ArrowRight, Shield, Clock, AlertTriangle, CheckCircle2, User, UserCheck, Activity, FileText, Sparkles, CheckSquare, PlusCircle } from 'lucide-react';
import { getPriorityColor, getStatusColor, formatDate } from '../utils/helpers';
import type { Case } from '../types';

export const CasesPage: React.FC = () => {
  const { cases, selectedCase, selectCase, addCase, updateCase } = useCaseStore();
  const { setPage } = useNavStore();
  const { setSearchAddress } = useBlockchainStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newNotes, setNewNotes] = useState('');
  
  // Case details active tab state
  const [activeDetailsTab, setActiveDetailsTab] = useState<'summary' | 'victim' | 'suspects' | 'evidence' | 'timeline' | 'notes' | 'tasks' | 'ai'>('summary');

  // Case stage (1-9 pipeline stepper)
  const [caseStage, setCaseStage] = useState<number>(3); // Default to Wallet Collection

  // Collaborative task list state
  const [tasksList, setTasksList] = useState([
    { id: 't-1', text: 'Verify Hop-2 destination address Binance exchange logs', assignee: '@officer.rawat', done: false },
    { id: 't-2', text: 'Validate and seal primary suspects wallet PDF report file', assignee: '@lakshaysoni', done: true },
    { id: 't-3', text: 'Cross-reference Ronin bridge explorer multi-sig transactions', assignee: '@auditor.verma', done: false }
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('@officer.rawat');

  // Human-in-the-Loop Override states (Chapter 22 Part 5)
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [newConfidence, setNewConfidence] = useState('High');
  const [overrideSuccess, setOverrideSuccess] = useState(false);
  const [activeHypothesisText, setActiveHypothesisText] = useState('Target node owner likely operates within the Indian timezone (IST) based on periodic script executions peaking between 09:00 and 18:00 IST.');
  const [currentConfidence, setCurrentConfidence] = useState('Medium');

  const handleApplyOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideJustification.trim()) return;

    setCurrentConfidence(newConfidence);
    setOverrideSuccess(true);
    setOverrideMode(false);

    // Append to tasks/audit list
    setTasksList(prev => [
      {
        id: `t-override-${Date.now()}`,
        text: `[HITL OVERRIDE] AI Hypothesis confidence updated to ${newConfidence}. Justification: ${overrideJustification}`,
        assignee: '@supervisor.sinha',
        done: true
      },
      ...prev
    ]);

    setOverrideJustification('');
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const currentYear = new Date().getFullYear();
    const count = cases.length + 1001;
    const caseNumber = `CC-${currentYear}-${count}`;

    const newCaseItem: Case = {
      id: `case-${Math.random().toString(36).substr(2, 7)}`,
      caseNumber: caseNumber,
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      status: 'open',
      investigatorId: 'usr-001',
      investigatorName: 'Inspector Verma',
      department: 'Cyber Crime Cell',
      notes: newNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      walletCount: 0,
      evidenceCount: 0
    };

    addCase(newCaseItem);
    setShowCreateModal(false);
    
    // Reset state
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setNewNotes('');
  };

  const handleWalletTrace = (addr: string) => {
    setSearchAddress(addr);
    setPage('blockchain');
  };

  const toggleTask = (id: string) => {
    setTasksList(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasksList(prev => [
      ...prev,
      {
        id: `t-${Math.random().toString(36).substr(2, 5)}`,
        text: newTaskText,
        assignee: newTaskAssignee,
        done: false
      }
    ]);
    setNewTaskText('');
  };

  const stagesList = [
    { num: 1, label: 'Registration' },
    { num: 2, label: 'Intake' },
    { num: 3, label: 'Wallets' },
    { num: 4, label: 'Txns' },
    { num: 5, label: 'Analysis' },
    { num: 6, label: 'Review' },
    { num: 7, label: 'Sup. Review' },
    { num: 8, label: 'Reports' },
    { num: 9, label: 'Archive' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Forensic Case Management</h2>
          <p className="text-xs text-dark-400">Track and coordinate crypto fraud investigations and evidence chains</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)} 
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Create Case
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Case List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider">Investigation Files</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {cases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => { selectCase(c); setActiveDetailsTab('summary'); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'bg-primary-500/10 border-primary-500 shadow-glow-cyan' 
                      : 'bg-dark-800/40 border-dark-700/50 hover:border-dark-600/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] mono text-primary-400 font-semibold">{c.caseNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize ${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2 truncate">{c.title}</h4>
                  <p className="text-xs text-dark-400 line-clamp-2 mb-3">{c.description}</p>
                  
                  <div className="flex items-center justify-between border-t border-dark-700/50 pt-2.5 text-[10px] text-dark-400">
                    <span className="flex items-center gap-1"><Shield size={10} /> {c.evidenceCount} Assets</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(c.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Case Details with Tab Switcher */}
        <div className="lg:col-span-2">
          {selectedCase ? (
            <div className="glass-card p-6 space-y-6 border-dark-700/50">
              <div className="flex items-start justify-between flex-wrap gap-4 border-b border-dark-700/50 pb-5">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-xs mono text-primary-400 font-bold">{selectedCase.caseNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityColor(selectedCase.priority)}`}>
                      {selectedCase.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{selectedCase.title}</h3>
                  <p className="text-xs text-dark-400 mt-1">Assignee: <span className="font-semibold text-white">{selectedCase.investigatorName}</span> • {selectedCase.department}</p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  {selectedCase.status !== 'closed' && (
                    <button 
                      onClick={() => updateCase(selectedCase.id, { status: 'closed', closedAt: new Date().toISOString() })}
                      className="btn-success text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Close Case
                    </button>
                  )}
                  {selectedCase.status === 'closed' && (
                    <button 
                      onClick={() => updateCase(selectedCase.id, { status: 'active', closedAt: undefined })}
                      className="btn-ghost text-xs py-1.5 px-3 border border-dark-700/50"
                    >
                      Re-open Case
                    </button>
                  )}
                </div>
              </div>

              {/* 9-Stage Stepper Pipeline */}
              <div className="bg-dark-900/60 p-4 border border-dark-800 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Case Pipeline Progress</span>
                <div className="flex items-center justify-between text-[10px] text-dark-400 font-medium overflow-x-auto gap-2 pb-1">
                  {stagesList.map((stage) => {
                    const isPassed = stage.num < caseStage;
                    const isActive = stage.num === caseStage;
                    return (
                      <button 
                        key={stage.num}
                        onClick={() => setCaseStage(stage.num)}
                        className="flex flex-col items-center gap-1.5 text-center flex-1 min-w-[65px] transition-all cursor-pointer hover:opacity-85"
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all ${
                          isActive 
                            ? 'bg-accent-green border-accent-green text-black shadow-glow-green scale-110' 
                            : isPassed 
                              ? 'bg-primary-500/20 border-primary-500 text-primary-400' 
                              : 'bg-dark-800 border-dark-700 text-dark-400'
                        }`}>
                          {stage.num}
                        </div>
                        <span className={`text-[9px] truncate w-full ${isActive ? 'text-white font-extrabold' : isPassed ? 'text-dark-300' : 'text-dark-500'}`}>
                          {stage.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Case Details Tab Switcher */}
              <div className="flex border-b border-dark-700/50 bg-dark-800/10 rounded-t-lg overflow-x-auto">
                {([
                  { id: 'summary', label: 'Summary' },
                  { id: 'victim', label: 'Victims' },
                  { id: 'suspects', label: 'Suspects' },
                  { id: 'evidence', label: 'Evidence' },
                  { id: 'timeline', label: 'Timeline' },
                  { id: 'notes', label: 'Notes' },
                  { id: 'tasks', label: 'Tasks & Team' },
                  { id: 'ai', label: 'AI Insights' }
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailsTab(tab.id)}
                    className={`px-4 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeDetailsTab === tab.id
                        ? 'border-primary-500 text-white bg-dark-900/30'
                        : 'border-transparent text-dark-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Workspace Contents */}
              <div className="space-y-4">
                {activeDetailsTab === 'summary' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Case Background</h4>
                      <p className="text-sm text-dark-100 leading-relaxed bg-dark-800/20 p-4 rounded-lg border border-dark-800/40">
                        {selectedCase.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-dark-800/30 p-3 rounded-lg border border-dark-850">
                        <span className="text-[10px] text-dark-400 block uppercase">Created At</span>
                        <span className="text-xs font-semibold text-white">{formatDate(selectedCase.createdAt)}</span>
                      </div>
                      <div className="bg-dark-800/30 p-3 rounded-lg border border-dark-850">
                        <span className="text-[10px] text-dark-400 block uppercase">Last Updated</span>
                        <span className="text-xs font-semibold text-white">{formatDate(selectedCase.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailsTab === 'victim' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Victim Profiles</h4>
                    
                    {selectedCase.id === 'case-001' || selectedCase.id === 'case-1' ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-dark-800/40 border border-dark-700/30 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <User size={16} className="text-primary-400" />
                            <div>
                              <span className="text-xs font-bold text-white block">Dr. Amit Kumar (Delhi NCR)</span>
                              <span className="text-[10px] text-dark-400">Incident method: Layered smart contract fraud</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-accent-red">₹12.0 Crore</span>
                            <span className="text-[9px] text-dark-500 block">Direct transfer</span>
                          </div>
                        </div>

                        <div className="p-3 bg-dark-800/40 border border-dark-700/30 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <User size={16} className="text-primary-400" />
                            <div>
                              <span className="text-xs font-bold text-white block">Mrs. Priya Patel (Mumbai)</span>
                              <span className="text-[10px] text-dark-400">Incident method: Token swap routing swap</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-accent-red">₹8.5 Crore</span>
                            <span className="text-[9px] text-dark-500 block">DEX split</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-dark-800/10 border border-dashed border-dark-800 rounded-lg">
                        <p className="text-xs text-dark-400">No victim information records attached to this case.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeDetailsTab === 'suspects' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Linked Suspect Nodes</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedCase.id === 'case-001' || selectedCase.id === 'case-1' ? (
                        <>
                          <div className="p-3 bg-dark-800/40 border border-dark-700/30 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">Primary Suspect Wallet</p>
                              <code className="text-[10px] text-accent-red mono block mt-0.5">0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28</code>
                            </div>
                            <button 
                              onClick={() => handleWalletTrace('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28')}
                              className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-white transition-colors"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </div>
                          
                          <div className="p-3 bg-dark-800/40 border border-dark-700/30 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">Intermediary Layer Node</p>
                              <code className="text-[10px] text-accent-gold mono block mt-0.5">0xa855f72a855f72a855f72a855f72a855f72a7777</code>
                            </div>
                            <button 
                              onClick={() => handleWalletTrace('0xa855f72a855f72a855f72a855f72a855f72a7777')}
                              className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-white transition-colors"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 text-center py-6 bg-dark-800/10 border border-dashed border-dark-800 rounded-lg">
                          <p className="text-xs text-dark-400">No suspect addresses linked yet.</p>
                          <button 
                            onClick={() => setPage('blockchain')}
                            className="text-[11px] text-primary-400 mt-1 hover:underline"
                          >
                            Trace target wallet →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeDetailsTab === 'evidence' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Forensic Evidence Catalog</h4>
                      <button onClick={() => setPage('evidence')} className="text-[11px] text-primary-400 hover:underline">
                        Open Evidence Vault →
                      </button>
                    </div>

                    {selectedCase.id === 'case-001' || selectedCase.id === 'case-1' ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-dark-900 border border-dark-800 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-primary-400" />
                            <span>suspect_wallet_flow.pdf</span>
                          </div>
                          <span className="text-[10px] text-accent-green font-bold flex items-center gap-0.5">
                            <Shield size={10} /> SHA256 SEALED
                          </span>
                        </div>
                        <div className="p-3 bg-dark-900 border border-dark-800 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-primary-400" />
                            <span>victim_Amit_transfer_reciept.jpg</span>
                          </div>
                          <span className="text-[10px] text-accent-green font-bold flex items-center gap-0.5">
                            <Shield size={10} /> SHA256 SEALED
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-dark-800/10 border border-dashed border-dark-800 rounded-lg">
                        <p className="text-xs text-dark-400">No evidence files linked to this case.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeDetailsTab === 'timeline' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Timeline of Investigations</h4>
                    
                    <div className="relative border-l border-dark-800 pl-4 space-y-4 ml-2">
                      <div className="relative text-xs">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-dark-900 border-2 border-primary-500" />
                        <span className="text-[10px] text-dark-400 block">{formatDate(selectedCase.createdAt)}</span>
                        <p className="font-bold text-white mt-0.5">Investigation Initiated</p>
                        <p className="text-dark-400 text-[11px]">Case folder registered by {selectedCase.investigatorName}</p>
                      </div>
                      
                      <div className="relative text-xs">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-dark-900 border-2 border-primary-500" />
                        <span className="text-[10px] text-dark-400 block">{formatDate(selectedCase.updatedAt)}</span>
                        <p className="font-bold text-white mt-0.5">Wallet Analysis Hooked</p>
                        <p className="text-dark-400 text-[11px]">Suspect address transaction flows traced through Graph solver</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailsTab === 'notes' && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Investigator Notes</h4>
                    <textarea 
                      value={selectedCase.notes || ''} 
                      onChange={(e) => updateCase(selectedCase.id, { notes: e.target.value })}
                      placeholder="Add case updates or operational logs here..."
                      className="w-full min-h-[140px] p-3 text-xs bg-dark-800/40 border border-dark-700/40 rounded-lg focus:outline-none focus:border-primary-500 text-white"
                    />
                  </div>
                )}

                {activeDetailsTab === 'tasks' && (
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Team Tasks & Collaboration</h4>
                      <span className="text-[10px] text-dark-400">Recorded in Case Audit Log</span>
                    </div>

                    {/* Task add form */}
                    <form onSubmit={handleAddTask} className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Add task details... (e.g. Subpoena Binance records)"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        className="input-field py-1.5 px-3 flex-1 text-xs"
                      />
                      <select
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                        className="input-field py-1.5 px-2 text-xs w-36"
                      >
                        <option value="@officer.rawat">@officer.rawat</option>
                        <option value="@lakshaysoni">@lakshaysoni</option>
                        <option value="@auditor.verma">@auditor.verma</option>
                      </select>
                      <button type="submit" className="btn-primary py-1.5 px-3 flex items-center gap-1 font-semibold">
                        <PlusCircle size={14} /> Add
                      </button>
                    </form>

                    {/* Tasks list */}
                    <div className="space-y-2">
                      {tasksList.map(task => (
                        <div key={task.id} className="p-3 bg-dark-800/40 border border-dark-700/30 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <input 
                              type="checkbox"
                              checked={task.done}
                              onChange={() => toggleTask(task.id)}
                              className="w-3.5 h-3.5 rounded border-dark-700 bg-dark-900 text-primary-500 focus:ring-primary-500/20 cursor-pointer"
                            />
                            <span className={`text-xs ${task.done ? 'line-through text-dark-500' : 'text-dark-100'}`}>
                              {task.text}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] bg-dark-800 border border-dark-700 text-primary-400 font-mono font-semibold">
                            {task.assignee}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeDetailsTab === 'ai' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-dark-700/50 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-primary-400 animate-pulse" />
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">AI Forensics Report Draft</h4>
                      </div>
                      <button
                        onClick={() => setOverrideMode(!overrideMode)}
                        className="btn-ghost text-[10px] py-1 px-2 border border-dark-700 hover:border-primary-500 text-dark-300 hover:text-white flex items-center gap-1 font-semibold"
                      >
                        <UserCheck size={10} /> HITL Override Panel
                      </button>
                    </div>
                    
                    {overrideMode && (
                      <form onSubmit={handleApplyOverride} className="bg-dark-900 border border-primary-500/20 p-4 rounded-lg space-y-3 animate-scale-in text-xs">
                        <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                          <span className="font-bold text-white flex items-center gap-1.5 text-primary-400">
                            <Shield size={12} /> Supervisor Decisions Override
                          </span>
                          <span className="text-[9px] text-dark-400">Logged to Regulatory Audit</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-dark-300 mb-1 font-medium">Confidence Override</label>
                            <select
                              value={newConfidence}
                              onChange={(e) => setNewConfidence(e.target.value)}
                              className="input-field py-1.5 px-2 text-xs"
                            >
                              <option value="Low">Low (Requires Verification)</option>
                              <option value="Medium">Medium (Probable)</option>
                              <option value="High">High (Highly Probable)</option>
                              <option value="Critical">Critical (OFAC Verified)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-dark-300 mb-1 font-medium">Rephrased Hypothesis Text</label>
                            <input
                              type="text"
                              value={activeHypothesisText}
                              onChange={(e) => setActiveHypothesisText(e.target.value)}
                              className="input-field py-1.5 px-2 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-dark-300 mb-1 font-medium">Justification for Override (Mandatory)</label>
                          <textarea
                            required
                            value={overrideJustification}
                            onChange={(e) => setOverrideJustification(e.target.value)}
                            placeholder="State the evidence/logs backing this correction..."
                            className="w-full h-14 p-2 bg-dark-800 border border-dark-700/50 rounded text-xs focus:outline-none focus:border-primary-500 text-white"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setOverrideMode(false)}
                            className="btn-ghost py-1 px-3"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn-primary py-1 px-3 font-semibold"
                          >
                            Confirm Override & Commit Log
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-3">
                      {/* Fact card */}
                      <div className="p-3.5 bg-accent-green/5 border border-accent-green/20 rounded-lg text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-accent-green font-bold uppercase text-[10px] tracking-wider">
                          <CheckCircle2 size={12} /> Verified Fact
                        </div>
                        <p className="text-dark-200 leading-relaxed">
                          Target address `0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28` holds a ledger balance of 4,215.42 ETH as of block #19234567. Direct inflow trace originates from Mixer pools.
                        </p>
                      </div>

                      {/* Observation card */}
                      <div className="p-3.5 bg-primary-500/5 border border-primary-500/20 rounded-lg text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-primary-400 font-bold uppercase text-[10px] tracking-wider">
                          <Activity size={12} /> Analytical Observation
                        </div>
                        <p className="text-dark-200 leading-relaxed">
                          Transactions pattern fits automated contract peeling chain distribution, dividing funds across 23 sub-wallets within a 2-hour timeframe.
                        </p>
                      </div>

                      {/* Hypothesis card */}
                      <div className="p-3.5 bg-accent-gold/5 border border-accent-gold/20 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2 text-accent-gold font-bold uppercase text-[10px] tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle size={12} /> Investigative Hypothesis
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-accent-gold/15 text-[9px]">Confidence: {currentConfidence}</span>
                        </div>
                        <p className="text-dark-200 leading-relaxed">
                          {activeHypothesisText}
                        </p>
                        <p className="p-2 bg-dark-900 border-l border-accent-gold/40 rounded text-[10px] text-dark-400 italic">
                          Disclaimer: Hypotheses require external subpoena confirmations (KYC/IP mappings) before use in judicial warrants.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="w-12 h-12 bg-dark-800 rounded-full flex items-center justify-center text-dark-400 mb-4">
                <FolderOpen size={24} />
              </div>
              <h3 className="text-base font-semibold text-white">No Case Selected</h3>
              <p className="text-xs text-dark-400 mt-1 max-w-xs">Select an investigation file from the sidebar to inspect case assets and forensic logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center gap-2 mb-4 border-b border-dark-700/50 pb-3">
              <Folder size={18} className="text-primary-400" />
              <h3 className="text-base font-semibold text-white">Create Forensic Case</h3>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">Case Title</label>
                <input 
                  type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. GainChain Ponzi Fund Tracing"
                  className="input-field py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">Description</label>
                <textarea 
                  required value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Briefly state the incident, victims, and estimated losses..."
                  className="w-full h-20 p-2.5 text-xs bg-dark-800/40 border border-dark-700/50 rounded-lg focus:outline-none focus:border-primary-500 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">Priority Level</label>
                <select 
                  value={newPriority} 
                  onChange={(e: any) => setNewPriority(e.target.value)}
                  className="input-field py-2 text-xs"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">Initial Notes</label>
                <input 
                  type="text" value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Victim reported transfer via WazirX exchange..."
                  className="input-field py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-700/50">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost py-2 text-xs px-4"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary py-2 text-xs px-4"
                >
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
