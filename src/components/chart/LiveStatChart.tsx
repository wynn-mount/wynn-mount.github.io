import React from 'react';
import { useAtomValue } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { activeMountIdAtom, mountStatsAtom, isAppReadyAtom } from '../../store/mountStore';
import { stagedMaterialsAtom, interactionStateAtom, kanbanDataAtom, flattenItems } from '../../store/feedingStore';
import { activeMatrixDataAtom } from '../../store/matrixStore';
import { STAT_NAMES } from '../../lib/constants';
import { StatName, FeedingItem, ColumnId } from '../../types';

export function LiveStatChart() {
  const isAppReady = useAtomValue(isAppReadyAtom);
  const activeMountId = useAtomValue(activeMountIdAtom);
  const mountStats = useAtomValue(mountStatsAtom);
  const stagedMaterials = useAtomValue(stagedMaterialsAtom);
  const matrixData = useAtomValue(activeMatrixDataAtom);
  const interaction = useAtomValue(interactionStateAtom);
  const kanbanData = useAtomValue(kanbanDataAtom);

  const calculateYields = (items: FeedingItem[]) => {
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
  };

  const consumedMaterials = flattenItems(kanbanData.consumed.items);
  const consumedYields = calculateYields(consumedMaterials);
  
  const stagedBuffs = calculateYields(stagedMaterials);
  const interactionBuffs = calculateYields(interaction.items);

  if (!isAppReady || !activeMountId) {
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
          const dbLimit = mountStats[stat].limitLevel;
          const max = mountStats[stat].maxLevel;
          
          let displayLimit = dbLimit + consumedYields[stat];
          let displayBuff = stagedBuffs[stat];
          let displaySelected = interactionBuffs[stat];

          if (interaction.columnId === 'inventory') {
            displayBuff = displaySelected;
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
          <LegendItem color="bg-white" label="Committed" />
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
      <div className={`size-3 ${color}`} />
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

function StatProgressBar({ label, limit, max, buff, selected, interactionColumn }: StatProgressBarProps) {
  // Total value that defines the scale (Limit + Buff, or Limit + Interaction if Inventory)
  const totalValue = interactionColumn === 'inventory' ? limit + selected : limit + buff;
  const isOverflowing = totalValue > max;
  const visualMax = max;

  const OV_WIDTH = 8; // Fixed visual width percentage for the overflow zone

  // The Scale function maps values to visual percentages
  // 0-maxLevel maps to 0-100%
  // Values above maxLevel map proportionally to the 100-108% range based on the total overflow
  const Scale = (val: number) => {
    if (val <= visualMax) return (val / visualMax) * 100;
    if (!isOverflowing) return 100;
    
    const overflowVal = val - visualMax;
    const totalOverflow = totalValue - visualMax;
    const overflowRatio = overflowVal / totalOverflow;
    return 100 + (overflowRatio * OV_WIDTH);
  };

  // 1. White Bar (Committed: Base + Consumed)
  const whiteWidth = Scale(limit);
  
  // 2. Blue Bar (Buff: Planned Feeder Items)
  // Blue sits between limit and totalValue
  const blueWidth = Scale(totalValue) - Scale(limit);
  const blueOffset = Scale(limit);

  // 3. Yellow Bar (Selected: Hover/Select Interaction)
  let yellowWidth = 0;
  let yellowOffset = 0;

  if (selected > 0) {
    if (interactionColumn === 'inventory') {
      // Inventory interaction adds to the top of the limit
      yellowOffset = Scale(limit);
      yellowWidth = Scale(limit + selected) - yellowOffset;
    } else if (interactionColumn === 'feeder') {
      // Feeder interaction is part of the buff, usually at the top
      yellowOffset = Scale(totalValue - selected);
      yellowWidth = Scale(totalValue) - yellowOffset;
    } else if (interactionColumn === 'consumed' || interactionColumn === 'stash') {
      // Consumed/Stash interaction is part of the committed base, at the top
      yellowOffset = Scale(limit - selected);
      yellowWidth = Scale(limit) - yellowOffset;
    }
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
        <div className="flex-1 h-full bg-neutral-950 border border-neutral-900 relative z-0">
          <div className="absolute inset-0 bg-[#1A1A1A] w-full" />

          {/* Layer 1: White (Committed) - z-10 */}
          <motion.div 
            initial={false}
            animate={{ width: `${whiteWidth}%` }}
            transition={transition}
            className="absolute left-0 top-0 h-full bg-white z-10"
          />

          {/* Layer 2: Blue (Buff) - z-20 */}
          {blueWidth > 0 && (
            <motion.div 
              initial={false}
              animate={{ 
                width: `${blueWidth}%`,
                left: `${blueOffset}%`
              }}
              transition={transition}
              className="absolute top-0 h-full bg-[#3B82F666] z-20"
            />
          )}

          {/* Layer 3: Yellow (Selection Highlight) - z-30 */}
          {yellowWidth > 0 && (
            <motion.div 
              initial={false}
              animate={{ 
                width: `${yellowWidth}%`,
                left: `${yellowOffset}%`
              }}
              transition={transition}
              className="absolute top-0 h-full bg-yellow-400/60 z-30"
            />
          )}

          {/* Layer 4: Threshold Line (Dark Red) - z-50 (Very front) */}
          <div className="absolute left-full top-[-4px] bottom-[-4px] w-[3px] bg-red-900 z-50 pointer-events-none" />
        </div>
      </div>

      <div className="w-52 flex-shrink-0 ml-4 font-mono text-[11px] flex justify-end gap-2 items-baseline">
        <span className={`${isOverflowing ? 'text-red-500 font-bold' : (selected > 0 ? 'text-yellow-400' : 'text-white')}`}>
          {totalValue.toString().padStart(3, ' ')}
        </span>
        <span className="text-neutral-700">/</span>
        <span className="text-neutral-500">{max.toString().padStart(3, ' ')}</span>
        
        <div className="w-24 text-right flex justify-end gap-1">
          {interactionColumn === 'feeder' || interactionColumn === 'inventory' ? (
            <>
              <span className="text-yellow-400 font-bold">+{selected}</span>
              {interactionColumn === 'feeder' && buff > selected && (
                <span className="text-blue-400">({buff - selected})</span>
              )}
            </>
          ) : (interactionColumn === 'consumed' || interactionColumn === 'stash') && selected > 0 ? (
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
}
