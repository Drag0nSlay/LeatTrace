import React, { useState } from 'react';
import { useCaseStore } from '../stores';
import { mockEvidence } from '../data/mockData';
import { Shield, ShieldAlert, ShieldCheck, Upload, Trash2, FileText, CheckCircle2, AlertTriangle, FileUp, Key, FileCheck, ArrowRight, X } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import type { Evidence } from '../types';

export const EvidencePage: React.FC = () => {
  const { cases, selectedCase, selectCase } = useCaseStore();
  const [evidenceList, setEvidenceList] = useState<Evidence[]>(mockEvidence);
  const [verifyStatus, setVerifyStatus] = useState<Record<string, 'checking' | 'verified' | 'tampered'>>({});
  
  // Custom mock custody chain & seals
  const [custodyLogs, setCustodyLogs] = useState<Record<string, Array<{action: string, performedBy: string, recipient?: string, timestamp: string, notes: string}>>>({
    'ev-001': [
      { action: 'UPLOADED', performedBy: 'Inspector Verma', timestamp: '2026-05-10T10:00:00Z', notes: 'Initial wallet identification.' },
      { action: 'EXAMINED', performedBy: 'Analyst Singh', timestamp: '2026-05-12T11:00:00Z', notes: 'Verified matching smart contract transaction log traces.' },
      { action: 'SEALED', performedBy: 'Inspector Verma', timestamp: '2026-05-15T09:30:00Z', notes: 'Signed and locked for court admissibility.' }
    ],
    'ev-002': [
      { action: 'UPLOADED', performedBy: 'Inspector Verma', timestamp: '2026-05-12T14:30:00Z', notes: 'Transaction from victim wallet depositing 7 ETH.' }
    ],
    'ev-003': [
      { action: 'UPLOADED', performedBy: 'Inspector Verma', timestamp: '2026-05-11T16:00:00Z', notes: 'Ingested verified GainChain website mock banner screenshot.' },
      { action: 'TRANSFERRED', performedBy: 'Inspector Verma', recipient: 'Supervisor Sinha', timestamp: '2026-06-01T15:00:00Z', notes: 'Submitted for supervisory validation.' }
    ],
    'ev-004': [
      { action: 'UPLOADED', performedBy: 'Inspector Verma', timestamp: '2026-06-01T11:00:00Z', notes: 'Initial draft of fund flow analytical diagram.' }
    ],
    'ev-005': [
      { action: 'UPLOADED', performedBy: 'Inspector Verma', timestamp: '2026-06-02T09:00:00Z', notes: 'Ingested proof of ransom payments trail.' }
    ]
  });

  const [sealedStatus, setSealedStatus] = useState<Record<string, { sealed: boolean, signer?: string, signature?: string, keyPem?: string }>>({
    'ev-001': { 
      sealed: true, 
      signer: 'Inspector Verma', 
      signature: '3082010a0282010100d3a9d9e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
      keyPem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzV2S0r8...\n-----END PUBLIC KEY-----'
    }
  });

  // Verification & Detail Modals State
  const [selectedEvidenceForDetail, setSelectedEvidenceForDetail] = useState<Evidence | null>(null);
  const [showCertificateForEvidence, setShowCertificateForEvidence] = useState<Evidence | null>(null);
  const [modalTab, setModalTab] = useState<'timeline' | 'signature'>('timeline');
  
  // Upload State
  const [showUpload, setShowUpload] = useState(false);
  const [targetCase, setTargetCase] = useState(selectedCase?.id || cases[0]?.id || '');
  const [fileName, setFileName] = useState('');
  const [fileDesc, setFileDesc] = useState('');
  const [fileSize, setFileSize] = useState('42 KB');

  // Filter evidence based on selected case
  const activeEvidence = selectedCase 
    ? evidenceList.filter((e) => e.caseId === selectedCase.id)
    : evidenceList;

  const handleVerify = async (id: string, normalHash: boolean = true) => {
    setVerifyStatus((prev) => ({ ...prev, [id]: 'checking' }));
    
    // Simulate checksum verification delay
    await new Promise((r) => setTimeout(r, 1200));

    setVerifyStatus((prev) => ({
      ...prev,
      [id]: normalHash ? 'verified' : 'tampered'
    }));
  };

  const handleSealEvidence = (id: string) => {
    const characters = '0123456789abcdef';
    let mockSig = '';
    for (let i = 0; i < 64; i++) {
      mockSig += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    setSealedStatus((prev) => ({
      ...prev,
      [id]: {
        sealed: true,
        signer: 'Inspector Verma',
        signature: mockSig,
        keyPem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyYt92aB...\n-----END PUBLIC KEY-----'
      }
    }));

    // Add to custody chain
    const newCustodyEvent = {
      action: 'SEALED',
      performedBy: 'Inspector Verma',
      timestamp: new Date().toISOString(),
      notes: 'Signed and sealed with RSA digital signature for court admissibility.'
    };
    
    setCustodyLogs((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), newCustodyEvent]
    }));

    alert('Evidence item sealed successfully. Digital signature recorded in forensic ledger.');
  };

  const handleTransferCustody = (id: string, recipient: string, notes: string) => {
    const newCustodyEvent = {
      action: 'TRANSFERRED',
      performedBy: 'Inspector Verma',
      recipient: recipient,
      timestamp: new Date().toISOString(),
      notes: notes || `Custody transferred to ${recipient}.`
    };
    
    setCustodyLogs((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), newCustodyEvent]
    }));

    alert(`Custody transferred to ${recipient} successfully.`);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    // Simulate simple hash creation
    const characters = 'abcdef0123456789';
    let mockHash = '';
    for (let i = 0; i < 64; i++) {
      mockHash += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const newId = `evd-${Math.random().toString(36).substr(2, 7)}`;
    const newEvidenceItem: Evidence = {
      id: newId,
      caseId: targetCase,
      filename: fileName,
      fileHash: mockHash,
      fileSize: fileSize,
      uploadedBy: 'Inspector Verma',
      uploadTime: new Date().toISOString(),
      description: fileDesc,
      downloadUrl: '#',
    };

    setEvidenceList((prev) => [newEvidenceItem, ...prev]);
    
    // Initialize custody chain
    setCustodyLogs((prev) => ({
      ...prev,
      [newId]: [
        { action: 'UPLOADED', performedBy: 'Inspector Verma', timestamp: new Date().toISOString(), notes: 'Initial file ingestion into secure forensic vault.' }
      ]
    }));

    setShowUpload(false);
    
    // Reset states
    setFileName('');
    setFileDesc('');
    setFileSize('42 KB');

    // Update counts in cases
    const dbCase = cases.find((c) => c.id === targetCase);
    if (dbCase) {
      dbCase.evidenceCount += 1;
    }
  };

  const handleDelete = (id: string) => {
    const item = evidenceList.find((e) => e.id === id);
    setEvidenceList((prev) => prev.filter((e) => e.id !== id));
    if (item) {
      const dbCase = cases.find((c) => c.id === item.caseId);
      if (dbCase && dbCase.evidenceCount > 0) {
        dbCase.evidenceCount -= 1;
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Evidence Locker & Integrity Vault</h2>
          <p className="text-xs text-dark-400">Upload evidence files, track forensic signatures, and verify chain of custody hashes</p>
        </div>
        <button 
          onClick={() => setShowUpload(true)} 
          className="btn-primary flex items-center gap-2"
        >
          <Upload size={16} /> Secure Upload
        </button>
      </div>

      {/* Case Selector Filter */}
      <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-primary-400" />
          <span className="text-xs text-dark-300 font-semibold uppercase">Filter by Case File:</span>
          <select 
            value={selectedCase?.id || 'all'}
            onChange={(e) => {
              const id = e.target.value;
              if (id === 'all') selectCase(null);
              else {
                const c = cases.find((item) => item.id === id);
                if (c) selectCase(c);
              }
            }}
            className="input-field py-1.5 px-3 text-xs w-64 bg-dark-900 border-dark-700/50"
          >
            <option value="all">-- All Investigation Files --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.caseNumber} - {c.title}</option>
            ))}
          </select>
        </div>
        
        <div className="text-xs text-dark-400">
          Showing <span className="font-semibold text-white">{activeEvidence.length}</span> cataloged evidence items
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeEvidence.map((ev) => {
          const caseObj = cases.find((c) => c.id === ev.caseId);
          const status = verifyStatus[ev.id];
          const isSealed = sealedStatus[ev.id]?.sealed;
          
          return (
            <div key={ev.id} className="glass-card p-5 flex flex-col justify-between hover:border-dark-600 transition-colors">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-dark-800 flex items-center justify-center text-primary-400">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-[150px]">{ev.filename}</h4>
                      <p className="text-[10px] text-dark-400">{ev.fileSize} • {caseObj?.caseNumber || 'General'}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(ev.id)}
                    className="p-1 rounded text-dark-400 hover:text-accent-red hover:bg-dark-800 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <p className="text-xs text-dark-300 min-h-[32px] line-clamp-2">
                  {ev.description || 'No description cataloged.'}
                </p>

                {/* Audit Signatures */}
                <div className="p-3 bg-dark-900/60 rounded-lg border border-dark-800/80 space-y-2 text-[10px]">
                  <div>
                    <span className="text-dark-500 block uppercase">SHA-256 Checksum</span>
                    <code className="text-primary-400 font-mono block truncate">{ev.fileHash}</code>
                  </div>
                  <div className="flex items-center justify-between text-dark-400 border-t border-dark-800/80 pt-1.5">
                    <span>Uploaded By: {ev.uploadedBy}</span>
                    <span className="px-1.5 py-0.5 rounded bg-dark-800 font-mono">{isSealed ? "🔒 SEALED" : "🔓 UNSEALED"}</span>
                  </div>
                </div>
              </div>

              {/* Verify Controls */}
              <div className="mt-5 pt-3 border-t border-t-dark-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    {status === 'checking' && (
                      <span className="text-[10px] text-dark-400 flex items-center gap-1.5">
                        <div className="w-2 h-2 border-2 border-dark-400/30 border-t-primary-400 rounded-full animate-spin" />
                        Checking SHA-256...
                      </span>
                    )}
                    {status === 'verified' && (
                      <span className="text-[10px] text-accent-green font-bold flex items-center gap-1">
                        <ShieldCheck size={12} /> INTEGRITY VERIFIED
                      </span>
                    )}
                    {status === 'tampered' && (
                      <span className="text-[10px] text-accent-red font-bold flex items-center gap-1">
                        <ShieldAlert size={12} /> HASH TAMPERED
                      </span>
                    )}
                    {!status && (
                      <span className="text-[10px] text-dark-500">Not verified in session</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleVerify(ev.id, true)}
                      disabled={status === 'checking'}
                      className="px-2 py-0.5 bg-dark-800 hover:bg-dark-700 text-[10px] font-semibold text-white rounded transition-colors"
                    >
                      Verify
                    </button>
                    <button 
                      onClick={() => handleVerify(ev.id, false)}
                      disabled={status === 'checking'}
                      className="px-2 py-0.5 border border-accent-red/25 bg-accent-red/5 hover:bg-accent-red/10 text-[10px] text-accent-red font-semibold rounded transition-colors"
                      title="Simulate Tamper Check"
                    >
                      Tamper
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setSelectedEvidenceForDetail(ev)}
                    className="py-1 px-2.5 rounded bg-dark-900 border border-dark-800 text-[10px] font-bold text-dark-300 hover:text-white hover:border-dark-700 text-center transition-all duration-200"
                  >
                    Custody Chain
                  </button>
                  {isSealed ? (
                    <button
                      onClick={() => setShowCertificateForEvidence(ev)}
                      className="py-1 px-2.5 rounded bg-primary-500/10 border border-primary-500/20 text-[10px] font-bold text-primary-400 hover:bg-primary-500/20 text-center transition-all duration-200"
                    >
                      Sec 65B Certificate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSealEvidence(ev.id)}
                      className="py-1 px-2.5 rounded bg-accent-gold/10 border border-accent-gold/20 text-[10px] font-bold text-accent-gold hover:bg-accent-gold/20 text-center transition-all duration-200"
                    >
                      Digitally Seal (RSA)
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custody Chain Details Modal */}
      {selectedEvidenceForDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-dark-700/50 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary-400" />
                <h3 className="text-base font-semibold text-white">Chain of Custody Ledger</h3>
              </div>
              <button 
                onClick={() => setSelectedEvidenceForDetail(null)} 
                className="text-dark-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-dark-900/50 p-3 rounded-lg border border-dark-850">
              <p><span className="text-dark-500">File Name:</span> <span className="font-semibold text-white">{selectedEvidenceForDetail.filename}</span></p>
              <p className="truncate"><span className="text-dark-500">SHA-256 Digest:</span> <code className="text-primary-400 font-mono">{selectedEvidenceForDetail.fileHash}</code></p>
              <p>
                <span className="text-dark-500">Signature Status:</span>{' '}
                <span className={`font-semibold ${sealedStatus[selectedEvidenceForDetail.id]?.sealed ? 'text-accent-green' : 'text-accent-gold'}`}>
                  {sealedStatus[selectedEvidenceForDetail.id]?.sealed ? '🔒 SEALED & CERTIFIED' : '🔓 OPEN (SEAL PENDING)'}
                </span>
              </p>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-dark-800">
              <button
                type="button"
                onClick={() => setModalTab('timeline')}
                className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  modalTab === 'timeline' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
                }`}
              >
                Custody Timeline
              </button>
              <button
                type="button"
                onClick={() => setModalTab('signature')}
                className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  modalTab === 'signature' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
                }`}
              >
                Cryptographic Seal Check
              </button>
            </div>

            {modalTab === 'timeline' ? (
              /* Timeline nodes */
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {(custodyLogs[selectedEvidenceForDetail.id] || []).map((log, idx) => (
                  <div key={idx} className="flex gap-3 text-xs relative">
                    {idx !== (custodyLogs[selectedEvidenceForDetail.id] || []).length - 1 && (
                      <div className="absolute left-[9px] top-6 bottom-[-20px] w-0.5 bg-dark-800" />
                    )}
                    <div className="w-5 h-5 rounded-full bg-dark-900 border border-primary-500 flex items-center justify-center text-[10px] text-primary-400 font-bold shrink-0 mt-1">
                      {idx + 1}
                    </div>
                    <div className="space-y-1.5 py-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white uppercase tracking-wider text-[10px] px-2 py-0.5 bg-dark-900 rounded border border-dark-800">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-dark-500">{formatDate(log.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-dark-300 font-medium">
                        Performed by: <span className="text-white">{log.performedBy}</span>
                        {log.recipient && <> ➔ Recipient: <span className="text-white">{log.recipient}</span></>}
                      </p>
                      <p className="text-[11px] text-dark-400 leading-snug">{log.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Cryptographic Seal Details */
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  {sealedStatus[selectedEvidenceForDetail.id]?.sealed ? (
                    <div className="p-3.5 bg-accent-green/5 border border-accent-green/20 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-accent-green font-bold text-[11px]">
                        <ShieldCheck size={14} />
                        <span>CRYPTOGRAPHIC SIGNATURE VERIFIED</span>
                      </div>
                      <p className="text-dark-300 text-[11px] leading-relaxed">
                        The asymmetric RSA signature checks out successfully. The public key decrypts the seal to verify that the file remains unchanged from its initial custody.
                      </p>
                      <div className="space-y-2 border-t border-dark-800/80 pt-2 text-[9px] text-dark-400">
                        <div>
                          <span className="font-bold text-white block">Digital Seal Signature (SHA-256 with RSA):</span>
                          <code className="block bg-dark-900 p-1.5 rounded text-primary-400 select-all truncate mt-0.5 font-mono">
                            {sealedStatus[selectedEvidenceForDetail.id]?.signature}
                          </code>
                        </div>
                        <div>
                          <span className="font-bold text-white block">Signer Authority Public Key (PEM):</span>
                          <pre className="text-[8px] leading-tight text-dark-500 overflow-x-auto whitespace-pre p-2 bg-dark-900 border border-dark-850 rounded mt-0.5">
                            {sealedStatus[selectedEvidenceForDetail.id]?.keyPem}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-accent-gold/5 border border-accent-gold/20 rounded-lg space-y-2.5 text-center">
                      <AlertTriangle size={24} className="text-accent-gold mx-auto" />
                      <p className="font-bold text-white text-[11px]">No Cryptographic Seal Found</p>
                      <p className="text-dark-400 text-[11px] leading-relaxed">
                        This evidence is not signed with an asymmetric key yet. Close this modal and click **"Digitally Seal (RSA)"** to sign.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-700/50">
              <button 
                type="button"
                onClick={() => setSelectedEvidenceForDetail(null)}
                className="btn-ghost py-1.5 text-xs px-4"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 65B / Section 63 BSA Certified Document Preview Modal */}
      {showCertificateForEvidence && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl p-8 animate-scale-in space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck size={20} className="text-accent-green" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Legal Admissibility Certification</h3>
              </div>
              <button 
                onClick={() => setShowCertificateForEvidence(null)} 
                className="text-dark-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Certificate Layout - Styled like a formal Government Certificate */}
            <div className="bg-dark-950 border border-dark-800 p-6 rounded-lg space-y-6 text-xs text-dark-300 font-sans leading-relaxed relative overflow-hidden">
              {/* Seal watermark behind */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] text-primary-400 pointer-events-none select-none">
                <Shield size={300} />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">CERTIFICATE UNDER SECTION 65B OF THE INDIAN EVIDENCE ACT, 1872</h4>
                <p className="text-[10px] text-dark-400 font-semibold uppercase tracking-widest">(READ WITH SECTION 63 OF BHARATIYA SAKSHYA ADHINIYAM, 2023)</p>
                <div className="w-16 h-0.5 bg-dark-800 mx-auto my-2"></div>
                <p className="text-[10px] text-dark-400">Cyber Crime Investigation Cell, Government of India</p>
              </div>

              <div className="space-y-3">
                <p>
                  I, <span className="font-bold text-white">{sealedStatus[showCertificateForEvidence.id]?.signer || 'Inspector Verma'}</span>, serving as a Cyber Cell Officer, do hereby certify that:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-2">
                  <li>
                    The electronic record identified as <span className="font-bold text-white">{showCertificateForEvidence.filename}</span> (Forensic ID: {showCertificateForEvidence.id}) was ingested and preserved in the secure electronic vault under my active command and lawful supervision.
                  </li>
                  <li>
                    The computer hardware and systems used to catalog and store this forensic evidence item were operating correctly and securely during the time of preserve.
                  </li>
                  <li>
                    A cryptographic checksum of the target electronic file has been calculated using the standard SHA-256 algorithm, yielding the following unique digest:
                    <code className="block bg-dark-900 border border-dark-850 p-2 text-primary-300 font-mono rounded select-all truncate mt-1 text-[11px]">
                      {showCertificateForEvidence.fileHash}
                    </code>
                  </li>
                  <li>
                    The integrity of this record has been sealed using an asymmetric RSA-2048 digital signature. The cryptographical signature seal is:
                    <code className="block bg-dark-900 border border-dark-850 p-2 text-accent-gold font-mono rounded select-all truncate mt-1 text-[10px]">
                      {sealedStatus[showCertificateForEvidence.id]?.signature}
                    </code>
                  </li>
                </ol>
                <p className="pt-2">
                  To the best of my knowledge and belief, this electronic record is preserved without tampering, modification, or intermediate leakage, and is certified as legally admissible under the relevant forensic standards.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-dark-850 pt-4 text-[10px] text-dark-400">
                <div className="space-y-1">
                  <p>Certified Signer: <span className="text-white font-semibold">{sealedStatus[showCertificateForEvidence.id]?.signer}</span></p>
                  <p>clearance Role: <span className="text-primary-400 font-bold uppercase">Investigator</span></p>
                </div>
                <div className="space-y-1 text-right">
                  <p>Certification Date: <span className="text-white font-semibold">{new Date().toLocaleDateString('en-IN')}</span></p>
                  <p>Signature Verification: <span className="text-accent-green font-bold">✓ VERIFIED INTACT</span></p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-dark-800">
              <span className="text-[10px] text-dark-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-accent-green" /> Court-ready document structure
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowCertificateForEvidence(null)}
                  className="btn-ghost py-1.5 text-xs px-4"
                >
                  Close Certificate
                </button>
                <button 
                  onClick={() => {
                    window.print();
                  }}
                  className="btn-primary py-1.5 text-xs px-4 flex items-center gap-1.5"
                >
                  Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center gap-2 mb-4 border-b border-dark-700/50 pb-3">
              <FileUp size={18} className="text-primary-400" />
              <h3 className="text-base font-semibold text-white">Catalog Evidence File</h3>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">Select Case</label>
                <select 
                  value={targetCase}
                  onChange={(e) => setTargetCase(e.target.value)}
                  className="input-field py-2 text-xs bg-dark-900 border-dark-700/50"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.caseNumber} - {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">File Name</label>
                <input 
                  type="text" required value={fileName} onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. frozen_funds_dossier.pdf"
                  className="input-field py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">File Size</label>
                  <input 
                    type="text" value={fileSize} onChange={(e) => setFileSize(e.target.value)}
                    placeholder="e.g. 1.2 MB"
                    className="input-field py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">Catalog Category</label>
                  <select className="input-field py-2 text-xs">
                    <option>Investigative PDF</option>
                    <option>DEX Swap Screenshot</option>
                    <option>Court Warrant Copy</option>
                    <option>Blockchain Log CSV</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">Description / Notes</label>
                <textarea 
                  value={fileDesc} onChange={(e) => setFileDesc(e.target.value)}
                  placeholder="Details regarding source, relevance, and chain of custody tracking..."
                  className="w-full h-20 p-2.5 text-xs bg-dark-800/40 border border-dark-700/50 rounded-lg focus:outline-none focus:border-primary-500 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-700/50">
                <button 
                  type="button" 
                  onClick={() => setShowUpload(false)}
                  className="btn-ghost py-2 text-xs px-4"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary py-2 text-xs px-4"
                >
                  Secure Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
