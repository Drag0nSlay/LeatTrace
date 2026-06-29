import React, { useState } from 'react';
import { useCaseStore } from '../stores';
import { FileText, FileDown, CheckCircle2, ShieldAlert, FileCheck, ArrowRight, Loader2 } from 'lucide-react';
import { formatDate } from '../utils/helpers';

interface GeneratedReport {
  id: string;
  caseNumber: string;
  caseTitle: string;
  title: string;
  generatedAt: string;
  fileSize: string;
  status: 'available' | 'generating';
}

export const ReportsPage: React.FC = () => {
  const { cases, selectedCase, selectCase } = useCaseStore();
  const [targetCaseId, setTargetCaseId] = useState(selectedCase?.id || cases[0]?.id || '');
  const [reportTitle, setReportTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [conclusions, setConclusions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  React.useEffect(() => {
    if (selectedCase) {
      setTargetCaseId(selectedCase.id);
    }
  }, [selectedCase]);
  
  const [reports, setReports] = useState<GeneratedReport[]>([
    {
      id: 'rep-01',
      caseNumber: 'CC-2026-0847',
      caseTitle: 'Crypto Ponzi Scheme — GainChain Network',
      title: 'GainChain Hop-3 Layering Audit Dossier',
      generatedAt: '2026-06-18T10:00:00Z',
      fileSize: '342 KB',
      status: 'available'
    },
    {
      id: 'rep-02',
      caseNumber: 'CC-2025-1102',
      caseTitle: 'Phishing Wallet Cluster Analysis',
      title: 'Final Investigative Report to Court',
      generatedAt: '2026-02-28T17:00:00Z',
      fileSize: '1.2 MB',
      status: 'available'
    }
  ]);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim()) return;

    setIsGenerating(true);
    setGenerationStep('Extracting transaction flow graphs...');
    await new Promise((r) => setTimeout(r, 1000));
    
    setGenerationStep('Compiling heuristics risk indicators...');
    await new Promise((r) => setTimeout(r, 800));
    
    setGenerationStep('Generating cryptographical file signature...');
    await new Promise((r) => setTimeout(r, 800));

    const selectedCaseObj = cases.find((c) => c.id === targetCaseId) || cases[0];
    
    const newReport: GeneratedReport = {
      id: `rep-${Math.random().toString(36).substr(2, 7)}`,
      caseNumber: selectedCaseObj.caseNumber,
      caseTitle: selectedCaseObj.title,
      title: reportTitle.trim(),
      generatedAt: new Date().toISOString(),
      fileSize: '142 KB',
      status: 'available'
    };

    setReports((prev) => [newReport, ...prev]);
    setIsGenerating(false);
    
    // Reset fields
    setReportTitle('');
    setSummary('');
    setConclusions('');

    // Trigger alert or state update
    alert('Investigative Report Dossier compiled and persisted successfully to Evidence Locker.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Compliance Report Exporter</h2>
        <p className="text-xs text-dark-400">Compile transaction histories, visual tracing paths, and risk scores into court-ready investigation dossiers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-dark-700/50 pb-3">
              <FileText size={18} className="text-primary-400" />
              <h3 className="text-base font-semibold text-white">Generate Investigation Dossier</h3>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">Select Case Profile</label>
                  <select
                    value={targetCaseId}
                    onChange={(e) => setTargetCaseId(e.target.value)}
                    className="input-field py-2 text-xs bg-dark-900 border-dark-700/50"
                  >
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>{c.caseNumber} - {c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">Report Heading / Title</label>
                  <input
                    type="text" required value={reportTitle} onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g. Primary Suspect Flow Evidence Dossier"
                    className="input-field py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">Investigator Summary (Observed Facts)</label>
                <textarea
                  value={summary} onChange={(e) => setSummary(e.target.value)}
                  placeholder="Record verified direct transfers, exchange deposits, and associated wallets..."
                  className="w-full h-24 p-2.5 text-xs bg-dark-800/40 border border-dark-700/50 rounded-lg focus:outline-none focus:border-primary-500 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1">Analytical Hypotheses (Analytical Inferences)</label>
                <textarea
                  value={conclusions} onChange={(e) => setConclusions(e.target.value)}
                  placeholder="Note peeling chain change structures, mixer interactions, and suspect identification theories..."
                  className="w-full h-24 p-2.5 text-xs bg-dark-800/40 border border-dark-700/50 rounded-lg focus:outline-none focus:border-primary-500 text-white"
                />
              </div>

              <div className="pt-3 border-t border-dark-700/50 flex items-center justify-between flex-wrap gap-3">
                <p className="text-[10px] text-dark-500 max-w-xs leading-normal flex items-start gap-1">
                  <ShieldAlert size={12} className="mt-0.5 flex-shrink-0" />
                  Generating reports calculates a dynamic SHA-256 hash automatically and saves it in the system audit registry.
                </p>

                <button
                  type="submit"
                  disabled={isGenerating || !reportTitle}
                  className="btn-primary py-2 px-6 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-primary-400" />
                      Generating...
                    </>
                  ) : (
                    <>Compile PDF Dossier</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Progress Overlay */}
          {isGenerating && (
            <div className="glass-card p-6 border-accent-gold/20 bg-accent-gold/5 animate-pulse-slow">
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-accent-gold" />
                <div>
                  <h4 className="text-xs font-bold text-white">Dossier Compilation Pipeline Running</h4>
                  <p className="text-[10px] text-dark-400 mt-0.5">{generationStep}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Generated Reports list */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider">Historical Exports</h3>
          <div className="space-y-3">
            {reports.map((rep) => (
              <div key={rep.id} className="glass-card p-4 space-y-3 hover:border-dark-600 transition-colors">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] mono text-primary-400 font-semibold">{rep.caseNumber}</span>
                    <span className="text-[10px] text-dark-500">{formatDate(rep.generatedAt)}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{rep.title}</h4>
                  <p className="text-[10px] text-dark-400 truncate mt-0.5">{rep.caseTitle}</p>
                </div>

                <div className="flex items-center justify-between border-t border-dark-700/50 pt-2 text-[10px]">
                  <span className="text-dark-500">{rep.fileSize} • PDF format</span>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert('Downloading report file template...'); }}
                    className="flex items-center gap-1 text-primary-400 hover:text-primary-300 font-semibold"
                  >
                    <FileDown size={12} /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
