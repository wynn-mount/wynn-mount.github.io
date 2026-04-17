import React from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { isCalculatingAtom, solverResultAtom } from '../store/mountStore';
import { kanbanDataAtom } from '../store/feedingStore';
import { getMaterialName } from '../lib/constants';
import { Icon } from './Icon';
import { Plus } from 'lucide-react';
import { FeedingItem, SolverMaterialItem, KanbanGroup, KanbanItem, MaterialType } from '../types';

export function ShoppingList() {
  const isCalculating = useAtomValue(isCalculatingAtom);
  const result = useAtomValue(solverResultAtom);
  const [kanbanData, setKanbanData] = useAtom(kanbanDataAtom);

  const addToInventory = (mat: SolverMaterialItem) => {
    const newItem: FeedingItem = {
      id: crypto.randomUUID(),
      type: mat.type,
      level: mat.level,
    };

    setKanbanData((prev) => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        items: [...prev.inventory.items, newItem],
      },
    }));
  };

  const addAllToInventory = () => {
    if (!result?.materials) return;
    
    const groupsByType: Record<string, FeedingItem[]> = {};
    
    result.materials.forEach((mat) => {
      const matItems: FeedingItem[] = Array.from({ length: mat.quantity }).map(() => ({
        id: crypto.randomUUID(),
        type: mat.type,
        level: mat.level,
      }));
      
      if (!groupsByType[mat.type]) {
        groupsByType[mat.type] = [];
      }
      groupsByType[mat.type].push(...matItems);
    });

    const newGroups: KanbanGroup[] = Object.entries(groupsByType).map(([type, items]) => ({
      id: crypto.randomUUID(),
      type: 'group',
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Batch`,
      items: items
    }));

    setKanbanData((prev) => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        items: [...prev.inventory.items, ...newGroups],
      },
    }));
  };

  if (isCalculating) {
    return (
      <div className="w-full h-full min-h-[400px] bg-black border border-neutral-800 rounded-lg flex flex-col items-center justify-center space-y-4 shadow-2xl">
        <div className="w-8 h-8 border-4 border-neutral-800 border-t-white rounded-full animate-spin"></div>
        <p className="text-neutral-400 text-xs font-mono uppercase tracking-widest">Optimizing Yields...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="w-full h-full bg-black border border-neutral-800 rounded-lg flex flex-col shadow-2xl overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/20">
          <h2 className="text-sm font-bold tracking-widest uppercase text-white">Material List</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
          <span className="text-[10px] uppercase font-bold tracking-tighter">Awaiting Mount Initialization</span>
        </div>
      </div>
    );
  }

  if (!result.feasible) {
    return (
      <div className="w-full h-full min-h-[400px] bg-black border border-red-900/50 rounded-lg flex flex-col shadow-2xl overflow-hidden p-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-sm font-bold tracking-widest uppercase text-red-500">Calculation Failed</h2>
          <div className="w-full h-px bg-red-900/20" />
        </div>
        <div className="mt-8 p-4 bg-red-950/10 border border-red-900/20 rounded font-mono text-xs text-red-400">
          <p>[ ERROR: TARGET STATS UNREACHABLE ]</p>
          <p className="mt-4 opacity-70">REASON: Current material yields insufficient for target max levels.</p>
          <p className="opacity-70">ADVICE: Lower target MAX or increase Mount current level.</p>
        </div>
      </div>
    );
  }

  if (result.materials?.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] bg-black border border-green-900/50 rounded-lg flex flex-col shadow-2xl overflow-hidden p-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-sm font-bold tracking-widest uppercase text-green-500">Optimization Complete</h2>
          <div className="w-full h-px bg-green-900/20" />
        </div>
        <div className="mt-8 p-4 bg-green-950/10 border border-green-900/20 rounded font-mono text-xs text-green-400">
          <p>[ STATUS: ALL TARGETS MET ]</p>
          <p className="mt-4 opacity-70">No additional materials required for current configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black border border-neutral-800 rounded-lg flex flex-col shadow-2xl overflow-hidden min-h-[400px]">
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/20">
        <div className="flex flex-col">
          <h2 className="text-sm font-bold tracking-widest uppercase text-white">Material List</h2>
          <span className="text-[10px] font-mono text-neutral-500 mt-0.5">Total Quantity: {result.totalMaterials}</span>
        </div>
        <button 
          onClick={addAllToInventory}
          className="px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase rounded hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
        >
          <Plus size={12} strokeWidth={3} /> Add All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-900/40 text-[10px] uppercase font-bold text-neutral-500 tracking-wider border-b border-neutral-800 h-10">
              <th className="p-4">Material</th>
              <th className="p-4 text-right">Qty</th>
              <th className="p-4 text-center w-[60px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {result.materials?.map((mat, i) => (
              <tr key={i} className="group hover:bg-neutral-900/40 transition-colors h-14">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon type={mat.type} level={mat.level} scale={0.8} className="rounded" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate group-hover:text-yellow-400 transition-colors">
                        {getMaterialName(mat.level, mat.type)}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-500 uppercase">
                        {mat.type} • Lvl {mat.level}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <span className="text-xs font-mono font-bold text-white bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    {mat.quantity}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => addToInventory(mat)}
                    className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                    title="Add to Inventory"
                  >
                    <Plus size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
