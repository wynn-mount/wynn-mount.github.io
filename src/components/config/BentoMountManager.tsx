import React, { useState, useEffect } from 'react';
import { Plus, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMountSync } from '../../hooks/useMountSync';
import { useMatrixSync } from '../../hooks/useMatrixSync';
import { useMountSolver } from '../../hooks/useMountSolver'; // Custom hook for Worker logic
import { STAT_NAMES, STAT_COLORS } from '../../lib/constants';
import { SavedMount, StatName } from '../../types';

import { MountRow } from './MountRow';
import { MountForm } from './MountForm';

const PAGE_SIZE = 5;
export function BentoMountManager() {
  const { 
    mountsList, 
    activeMountId, 
    switchMount,
    removeMount, 
    renameMount, 
    updateAnyMount, 
    addMount 
  } = useMountSync();
  
  const { matrixData } = useMatrixSync();
  const { isCalculating, runSolver } = useMountSolver();

  const activeMount = mountsList.find(m => m.id === activeMountId);

  // Auto-solve Effect
  useEffect(() => {
    if (activeMount && matrixData) {
      const timer = setTimeout(() => {
        runSolver(activeMount, matrixData);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeMount, matrixData, runSolver]);

  // State
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('mountManagerPage');
    return saved ? parseInt(saved, 10) : 1;
  });

  useEffect(() => {
    localStorage.setItem('mountManagerPage', currentPage.toString());
  }, [currentPage]);

  const [editingMount, setEditingMount] = useState<SavedMount | null>(null);

  // Pagination Logic
  const totalPages = Math.ceil(mountsList.length / PAGE_SIZE);
  const paginatedMounts = mountsList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [mountsList.length, totalPages, currentPage]);

  // Handlers
  const handleStatChange = (mount: SavedMount, statName: StatName, field: 'limitLevel' | 'maxLevel', value: string) => {
    const val = parseInt(value, 10);
    const updatedStats = {
      ...mount.stats,
      [statName]: {
        ...mount.stats[statName],
        [field]: !isNaN(val) ? val : 0,
      },
    };
    updateAnyMount(mount.id!, { stats: updatedStats });
  };

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'INPUT' || !target.hasAttribute('data-mount-input')) return;

    const row = parseInt(target.getAttribute('data-row') || '0', 10);
    const col = parseInt(target.getAttribute('data-col') || '0', 10);
    const tbody = e.currentTarget;

    const findAndFocus = (r: number, c: number) => {
      const el = tbody.querySelector(`input[data-row="${r}"][data-col="${c}"]`) as HTMLInputElement;
      if (el) {
        el.focus();
        return true;
      }
      return false;
    };

    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      // Try next column in same row
      if (!findAndFocus(row, col + 1)) {
        // Try first column of next row
        findAndFocus(row + 1, 0) || findAndFocus(row + 1, 1);
      }
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      // Try prev column in same row
      if (!findAndFocus(row, col - 1)) {
        // Try last column of prev row
        findAndFocus(row - 1, 6);
      }
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      findAndFocus(row + 1, col) || findAndFocus(row + 1, Math.max(1, col));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      findAndFocus(row - 1, col) || findAndFocus(row - 1, Math.max(1, col));
    }
  };

  return (
    <div className="w-full h-full min-h-[500px] bg-black border border-neutral-800 rounded-lg overflow-hidden flex flex-col shadow-2xl">
      
      {/* 1. Header Section */}
      <ManagerHeader 
        activeName={mountsList.find(m => m.id === activeMountId)?.name} 
        onAdd={addMount} 
      />

      {/* 2. Table Section */}
      <div className="flex-1 overflow-hidden bg-black">
        <table className="w-full text-left border-collapse table-fixed">
          <TableHeader />
          <tbody className="divide-y divide-neutral-800" onKeyDown={handleGridKeyDown}>
            {paginatedMounts.map((mount, idx) => (
              <MountRow 
                key={mount.id}
                mount={mount}
                rowIndex={idx}
                onRename={(name) => renameMount(mount.id!, name)}
                onUpdateLevel={(val) => updateAnyMount(mount.id!, { currentLevel: parseInt(val, 10) || 0 })}
                onUpdateStat={(stat, field, val) => handleStatChange(mount, stat, field, val)}
                onEdit={() => setEditingMount(mount)}
                onRemove={() => removeMount(mount.id!)}
                onSelect={() => switchMount(mount.id!)}
                showRemove={mountsList.length > 1}
              />
            ))}
            <EmptyRows count={PAGE_SIZE - paginatedMounts.length} />
          </tbody>
        </table>
      </div>

      {/* 3. Footer Section */}
      <ManagerFooter 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage}
        totalCount={mountsList.length}
      />

      {/* 4. Modals */}
      {editingMount && (
        <MountForm 
          mount={editingMount} 
          onClose={() => setEditingMount(null)}
          onSave={updateAnyMount}
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENTS (Could be moved to separate files) ---

function ManagerHeader({ activeName, onAdd }: { activeName?: string, onAdd: () => void }) {
  return (
    <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/20">
      <div className="flex items-center gap-3">
        <div className="w-2 h-6 bg-white rounded-full"></div>
        <h2 className="text-lg font-bold tracking-tight uppercase text-white">Mount Configuration</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium border-r border-neutral-800 pr-4">
          <Zap size={14} />
          <span>Active: <span className="text-white font-bold">{activeName || 'None'}</span></span>
        </div>
        <button 
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase rounded hover:bg-neutral-200 transition-colors"
        >
          <Plus size={12} strokeWidth={3} /> Add Mount
        </button>
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <thead>
      <tr className="bg-neutral-900 text-[10px] uppercase font-bold text-neutral-500 tracking-wider border-b border-neutral-800 h-10">
        {/* Name takes the most space (flexible) */}
        <th className="p-3 border-r border-neutral-800 w-auto">Name</th>
        
        {/* Fixed-width columns for small data */}
        <th className="p-3 border-r border-neutral-800 w-[10%]">Highest Lvl</th>
        <th className="p-3 border-r border-neutral-800 w-[60px] text-center">Type</th>
        
        {/* Stats scale equally */}
        {STAT_NAMES.map(stat => (
          <th key={stat} className={`p-3 border-r border-neutral-800 text-center capitalize w-[8%] ${STAT_COLORS[stat].text} ${STAT_COLORS[stat].bg}`}>
            {stat}
          </th>
        ))}
        
        {/* Actions stay slightly wider for buttons */}
        <th className="p-3 text-center w-[100px]">Actions</th>
      </tr>
    </thead>
  );
}
function EmptyRows({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={`empty-${i}`}>
          <tr className="h-[56px] border-b border-neutral-800/20">
            <td rowSpan={2} className="p-3 border-r border-neutral-800"></td>
            <td rowSpan={2} className="p-3 border-r border-neutral-800"></td>
            <td className="p-1 border-r border-neutral-800 bg-neutral-900/5"></td>
            {STAT_NAMES.map(stat => (
              <td key={`e1-${stat}-${i}`} className="p-2 border-r border-neutral-800"></td>
            ))}
            <td rowSpan={2} className="p-3"></td>
          </tr>
          <tr className="h-[40px] border-b border-neutral-800/50">
            <td className="p-1 border-r border-neutral-800 bg-neutral-900/5"></td>
            {STAT_NAMES.map(stat => (
              <td key={`e2-${stat}-${i}`} className="p-2 border-r border-neutral-800"></td>
            ))}
          </tr>
        </React.Fragment>
      ))}
    </>
  );
}

function ManagerFooter({ currentPage, totalPages, onPageChange, totalCount }: any) {
  return (
    <div className="p-3 bg-neutral-900/40 border-t border-neutral-800 flex items-center justify-between h-[56px]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-[10px] font-bold text-neutral-400 uppercase px-2">
            Page {currentPage} <span className="text-neutral-600">/</span> {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="text-[10px] text-neutral-600 font-bold uppercase tracking-tighter">
          Showing {totalCount > 0 ? totalCount : 0} mounts
        </div>
      </div>
    </div>
  );
}
