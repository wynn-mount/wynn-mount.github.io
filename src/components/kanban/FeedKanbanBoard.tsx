import React, { useEffect } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { ColumnId, FeedingItem, KanbanItem, KanbanGroup, StatName } from '../../types';
import { getMaterialName, STAT_NAMES } from '../../lib/constants';
import { kanbanDataAtom, selectedItemIdsAtom, lastSelectedIdAtom, selectedColumnIdAtom, interactionStateAtom, flattenItems, isKanbanReadyAtom } from '../../store/feedingStore';
import { activeMatrixDataAtom } from '../../store/matrixStore';
import { mountStatsAtom } from '../../store/mountStore';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  columnIds?: ColumnId[];
}

export function FeedKanbanBoard({ columnIds = ['inventory', 'feeder', 'consumed'] }: KanbanBoardProps) {
  const isReady = useAtomValue(isKanbanReadyAtom);
  const [data, setData] = useAtom(kanbanDataAtom);
  const [selectedItemIds, setSelectedItemIds] = useAtom(selectedItemIdsAtom);
  const [lastSelectedId, setLastSelectedId] = useAtom(lastSelectedIdAtom);
  const [selectedColumnId, setSelectedColumnId] = useAtom(selectedColumnIdAtom);
  const setInteraction = useSetAtom(interactionStateAtom);
  const matrixData = useAtomValue(activeMatrixDataAtom);
  const setMountStats = useSetAtom(mountStatsAtom);

  const clearSelection = () => {
    setSelectedItemIds([]);
    setLastSelectedId(null);
    setSelectedColumnId(null);
    setInteraction({ items: [], columnId: null, type: null });
  };

  const handleItemClick = (e: React.MouseEvent, item: KanbanItem, columnId: ColumnId) => {
    e.stopPropagation();
    let newSelection: string[] = [];
    const itemIds = 'type' in item && item.type === 'group' ? item.items.map(i => i.id) : [item.id];
    const primaryId = item.id;

    if (e.shiftKey && lastSelectedId && selectedColumnId === columnId) {
      const flatItems = data[columnId].items;
      const lastIdx = flatItems.findIndex((i) => i.id === lastSelectedId);
      const currentIdx = flatItems.findIndex((i) => i.id === primaryId);

      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const rangeItems = flatItems.slice(start, end + 1);
        const rangeIds = rangeItems.flatMap(i => 'type' in i && i.type === 'group' ? i.items.map(m => m.id) : [i.id]);
        newSelection = Array.from(new Set([...selectedItemIds, ...rangeIds]));
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (selectedColumnId !== columnId) {
        newSelection = itemIds;
      } else {
        const alreadySelected = itemIds.every(id => selectedItemIds.includes(id));
        if (alreadySelected) {
          newSelection = selectedItemIds.filter((id) => !itemIds.includes(id));
        } else {
          newSelection = Array.from(new Set([...selectedItemIds, ...itemIds]));
        }
      }
      setLastSelectedId(primaryId);
    } else {
      newSelection = itemIds;
      setLastSelectedId(primaryId);
    }

    setSelectedItemIds(newSelection);
    setSelectedColumnId(newSelection.length > 0 ? columnId : null);
    
    if (newSelection.length > 0) {
      const allFeedingItems = flattenItems(data[columnId].items);
      const items = allFeedingItems.filter(i => newSelection.includes(i.id));
      setInteraction({ items, columnId, type: 'select' });
    } else {
      setInteraction({ items: [], columnId: null, type: null });
    }
  };

  const handleRenameGroup = (groupId: string, newName: string) => {
    setData((prev) => {
      const nextData = { ...prev };
      for (const colId in nextData) {
        const column = nextData[colId as ColumnId];
        const groupIdx = column.items.findIndex(item => item.id === groupId);
        if (groupIdx !== -1) {
          const group = column.items[groupIdx] as KanbanGroup;
          column.items[groupIdx] = { ...group, name: newName };
          break;
        }
      }
      return { ...nextData };
    });
  };

  const removeItems = (ids: string[], columnId: ColumnId) => {
    if (columnId !== 'inventory' && columnId !== 'stash') return;

    setData((prev) => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        items: prev[columnId].items.map((item) => {
          if ('type' in item && item.type === 'group') {
            return { ...item, items: item.items.filter(i => !ids.includes(i.id)) };
          }
          return item;
        }).filter(item => {
           if ('type' in item && item.type === 'group') return item.items.length > 0;
           return !ids.includes(item.id);
        }) as KanbanItem[],
      },
    }));

    if (ids.some(id => selectedItemIds.includes(id))) {
      clearSelection();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && (selectedColumnId === 'inventory' || selectedColumnId === 'stash') && selectedItemIds.length > 0) {
        e.preventDefault();
        removeItems(selectedItemIds, selectedColumnId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedColumnId, selectedItemIds]);

  const handleMoveToStash = (item: KanbanItem, sourceColumnId: ColumnId) => {
    if (sourceColumnId === 'stash') return;

    const idsToMove = 'type' in item && item.type === 'group' ? item.items.map(i => i.id) : [item.id];
    const flatItems = flattenItems(data[sourceColumnId].items);
    const movedFeedingItems = flatItems.filter(i => idsToMove.includes(i.id));

    // 1. Calculate and update stats optimistically
    const totals = STAT_NAMES.reduce((acc, stat) => {
      acc[stat] = 0;
      return acc;
    }, {} as Record<StatName, number>);

    movedFeedingItems.forEach((mat) => {
      const yields = matrixData[mat.level.toString()]?.[mat.type];
      if (yields) {
        STAT_NAMES.forEach((stat) => {
          totals[stat] += yields[stat] || 0;
        });
      }
    });

    setMountStats((prev) => {
      const next = { ...prev };
      STAT_NAMES.forEach((stat) => {
        next[stat] = {
          ...next[stat],
          limitLevel: next[stat].limitLevel + totals[stat]
        };
      });
      return next;
    });

    // 2. Update Kanban data
    setData((prev) => {
      const nextData = {
        inventory: { ...prev.inventory, items: [...prev.inventory.items] },
        feeder: { ...prev.feeder, items: [...prev.feeder.items] },
        consumed: { ...prev.consumed, items: [...prev.consumed.items] },
        stash: { ...prev.stash, items: [...prev.stash.items] },
      };

      for (const colId in nextData) {
        const cId = colId as ColumnId;
        nextData[cId].items = nextData[cId].items.map((it: KanbanItem) => {
          if ('type' in it && it.type === 'group') {
            return { ...it, items: it.items.filter(i => !idsToMove.includes(i.id)) };
          }
          return it;
        }).filter((it: KanbanItem) => {
          if ('type' in it && it.type === 'group') return it.items.length > 0;
          return !idsToMove.includes(it.id);
        });
      }

      const now = Date.now();
      const stashedItems = movedFeedingItems.map(i => ({ ...i, stashedAt: now }));
      
      if ('type' in item && item.type === 'group') {
        nextData.stash.items.unshift({ ...item, items: stashedItems, stashedAt: now });
      } else {
        nextData.stash.items.unshift(...stashedItems);
      }

      return nextData;
    });
  };

  if (!isReady) {
    return (
      <div className="w-full h-full bg-black border border-neutral-800 rounded-lg flex flex-col items-center justify-center space-y-4 shadow-2xl min-h-[400px]">
        <div className="size-8 border-4 border-neutral-800 border-t-white rounded-full animate-spin"></div>
        <p className="text-neutral-400 text-xs font-mono uppercase tracking-widest">Synchronizing Inventory...</p>
      </div>
    );
  }

  return (
    <div 
      className="flex gap-6 h-full w-full overflow-x-auto"
      onClick={clearSelection}
    >
      {columnIds.filter(id => !!data[id]).map((id) => {
        let items = data[id].items;
        if (id === 'stash') {
          items = [...items].sort((a, b) => (b.stashedAt || 0) - (a.stashedAt || 0));
        }

        return (
          <KanbanColumn 
            key={id} 
            column={{ ...data[id], items }} 
            selectedItemIds={selectedItemIds}
            onItemClick={handleItemClick}
            onRemove={(ids) => removeItems(ids, id)}
            onRenameGroup={handleRenameGroup}
            onMoveToStash={(item) => handleMoveToStash(item, id)}
            onStartDrag={(item) => {
              const itemIds = 'type' in item && item.type === 'group' ? item.items.map(i => i.id) : [item.id];
              const alreadySelected = itemIds.every(id => selectedItemIds.includes(id));
              if (!alreadySelected) {
                 setSelectedItemIds(itemIds);
                 setSelectedColumnId(id);
                 setLastSelectedId(item.id);
                 const feedingItems = 'type' in item && item.type === 'group' ? item.items : [item as FeedingItem];
                 setInteraction({ items: feedingItems, columnId: id, type: 'select' });
              }
            }}
          />
        );
      })}
    </div>
  );
}
