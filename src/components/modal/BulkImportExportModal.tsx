import React, { useState, useRef } from 'react';
import { useAtom } from 'jotai';
import { isBulkModalOpenAtom, bulkModalTabAtom } from '../../store/mountStore';
import { useMountSync } from '../../hooks/useMountSync';
import { decodeAllMounts, validateMountJson, encodeAllMounts } from '../../lib/codec';
import { STAT_NAMES } from '../../lib/constants';
import { SavedMount } from '../../types';
import { X, Upload, FileText, Check, AlertCircle, Copy, Download } from 'lucide-react';

export function BulkImportExportModal() {
  const [isOpen, setIsOpen] = useAtom(isBulkModalOpenAtom);
  const [activeTab, setActiveTab] = useAtom(bulkModalTabAtom);
  const { importAllMounts, mountsList } = useMountSync();

  const [importString, setImportString] = useState('');
  const [pendingMounts, setPendingMounts] = useState<SavedMount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCopyAll = () => {
    const encoded = encodeAllMounts(mountsList);
    navigator.clipboard.writeText(encoded);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExportJson = () => {
    const jsonString = JSON.stringify(mountsList, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'all_mounts.json';
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStringImport = (val: string) => {
    setImportString(val);
    if (!val.trim()) {
      setPendingMounts([]);
      setError(null);
      return;
    }

    const decoded = decodeAllMounts(val.trim());
    if (decoded) {
      setPendingMounts(decoded);
      setError(null);
    } else {
      setPendingMounts([]);
      setError('Invalid configuration code.');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const validated = validateMountJson(json);
        if (validated) {
          setPendingMounts(validated);
          setError(null);
        } else {
          setError('Invalid JSON format for mounts.');
        }
      } catch {
        setError('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const removePendingMount = (index: number) => {
    setPendingMounts(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (pendingMounts.length === 0) return;
    importAllMounts(pendingMounts);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setPendingMounts([]);
    setImportString('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-black border border-neutral-800 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Tabs */}
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'import' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Import
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'export' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Export
          </button>
          <button onClick={handleClose} className="px-6 border-l border-neutral-800 hover:bg-red-950/30 text-neutral-500 hover:text-red-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {activeTab === 'import' ? (
            <>
              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                    <FileText size={14} /> Paste Bulk Code
                  </label>
                  <textarea
                    value={importString}
                    onChange={(e) => handleStringImport(e.target.value)}
                    className="w-full h-24 bg-neutral-900 border border-neutral-800 rounded p-3 text-sm text-neutral-300 focus:outline-none focus:border-white transition-colors font-mono resize-none"
                    placeholder="Paste your bulk config code here..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                    <Upload size={14} /> Upload JSON
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-neutral-800 rounded flex flex-col items-center justify-center cursor-pointer hover:border-neutral-500 hover:bg-neutral-900/50 transition-all group"
                  >
                    <Upload size={24} className="text-neutral-600 group-hover:text-white mb-2" />
                    <span className="text-xs text-neutral-500 group-hover:text-neutral-300">Click to upload all_mounts.json</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileImport} 
                      accept=".json" 
                      className="hidden" 
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/20 border border-red-900 rounded text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Preview Table */}
              {pendingMounts.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase">Preview: {pendingMounts.length} Mounts Detected</h3>
                  <div className="overflow-x-auto border border-neutral-800 rounded bg-black">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-900 border-b border-neutral-800">
                          <th className="p-2 border-r border-neutral-800 w-32">Mount Name</th>
                          <th className="p-2 border-r border-neutral-800 w-16">Lvl</th>
                          <th className="p-2 border-r border-neutral-800 w-16 text-center">Type</th>
                          {STAT_NAMES.map(stat => (
                            <th key={stat} className="p-2 border-r border-neutral-800 text-center capitalize">{stat}</th>
                          ))}
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingMounts.map((mount, idx) => (
                          <React.Fragment key={idx}>
                            <tr className="border-b border-neutral-800/50 hover:bg-neutral-900/30 group">
                              <td rowSpan={2} className="p-2 border-r border-neutral-800 font-bold text-white align-top">
                                {mount.name}
                              </td>
                              <td rowSpan={2} className="p-2 border-r border-neutral-800 text-center align-top font-mono">
                                {mount.currentLevel}
                              </td>
                              <td className="p-1 px-2 border-r border-neutral-800 text-neutral-500 font-bold uppercase text-[9px] text-center bg-neutral-900/10">Limit</td>
                              {STAT_NAMES.map(stat => (
                                <td key={stat} className="p-2 border-r border-neutral-800 text-center font-mono">
                                  {mount.stats[stat].limitLevel}
                                </td>
                              ))}
                              <td rowSpan={2} className="p-2 text-center align-middle">
                                <button 
                                  onClick={() => removePendingMount(idx)}
                                  className="p-1.5 hover:bg-red-900/20 text-neutral-600 hover:text-red-500 rounded transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                            <tr className="border-b border-neutral-800 hover:bg-neutral-900/30">
                              <td className="p-1 px-2 border-r border-neutral-800 text-neutral-500 font-bold uppercase text-[9px] text-center bg-neutral-900/10">Max</td>
                              {STAT_NAMES.map(stat => (
                                <td key={stat} className="p-2 border-r border-neutral-800 text-center font-mono">
                                  {mount.stats[stat].maxLevel}
                                </td>
                              ))}
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Copy Code Section */}
                <div className="space-y-4 p-6 border border-neutral-800 rounded-lg bg-neutral-900/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <FileText size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-tight">Bulk Config Code</h3>
                      <p className="text-[11px] text-neutral-500">Copy this code to share or backup your mounts.</p>
                    </div>
                  </div>
                  
                  <textarea
                    readOnly
                    value={encodeAllMounts(mountsList)}
                    className="w-full h-32 bg-black border border-neutral-800 rounded p-3 text-[11px] text-neutral-400 font-mono resize-none focus:outline-none"
                  />
                  
                  <button
                    onClick={handleCopyAll}
                    className="w-full py-2.5 bg-white text-black text-sm font-bold uppercase flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                  >
                    {copiedAll ? <Check size={16} /> : <Copy size={16} />}
                    {copiedAll ? 'Copied to Clipboard' : 'Copy Code'}
                  </button>
                </div>

                {/* JSON Export Section */}
                <div className="space-y-4 p-6 border border-neutral-800 rounded-lg bg-neutral-900/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <Download size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-tight">JSON Export</h3>
                      <p className="text-[11px] text-neutral-500">Download your mounts as a portable JSON file.</p>
                    </div>
                  </div>

                  <div className="h-32 flex flex-col items-center justify-center border border-neutral-800 border-dashed rounded bg-black/40">
                    <FileText size={32} className="text-neutral-700 mb-2" />
                    <span className="text-[10px] text-neutral-600 font-mono">all_mounts.json</span>
                  </div>

                  <button
                    onClick={handleExportJson}
                    className="w-full py-2.5 bg-neutral-800 text-white text-sm font-bold uppercase flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors border border-neutral-700"
                  >
                    <Download size={16} />
                    Download JSON
                  </button>
                </div>
              </div>

              <div className="p-4 border border-neutral-800 rounded bg-neutral-900/10 flex items-center gap-4">
                <div className="size-10 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
                   <AlertCircle size={20} className="text-neutral-500" />
                </div>
                <div>
                  <p className="text-xs text-neutral-300 font-medium">Exporting includes your entire list of {mountsList.length} mounts.</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Note: This does not include your Material Matrix presets.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Only show on Import tab */}
        {activeTab === 'import' && (
          <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-900/20">
            <button
              onClick={handleClose}
              className="px-6 py-2 border border-red-900 text-red-500 text-sm font-bold uppercase hover:bg-red-950/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={pendingMounts.length === 0}
              className={`px-8 py-2 text-sm font-bold uppercase transition-all flex items-center gap-2 ${
                pendingMounts.length > 0 
                  ? 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20' 
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Check size={18} /> Confirm Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
