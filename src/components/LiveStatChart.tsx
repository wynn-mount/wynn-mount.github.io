import React, { useMemo, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { activeMountIdAtom } from '../store/mountStore';
import { stagedMaterialsAtom, interactionStateAtom } from '../store/feedingStore';
import { activeMatrixDataAtom } from '../store/matrixStore';
import { STAT_NAMES } from '../lib/constants';
import { StatName, FeedingItem, ColumnId } from '../types';

export function LiveStatChart() {
  const activeMountId = useAtomValue(activeMountIdAtom);
  const stagedMaterials = useAtomValue(stagedMaterialsAtom);
  const matrixData = useAtomValue(activeMatrixDataAtom);
  const interaction = useAtomValue(interactionStateAtom);

  const activeMount = useLiveQuery(
    async () => {
      if (!activeMountId) return undefined;
      return await db.mounts.get(activeMountId);
    },
    [activeMountId]
  );

  const calculateYields = useCallback((items: FeedingItem[]) => {
    const totals = STAT_NAMES.reduce((acc, stat) => {
      acc[stat] = 0;
      return acc;
    }, {} as Record<StatName, number>);

    items.forEach((mat) => {
      const yields = matrixData[mat.level.toString()]?.[mat.type];
      if (yields) {
        STAT_NAMES.forEach((stat) => {
          totals[stat] += yields[stat] || 0;
        });
      }
    });

    return totals;
  }, [matrixData]);

  const stagedBuffs = useMemo(() => calculateYields(stagedMaterials), [stagedMaterials, calculateYields]);
  const interactionBuffs = useMemo(() => calculateYields(interaction.items), [interaction.items, calculateYields]);

  if (!activeMount) {
    return (
      <div className="w-full h-[380px] bg-black border border-neutral-800 rounded-lg p-6 font-mono text-xs text-neutral-500 animate-pulse flex items-center justify-center">
        [ SELECT A MOUNT TO INITIALIZE LIVE CHART ]
      </div>
    );
  }

  return (
    <div 
      key={activeMountId} 
      className="w-full bg-black border border-neutral-800 rounded-lg p-6 shadow-2xl space-y-8 select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-1">
          <h2 className="text-sm font-bold tracking-widest uppercase text-white">Live Stat Progress</h2>
          <div className="w-32 h-px bg-white/20" />
        </div>
        <AnimatePresence mode="wait">
          {interaction.type && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-tighter bg-yellow-400/10 px-2 py-0.5 border border-yellow-400/20 rounded"
            >
              PREVIEW: {interaction.type} ({interaction.items.length} items)
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        {STAT_NAMES.map((stat) => {
          const limit = activeMount.stats[stat].limitLevel;
          const max = activeMount.stats[stat].maxLevel;
          
          let displayLimit = limit;
          let displayBuff = stagedBuffs[stat];
          let displaySelected = 0;

          if (interaction.items.length > 0) {
            const intYield = interactionBuffs[stat];

            if (interaction.columnId === 'inventory') {
              displayBuff = intYield;
              displaySelected = intYield; 
            } else if (interaction.columnId === 'feeder') {
              displayBuff = stagedBuffs[stat];
              displaySelected = intYield;
            } else if (interaction.columnId === 'consumed') {
              displayBuff = 0;
              displayLimit = limit;
              displaySelected = intYield;
            }
          }

          return (
            <StatProgressBar
              key={stat}
              label={stat}
              limit={displayLimit}
              max={max}
              buff={displayBuff}
              selected={displaySelected}
              interactionColumn={interaction.columnId}
            />
          );
        })}
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex flex-col space-y-1">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Legend</h3>
          <div className="w-full h-px bg-neutral-800/40" />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase">
          <LegendItem color="bg-white" label="Limit" />
          <LegendItem color="bg-[#3B82F666]" label="Buff" />
          <LegendItem color="bg-yellow-400/60" label="Selected" />
          <LegendItem color="bg-red-900" label="Threshold" />
          <LegendItem color="bg-[#1A1A1A]" label="Max" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 ${color}`} />
      <span className="text-neutral-400">{label}</span>
    </div>
  );
}

interface StatProgressBarProps {
  label: string;
  limit: number;
  max: number;
  buff: number;
  selected: number;
  interactionColumn: ColumnId | null;
}

const StatProgressBar = React.memo(({ label, limit, max, buff, selected, interactionColumn }: StatProgressBarProps) => {
  const currentTotal = limit + (interactionColumn === 'consumed' ? 0 : buff);
  const isOverflow = currentTotal > max;
  const visualMax = max;

  const calculateWidth = (val: number) => (val / visualMax) * 100;

  // Visual Total including protrusion (capped at 108% if overflowing)
  const fullTotalWidthRaw = calculateWidth(currentTotal);
  const displayTotalWidth = isOverflow ? 108 : fullTotalWidthRaw;
  
  const fullLimitWidth = calculateWidth(limit);

  // Layering widths and offsets
  let blueWidth = 0;
  let blueOffset = 0;
  let yellowWidth = 0;
  let yellowOffset = 0;
  let whiteWidth = fullLimitWidth;

  if (interactionColumn === 'inventory') {
    yellowWidth = displayTotalWidth - fullLimitWidth;
    yellowOffset = fullLimitWidth;
    blueWidth = 0;
  } else if (interactionColumn === 'feeder') {
    yellowWidth = calculateWidth(selected);
    yellowOffset = fullLimitWidth;
    
    if (fullLimitWidth + yellowWidth > 100) {
      // Yellow protrudes
      yellowWidth = displayTotalWidth - fullLimitWidth;
      blueWidth = 0;
    } else {
      // Blue protrudes
      blueWidth = displayTotalWidth - (fullLimitWidth + yellowWidth);
      blueOffset = fullLimitWidth + yellowWidth;
    }
  } else if (interactionColumn === 'consumed') {
    yellowWidth = calculateWidth(selected);
    yellowOffset = fullLimitWidth - yellowWidth;
    whiteWidth = fullLimitWidth - yellowWidth;
    blueWidth = 0;
  } else {
    // Default mode (No Interaction)
    blueWidth = displayTotalWidth - fullLimitWidth;
    blueOffset = fullLimitWidth;
  }

  const transition = { type: 'tween', ease: 'easeInOut', duration: 0.2 };

  return (
    <div className="flex items-center group">
      <div className="w-32 flex-shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-yellow-400 transition-colors cursor-default">
          {label}
        </span>
      </div>

      <div className="flex-1 h-6 relative flex items-center pr-12">
        {/* Progress Bar Container */}
        <div className="flex-1 h-full bg-neutral-950 border border-neutral-900 relative z-0">
          <div className="absolute inset-0 bg-[#1A1A1A] w-full" />

          {/* Layer 1: Blue (Buff) */}
          {blueWidth > 0 && (
            <motion.div 
              initial={false}
              animate={{ 
                width: `${blueWidth}%`,
                left: `${blueOffset}%`
              }}
              transition={transition}
              className="absolute top-0 h-full bg-[#3B82F666] z-0"
            />
          )}

          {/* Layer 2: Yellow (Selection Highlight - Translucent) */}
          {yellowWidth > 0 && (
            <motion.div 
              initial={false}
              animate={{ 
                width: `${yellowWidth}%`,
                left: `${yellowOffset}%`
              }}
              transition={transition}
              className="absolute top-0 h-full bg-yellow-400/60 z-10"
            />
          )}

          {/* Layer 3: Threshold Line (Dark Red, Taller, Thickened to 3px) */}
          <div className="absolute left-full top-[-4px] bottom-[-4px] w-[3px] bg-red-900/80 z-20 pointer-events-none" />

          {/* Layer 4: White (Limit) */}
          <motion.div 
            initial={false}
            animate={{ width: `${whiteWidth}%` }}
            transition={transition}
            className="absolute left-0 top-0 h-full bg-white z-30"
          />
        </div>
      </div>

      {/* Numerical Column: Yellow Selection first, then Blue Buff in parentheses */}
      <div className="w-52 flex-shrink-0 ml-4 font-mono text-[11px] flex justify-end gap-2 items-baseline">
        <span className={`${isOverflow ? 'text-red-500 font-bold' : (selected > 0 ? 'text-yellow-400' : 'text-white')}`}>
          {currentTotal.toString().padStart(3, ' ')}
        </span>
        <span className="text-neutral-700">/</span>
        <span className="text-neutral-500">{max.toString().padStart(3, ' ')}</span>
        
        <div className="w-24 text-right flex justify-end gap-1">
          {interactionColumn === 'feeder' ? (
            <>
              <span className="text-yellow-400 font-bold">+{selected}</span>
              <span className="text-blue-400">({buff})</span>
            </>
          ) : interactionColumn === 'inventory' ? (
            <span className="text-yellow-400 font-bold">+{buff}</span>
          ) : interactionColumn === 'consumed' && selected > 0 ? (
            <span className="text-yellow-400 font-bold">+{selected}</span>
          ) : (
            <span className={`transition-colors ${buff > 0 ? 'text-blue-400' : 'text-neutral-800'}`}>
              {buff > 0 ? `(${buff})` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
