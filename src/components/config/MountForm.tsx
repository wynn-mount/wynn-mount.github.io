import React, { useState, useEffect } from 'react';
import { SavedMount, StatName, MountStat } from '../../types';
import { STAT_NAMES, STAT_COLORS } from '../../lib/constants';
import { X, Save, Copy, Check } from 'lucide-react';
import { encodeMountData, decodeMountData } from '../../lib/codec';

interface MountFormProps {
  mount: SavedMount;
  onClose: () => void;
  onSave: (id: number, updates: Partial<SavedMount>) => void;
}

export function MountForm({ mount, onClose, onSave }: MountFormProps) {
  const [name, setName] = useState(mount.name);
  const [currentLevel, setCurrentLevel] = useState(mount.currentLevel);
  const [stats, setStats] = useState<Record<StatName, MountStat>>({ ...mount.stats });
  const [configCode, setConfigCode] = useState(encodeMountData(mount.currentLevel, mount.stats));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setConfigCode(encodeMountData(currentLevel, stats));
  }, [currentLevel, stats]);

  const handleStatChange = (statName: StatName, field: 'limitLevel' | 'maxLevel', value: string) => {
    const val = parseInt(value, 10);
    setStats(prev => ({
      ...prev,
      [statName]: {
        ...prev[statName],
        [field]: !isNaN(val) ? val : 0
      }
    }));
  };

  const handleConfigCodeChange = (code: string) => {
    setConfigCode(code);
    const decoded = decodeMountData(code);
    if (decoded) {
      setCurrentLevel(decoded.currentLevel);
      setStats(decoded.stats);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(configCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave(mount.id!, {
      name,
      currentLevel,
      stats
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-black border border-neutral-800 rounded-lg w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/20">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-white rounded-full"></div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Edit Mount</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase">Mount Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase">Current Level</label>
              <input
                type="number"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors font-mono"
              />
            </div>
          </div>

          {/* Config Code */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-500 uppercase flex justify-between">
              <span>Configuration Code</span>
              <span className="text-[9px] lowercase font-normal opacity-50">Import/Export individual mount settings</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={configCode}
                onChange={(e) => handleConfigCodeChange(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-neutral-400 focus:outline-none focus:border-white transition-colors font-mono"
                placeholder="Paste code here..."
              />
              <button
                onClick={handleCopy}
                className="px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded transition-colors flex items-center justify-center"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-500 uppercase">Stats Configuration</label>
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-8 gap-1 text-[9px] font-bold text-neutral-600 uppercase text-center mb-1">
                <div className="col-span-2 text-left">Stat</div>
                <div className="col-span-3">Limit Level</div>
                <div className="col-span-3">Max Level</div>
              </div>
              {STAT_NAMES.map(stat => (
                <div key={stat} className="grid grid-cols-8 gap-1 items-center">
                  <div className={`col-span-2 text-xs font-bold capitalize ${STAT_COLORS[stat].text}`}>
                    {stat}
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={stats[stat].limitLevel}
                      onChange={(e) => handleStatChange(stat, 'limitLevel', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-white transition-colors font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={stats[stat].maxLevel}
                      onChange={(e) => handleStatChange(stat, 'maxLevel', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-white transition-colors font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-900/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase text-neutral-500 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-neutral-200 transition-all flex items-center gap-2"
          >
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
