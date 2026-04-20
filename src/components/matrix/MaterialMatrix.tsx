import React from 'react';
import { useAtom } from 'jotai';
import { activeLevelTabAtom } from '../../store/matrixStore';
import { useMatrixSync } from '../../hooks/useMatrixSync';
import { MATERIAL_LEVELS, MATERIAL_TYPES, STAT_NAMES, getMaterialName, VALID_STATS_PER_MATERIAL, STAT_COLORS } from '../../lib/constants';
import { MaterialType, StatName } from '../../types';
import { Icon } from '../util/Icon';
import { IconDebugger } from '../util/IconDebugger';

export function MaterialMatrix() {
  const { matrixData, setMatrixData, isMatrixReady } = useMatrixSync();
  const [activeLevel, setActiveLevel] = useAtom(activeLevelTabAtom);

  const levelData = matrixData[activeLevel.toString()] || {};

  const calculateValidationErrors = () => {
    if (!isMatrixReady) return [];
    
    const errors: string[] = [];
    const sums: number[] = [];

    MATERIAL_TYPES.forEach(type => {
      let typeSum = 0;
      const allowedStats = VALID_STATS_PER_MATERIAL[type];
      
      STAT_NAMES.forEach(stat => {
        const val = levelData[type]?.[stat] || 0;
        typeSum += val;
        
        if (val < 0) {
          errors.push(`[${type}] ${stat} cannot be negative.`);
        } else if (val > 0 && !allowedStats.includes(stat)) {
          errors.push(`[${type}] cannot boost ${stat} (Allowed: ${allowedStats.join(', ')})`);
        }
      });
      
      if (typeSum > 0) {
        sums.push(typeSum);
      }
    });

    if (sums.length > 0) {
      const minSum = Math.min(...sums);
      const maxSum = Math.max(...sums);
      if (maxSum - minSum > 1) {
        errors.push(`Material sums are unbalanced (min: ${minSum}, max: ${maxSum}). They must be within +/- 1 of each other.`);
      }
    }

    return errors;
  };

  const validationErrors = calculateValidationErrors();

  if (!isMatrixReady) {
    return (
      <div className="w-full animate-pulse space-y-4">
        <div className="h-10 bg-neutral-900 rounded"></div>
        <div className="h-64 bg-neutral-900 rounded"></div>
      </div>
    );
  }

  const handleDownloadJson = () => {
    // Construct a clean object to purge any old Dexie data (like 'name' or 'planks')
    const cleanData: Record<string, Record<string, Record<string, number>>> = {};
    
    MATERIAL_LEVELS.forEach(level => {
      const levelStr = level.toString();
      cleanData[levelStr] = {};
      
      MATERIAL_TYPES.forEach(type => {
        cleanData[levelStr][type] = {};
        
        STAT_NAMES.forEach(stat => {
          // If the DB had 'planks' but we are looking for 'wood', it will safely default to 0
          cleanData[levelStr][type][stat] = matrixData[levelStr]?.[type]?.[stat] || 0;
        });
      });
    });

    const jsonString = JSON.stringify(cleanData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'materials.json';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStatChange = (type: MaterialType, stat: StatName, value: string) => {
    const val = parseInt(value, 10);
    setMatrixData(prev => ({
      ...prev,
      [activeLevel]: {
        ...prev[activeLevel],
        [type]: {
          ...prev[activeLevel][type],
          [stat]: !isNaN(val) ? val : 0,
        }
      }
    }));
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Material Matrix Editor</h2>
        <button
          onClick={handleDownloadJson}
          className="px-4 py-2 bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        >
          Export materials.json
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-4 bg-black border border-neutral-800 rounded-md">
        {MATERIAL_LEVELS.map(level => (
          <button
            key={level}
            onClick={() => setActiveLevel(level)}
            className={`px-3 py-1 text-sm border transition-colors ${
              activeLevel === level 
                ? 'bg-white text-black border-white' 
                : 'bg-black text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-500'
            }`}
          >
            Lvl {level}
          </button>
        ))}
      </div>

      {validationErrors.length > 0 ? (
        <div className="p-4 border border-red-900 bg-red-950/20 rounded-md text-red-400 text-sm space-y-2">
          <p className="font-bold flex items-center gap-2">
            <span className="size-2 bg-red-500 rounded-full inline-block"></span>
            Validation Errors Detected
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-3 border border-green-900 bg-green-950/20 rounded-md text-green-400 text-sm flex items-center gap-2">
          <span className="size-2 bg-green-500 rounded-full inline-block"></span>
          All rules satisfied for Level {activeLevel}.
        </div>
      )}

      <div className="overflow-x-auto border border-neutral-800 rounded-md bg-black">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs uppercase bg-neutral-900 border-b border-neutral-800">
            <tr>
              <th className="px-4 py-3 font-medium text-neutral-400">Type</th>
              <th className="px-4 py-3 font-medium text-neutral-400">In-Game Name</th>
              {STAT_NAMES.map(stat => (
                <th key={stat} className={`px-4 py-3 font-bold capitalize w-20 border-x border-neutral-800/20 ${STAT_COLORS[stat].text} ${STAT_COLORS[stat].bg}`}>
                  {stat}
                </th>
              ))}
              <th className="px-4 py-3 font-medium w-16 text-neutral-300">Sum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {MATERIAL_TYPES.map(type => {
              const rowSum = STAT_NAMES.reduce((sum, stat) => sum + (levelData[type]?.[stat] || 0), 0);
              
              return (
                <tr key={type} className="hover:bg-neutral-900/50 transition-colors group">
                  <td className="px-4 py-2 font-medium capitalize text-neutral-300 border-r border-neutral-800/20">{type}</td>
                  <td className="px-4 py-2 text-neutral-300 border-r border-neutral-800/20">
                    <div className="flex items-center gap-2">
                      <Icon type={type as MaterialType} level={activeLevel} scale={0.75} className="rounded" />
                      <span>{getMaterialName(activeLevel, type as MaterialType)}</span>
                    </div>
                  </td>
                  {STAT_NAMES.map(stat => {
                    const val = levelData[type]?.[stat] || 0;
                    const isZero = val === 0;
                    
                    return (
                      <td key={stat} className={`px-4 py-2 border-x border-neutral-800/10 ${STAT_COLORS[stat].bg}`}>
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => handleStatChange(type as MaterialType, stat, e.target.value)}
                          className={`w-16 px-2 py-1 bg-transparent border-b border-transparent group-hover:border-white/10 focus:border-white focus:outline-none transition-colors ${
                            isZero ? 'font-normal text-neutral-700' : `font-bold ${STAT_COLORS[stat].text}`
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 font-mono text-neutral-400 border-l border-neutral-800/20">
                    {rowSum}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-16 border-t border-neutral-900 pt-8">
        <IconDebugger />
      </div>
    </div>
  );
}
