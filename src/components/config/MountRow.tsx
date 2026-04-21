import React from 'react';
import { useAtomValue } from 'jotai';
import { activeMountIdAtom } from '../../store/mountStore';
import { Settings, Trash2 } from 'lucide-react';
import { STAT_NAMES, STAT_COLORS } from '../../lib/constants';
import { EditableText } from '../util/EditableText';
import { SavedMount, StatName } from '../../types';

interface MountRowProps {
    mount: SavedMount;
    rowIndex: number;
    onRename: (name: string) => void;
    onUpdateLevel: (val: string) => void;
    onUpdateStat: (stat: StatName, field: 'limitLevel' | 'maxLevel', val: string) => void;
    onEdit: () => void;
    onRemove: () => void;
    onSelect: () => void;
    showRemove: boolean;
}

export function MountRow({
    mount, rowIndex, onRename,
    onUpdateLevel, onUpdateStat, onEdit, onRemove, onSelect, showRemove
}: MountRowProps) {
    const activeMountId = useAtomValue(activeMountIdAtom);
    const isActive = mount.id === activeMountId;

    return (
        <>
            {/* Row 1: Limit Levels */}
            <tr 
                onClick={onSelect}
                className={`group transition-colors h-[56px] cursor-pointer ${isActive ? 'bg-white/10' : 'hover:bg-neutral-900/40'}`}
            >
                <td rowSpan={2} className="p-3 border-r border-neutral-800 align-top">
                    <EditableText value={mount.name} onSave={onRename} className="font-bold text-white text-base" />
                </td>
                <td rowSpan={2} className="p-3 border-r border-neutral-800 align-top">
                    <input
                        type="number"
                        data-mount-input="true"
                        data-row={rowIndex * 2}
                        data-col={0}
                        onFocus={(e) => e.target.select()}
                        value={mount.currentLevel || ''}
                        onChange={(e) => onUpdateLevel(e.target.value)}
                        className="w-full bg-black/40 border border-neutral-800 text-white text-base px-2 py-1 rounded font-mono font-bold"
                    />
                </td>
                <td className="p-1 px-2 border-r border-neutral-800 text-[11px] font-bold text-neutral-600 uppercase text-center bg-neutral-900/10">Limit</td>
                {STAT_NAMES.map((stat, statIdx) => (
                    <td key={stat} className={`p-2 border-r border-neutral-800 text-center ${STAT_COLORS[stat].bg}`}>
                        <input
                            type="number"
                            data-mount-input="true"
                            data-row={rowIndex * 2}
                            data-col={statIdx + 1}
                            onFocus={(e) => e.target.select()}
                            value={mount.stats[stat].limitLevel}
                            onChange={(e) => onUpdateStat(stat, 'limitLevel', e.target.value)}
                            className={`w-full bg-transparent text-center font-mono font-bold text-base ${STAT_COLORS[stat].text}`}
                        />
                    </td>
                ))}
                <td rowSpan={2} className="p-1 align-middle">
                    <div className="flex flex-col items-center justify-center gap-1">
                        {/* 1. Settings Action */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            title="Settings"
                            className="p-1.5 text-neutral-600 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                        >
                            <Settings size={14} strokeWidth={2} />
                        </button>

                        {/* 2. Delete Action */}
                        {showRemove && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                title="Remove Mount"
                                className="p-1.5 text-neutral-800 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"
                            >
                                <Trash2 size={14} strokeWidth={2} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
            {/* Row 2: Max Levels */}
            <tr className={`h-[40px] ${isActive ? 'bg-white/10' : 'hover:bg-neutral-900/40 border-b border-neutral-800/50'}`}>
                <td className="p-1 px-2 border-r border-neutral-800 text-[11px] font-bold text-neutral-600 uppercase text-center bg-neutral-900/10">Max</td>
                {STAT_NAMES.map((stat, statIdx) => (
                    <td key={stat} className={`p-2 border-r border-neutral-800 text-center ${STAT_COLORS[stat].bg}`}>
                        <input
                            type="number"
                            data-mount-input="true"
                            data-row={rowIndex * 2 + 1}
                            data-col={statIdx + 1}
                            onFocus={(e) => e.target.select()}
                            value={mount.stats[stat].maxLevel}
                            onChange={(e) => onUpdateStat(stat, 'maxLevel', e.target.value)}
                            className={`w-full bg-transparent text-center font-mono font-bold text-base ${STAT_COLORS[stat].text}`}
                        />
                    </td>
                ))}
            </tr>
        </>
    );
}
