import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { X, Layers, ChevronDown, ChevronRight, Archive, CheckCircle } from 'lucide-react';
import { MaterialType, ColumnId, ColumnData, FeedingItem, KanbanItem, KanbanGroup, StatName } from '../types';
import { getMaterialName, STAT_NAMES } from '../lib/constants';
import { Icon } from './Icon';
import { EditableText } from './EditableText';
import { kanbanDataAtom, selectedItemIdsAtom, lastSelectedIdAtom, selectedColumnIdAtom, interactionStateAtom, flattenItems, isKanbanReadyAtom } from '../store/feedingStore';
import { activeMatrixDataAtom } from '../store/matrixStore';
import { mountStatsAtom } from '../store/mountStore';

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

  const clearSelection = useCallback(() => {
    setSelectedItemIds([]);
    setLastSelectedId(null);
    setSelectedColumnId(null);
    setInteraction({ items: [], columnId: null, type: null });
  }, [setSelectedItemIds, setLastSelectedId, setSelectedColumnId, setInteraction]);

  const handleItemClick = useCallback((e: React.MouseEvent, item: KanbanItem, columnId: ColumnId) => {
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
  }, [data, lastSelectedId, selectedColumnId, selectedItemIds, setSelectedItemIds, setSelectedColumnId, setLastSelectedId, setInteraction]);

  const handleRenameGroup = useCallback((groupId: string, newName: string) => {
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
  }, [setData]);

  const removeItems = useCallback((ids: string[], columnId: ColumnId) => {
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
  }, [setData, selectedItemIds, clearSelection]);

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
  }, [selectedColumnId, selectedItemIds, removeItems]);

  const handleMoveToStash = useCallback((item: KanbanItem, sourceColumnId: ColumnId) => {
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
  }, [setData, data, matrixData, setMountStats]);

  if (!isReady) {
    return (
      <div className="w-full h-full bg-black border border-neutral-800 rounded-lg flex flex-col items-center justify-center space-y-4 shadow-2xl min-h-[400px]">
        <div className="w-8 h-8 border-4 border-neutral-800 border-t-white rounded-full animate-spin"></div>
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
          <Column 
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

interface ColumnProps {
  column: ColumnData;
  selectedItemIds: string[];
  onItemClick: (e: React.MouseEvent, item: KanbanItem, columnId: ColumnId) => void;
  onRemove: (ids: string[]) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onStartDrag: (item: KanbanItem) => void;
  onMoveToStash: (item: KanbanItem) => void;
}

function Column({ column, selectedItemIds, onItemClick, onRemove, onRenameGroup, onStartDrag, onMoveToStash }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'column', columnId: column.id }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });
  }, [column.id]);

  return (
    <div
      ref={ref}
      className={`flex flex-col flex-shrink-0 bg-neutral-900/20 rounded-lg border border-neutral-800 transition-all duration-200 ${
        column.id === 'stash' ? 'w-[450px]' : 'flex-1 min-w-[240px]'
      } ${
        isDraggedOver ? 'border-white/30 bg-neutral-800/30 ring-1 ring-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : ''
      }`}
    >
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/40 rounded-t-lg select-none">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-4 rounded-full ${
            column.id === 'inventory' ? 'bg-blue-500' : 
            column.id === 'feeder' ? 'bg-orange-500' : 
            column.id === 'consumed' ? 'bg-green-500' : 'bg-purple-500'
          }`} />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white">
            {column.title}
          </h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-neutral-400 bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
          {column.items.length}
        </span>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
        {column.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-8 pointer-events-none">
            <div className="w-8 h-8 rounded-full border border-dashed border-white mb-2" />
            <span className="text-[10px] uppercase font-bold tracking-tighter">Empty Section</span>
          </div>
        ) : (
          column.items.map((item) => (
            <DraggableItem 
              key={item.id} 
              item={item} 
              columnId={column.id} 
              isSelected={'type' in item && item.type === 'group' 
                ? item.items.every(i => selectedItemIds.includes(i.id))
                : selectedItemIds.includes(item.id)
              }
              selectedItemIds={selectedItemIds}
              onItemClick={onItemClick}
              onRemove={onRemove}
              onRenameGroup={onRenameGroup}
              onStartDrag={onStartDrag}
              onMoveToStash={onMoveToStash}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ItemProps {
  item: KanbanItem;
  columnId: ColumnId;
  isSelected: boolean;
  selectedItemIds: string[];
  onItemClick: (e: React.MouseEvent, item: KanbanItem, columnId: ColumnId) => void;
  onRemove: (ids: string[]) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onStartDrag: (item: KanbanItem) => void;
  onMoveToStash: (item: KanbanItem) => void;
}

const DraggableItem = React.memo(({ item, columnId, isSelected, selectedItemIds, onItemClick, onRemove, onRenameGroup, onStartDrag, onMoveToStash }: ItemProps) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [isGroupTarget, setIsGroupTarget] = useState(false);
  const [isContentDraggedOver, setIsContentDraggedOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const isGroup = 'type' in item && item.type === 'group';
  const groupItems = isGroup ? (item as KanbanGroup).items : [];
  
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const items = [
      draggable({
        element: el,
        getInitialData: () => {
          const draggedItemIds = isGroup 
            ? (item as KanbanGroup).items.map(i => i.id)
            : (isSelected ? selectedItemIds : [item.id]);
          return { type: 'item', id: item.id, columnId, draggedItemIds };
        },
        onDragStart: () => {
          setIsDragging(true);
          onStartDrag(item);
        },
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input, element }) => {
          const rect = element.getBoundingClientRect();
          const relativeY = input.clientY - rect.top;
          const height = rect.height;
          const isGroupTarget = relativeY > height * 0.375 && relativeY < height * 0.625;
          const data = { type: 'item', id: item.id, columnId, isGroupTarget };
          if (isGroupTarget) return data;
          
          // Disable reordering indicators in Stash column
          if (columnId === 'stash') return data;
          
          return attachClosestEdge(data, { element, input, allowedEdges: ['top', 'bottom'] });
        },
        onDragEnter: (args) => {
           const data = args.self.data;
           setClosestEdge(columnId === 'stash' ? null : extractClosestEdge(data));
           setIsGroupTarget(!!data.isGroupTarget);
        },
        onDrag: (args) => {
           const data = args.self.data;
           setClosestEdge(columnId === 'stash' ? null : extractClosestEdge(data));
           setIsGroupTarget(!!data.isGroupTarget);
        },
        onDragLeave: () => {
           setClosestEdge(null);
           setIsGroupTarget(false);
        },
        onDrop: () => {
           setClosestEdge(null);
           setIsGroupTarget(false);
        },
      })
    ];

    return combine(...items);
  }, [item, columnId, isSelected, selectedItemIds, onStartDrag, isGroup]);

  useEffect(() => {
    if (!isGroup || !isExpanded) return;
    const el = contentRef.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'item', id: item.id, columnId, isGroupTarget: true }),
      onDragEnter: () => setIsContentDraggedOver(true),
      onDragLeave: () => setIsContentDraggedOver(false),
      onDrop: () => setIsContentDraggedOver(false),
    });
  }, [isGroup, isExpanded, item.id, columnId]);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (isGroup) {
    const group = item as KanbanGroup;
    return (
      <div className="flex flex-col gap-1 relative">
        <div
          ref={headerRef}
          onClick={(e) => onItemClick(e, item, columnId)}
          className={`py-1.5 px-3 border rounded-md flex items-center justify-between cursor-grab active:cursor-grabbing transition-all duration-200 shadow-sm ${
            isDragging ? 'opacity-20 scale-95 border-dashed' : 'opacity-100 scale-100'
          } ${
            isSelected 
              ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
              : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-600 hover:bg-neutral-800/80 hover:shadow-lg'
          } ${
            isGroupTarget ? 'border-yellow-500 bg-yellow-500/10 scale-[1.02] ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''
          } group`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
             {columnId !== 'stash' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveToStash(item); }}
                  className="p-1 text-neutral-500 hover:text-purple-400 hover:bg-purple-950/20 rounded transition-all"
                  title="Move to Stash"
                >
                  <Archive size={14} />
                </button>
             )}
             <EditableText 
                value={group.name || 'Material Group'} 
                onSave={(newName) => onRenameGroup(group.id, newName)}
                className={`text-[11px] font-bold transition-colors truncate ${
                  isSelected ? 'text-blue-200' : 'text-neutral-200 group-hover:text-white'
                }`}
              />
          </div>

          <div className="flex items-center gap-2">
            {columnId === 'stash' && group.stashedAt && (
              <span className="text-[9px] font-mono text-purple-400/80 bg-purple-900/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                {formatTime(group.stashedAt)}
              </span>
            )}
            {(columnId === 'inventory' || columnId === 'stash') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(groupItems.map(i => i.id));
                }}
                className="p-1 text-neutral-600 hover:text-red-400 hover:bg-red-950/20 rounded transition-all opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`p-0.5 hover:bg-white/10 rounded transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            >
              <ChevronRight size={14} className="text-neutral-400" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div 
            ref={contentRef}
            className={`ml-4 flex flex-col gap-1 border-l pl-3 py-1 transition-all duration-200 ${
              isContentDraggedOver 
                ? 'border-yellow-500/50 bg-yellow-500/5 ring-1 ring-yellow-500/20 rounded-r' 
                : 'border-neutral-800'
            }`}
          >
            {groupItems.map((subItem) => (
              <DraggableSubItem 
                key={subItem.id} 
                item={subItem} 
                columnId={columnId}
                isSelected={selectedItemIds.includes(subItem.id)}
                onItemClick={(e) => onItemClick(e, subItem, columnId)}
              />
            ))}
          </div>
        )}

        {closestEdge === 'top' && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full -translate-y-1/2 pointer-events-none z-10 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        )}
        {closestEdge === 'bottom' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full translate-y-1/2 pointer-events-none z-10 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        )}
      </div>
    );
  }

  const feedingItem = item as FeedingItem;
  return (
    <div className="flex flex-col gap-1 relative">
      <div 
        ref={headerRef}
        onClick={(e) => onItemClick(e, item, columnId)}
        className={`p-3 border rounded-md flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all duration-200 shadow-sm ${
          isDragging ? 'opacity-20 scale-95 border-dashed' : 'opacity-100 scale-100'
        } ${
          isSelected 
            ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
            : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-600 hover:bg-neutral-800/80 hover:shadow-lg'
        } ${
          isGroupTarget ? 'border-yellow-500 bg-yellow-500/10 scale-[1.02] ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''
        } group`}
      >
        {columnId !== 'stash' && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToStash(item); }}
            className="p-1 text-neutral-500 hover:text-purple-400 hover:bg-purple-950/20 rounded transition-all"
            title="Move to Stash"
          >
            <Archive size={14} />
          </button>
        )}

        <div className="relative">
          <div className="relative z-10">
            <Icon type={feedingItem.type} level={feedingItem.level} scale={0.8} className="rounded" />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <span className={`text-[11px] font-bold truncate transition-colors ${
            isSelected ? 'text-blue-200' : 'text-neutral-200 group-hover:text-white'
          }`}>
            {getMaterialName(feedingItem.level, feedingItem.type)}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[9px] uppercase font-extrabold tracking-tight ${
              isSelected ? 'text-blue-400' : 'text-neutral-500'
            }`}>
              {feedingItem.type}
            </span>
            <span className={`w-0.5 h-0.5 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-neutral-700'}`} />
            <span className={`text-[9px] font-bold ${
              isSelected ? 'text-blue-400' : 'text-neutral-500'
            }`}>
              Lv. {feedingItem.level}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {columnId === 'stash' && feedingItem.stashedAt && (
            <span className="text-[9px] font-mono text-purple-400/80 bg-purple-900/10 px-1.5 py-0.5 rounded border border-purple-500/20">
              {formatTime(feedingItem.stashedAt)}
            </span>
          )}
          {(columnId === 'inventory' || columnId === 'stash') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove([feedingItem.id]);
              }}
              className="p-1 text-neutral-600 hover:text-red-400 hover:bg-red-950/20 rounded transition-all opacity-0 group-hover:opacity-100"
              title="Remove"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      
      {closestEdge === 'top' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full -translate-y-1/2 pointer-events-none z-10 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
      )}
      {closestEdge === 'bottom' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full translate-y-1/2 pointer-events-none z-10 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
      )}
    </div>
  );
});

interface SubItemProps {
  item: FeedingItem;
  columnId: ColumnId;
  isSelected: boolean;
  onItemClick: (e: React.MouseEvent) => void;
}

const DraggableSubItem = React.memo(({ item, columnId, isSelected, onItemClick }: SubItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return draggable({
      element: el,
      getInitialData: () => ({ type: 'item', id: item.id, columnId, draggedItemIds: [item.id] }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [item.id, columnId]);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      ref={ref}
      onClick={onItemClick}
      className={`p-2 border rounded flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragging ? 'opacity-20 scale-95 border-dashed' : 'opacity-100 scale-100'
      } ${
        isSelected 
          ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.1)]' 
          : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'
      }`}
    >
      <div className="relative">
        <Icon type={item.type} level={item.level} scale={0.6} className="rounded" />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-blue-200' : 'text-neutral-300'}`}>
          {getMaterialName(item.level, item.type)}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[8px] uppercase font-extrabold tracking-tight text-neutral-500">
            {item.type}
          </span>
          <span className="w-0.5 h-0.5 rounded-full bg-neutral-700" />
          <span className="text-[8px] font-bold text-neutral-500">
            Lv. {item.level}
          </span>
        </div>
      </div>
      {columnId === 'stash' && item.stashedAt && (
        <span className="text-[8px] font-mono text-purple-500/60">
          {formatTime(item.stashedAt)}
        </span>
      )}
    </div>
  );
});
