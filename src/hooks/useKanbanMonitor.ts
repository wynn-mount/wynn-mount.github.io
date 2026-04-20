import { useEffect } from 'react';
import { useSetAtom, useAtomValue, useAtom } from 'jotai';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { ColumnId, FeedingItem, KanbanItem, KanbanGroup, StatName, SavedMount } from '../types';
import { kanbanDataAtom, interactionStateAtom, flattenItems, selectedColumnIdAtom } from '../store/feedingStore';
import { activeMatrixDataAtom } from '../store/matrixStore';
import { activeMountIdAtom, mountStatsAtom } from '../store/mountStore';
import { STAT_NAMES } from '../lib/constants';

export function useKanbanMonitor() {
  const setData = useSetAtom(kanbanDataAtom);
  const setSelectedColumnId = useSetAtom(selectedColumnIdAtom);
  const setInteraction = useSetAtom(interactionStateAtom);
  const matrixData = useAtomValue(activeMatrixDataAtom);
  const activeMountId = useAtomValue(activeMountIdAtom);
  const [mountStats, setMountStats] = useAtom(mountStatsAtom);

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

  const updateOptimisticStats = (yields: Record<StatName, number>, operation: 'add' | 'subtract') => {
    setMountStats((prev) => {
      const next = { ...prev };
      STAT_NAMES.forEach((stat) => {
        const currentLimit = next[stat].limitLevel;
        const change = yields[stat];
        next[stat] = {
          ...next[stat],
          limitLevel: operation === 'add' ? currentLimit + change : Math.max(0, currentLimit - change)
        };
      });
      return next;
    });
  };

  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const draggedItemIds = source.data.draggedItemIds as string[];
        const sourceColumnId = source.data.columnId as ColumnId;
        const sourceItemId = source.data.id as string;

        const destinationItemData = location.current.dropTargets.find((t) => t.data.type === 'item')?.data;
        const destinationColumnData = location.current.dropTargets.find((t) => t.data.type === 'column')?.data;

        if (!destinationColumnData) return;

        const destinationColumnId = destinationColumnData.columnId as ColumnId;

        setData((prev) => {
          const nextData: Record<ColumnId, any> = {
            inventory: { ...prev.inventory, items: [...prev.inventory.items] },
            feeder: { ...prev.feeder, items: [...prev.feeder.items] },
            consumed: { ...prev.consumed, items: [...prev.consumed.items] },
            stash: { ...prev.stash, items: [...prev.stash.items] },
          };

          // 1. Extract moved FeedingItems
          const allSourceFlatItems = flattenItems(prev[sourceColumnId].items);
          const movedFeedingItems = allSourceFlatItems.filter(item => draggedItemIds.includes(item.id));

          const movedStructuredItems: KanbanItem[] = [];
          prev[sourceColumnId].items.forEach(item => {
            if ('type' in item && item.type === 'group') {
              const matching = item.items.filter(i => draggedItemIds.includes(i.id));
              if (matching.length > 0) {
                movedStructuredItems.push({ ...item, items: matching });
              }
            } else if (draggedItemIds.includes(item.id)) {
              movedStructuredItems.push(item);
            }
          });

          // 2. STAT COMMITMENT LOGIC (Optimistic)
          if (activeMountId) {
            const yields = calculateYields(movedFeedingItems);
            // Moving IN to stash
            if (destinationColumnId === 'stash' && sourceColumnId !== 'stash') {
              updateOptimisticStats(yields, 'add');
            }
            // Moving OUT of stash
            else if (sourceColumnId === 'stash' && destinationColumnId !== 'stash') {
              updateOptimisticStats(yields, 'subtract');
            }
          }

          // 3. Remove dragged items from all columns (surgically)
          for (const colId in nextData) {
            const cId = colId as ColumnId;
            nextData[cId].items = nextData[cId].items.map((item: KanbanItem) => {
              if ('type' in item && item.type === 'group') {
                return { ...item, items: (item as KanbanGroup).items.filter(i => !draggedItemIds.includes(i.id)) };
              }
              return item;
            }).filter((item: KanbanItem) => {
              if ('type' in item && item.type === 'group') return (item as KanbanGroup).items.length > 0;
              return !draggedItemIds.includes(item.id);
            }) as KanbanItem[];
          }

          const destItems = nextData[destinationColumnId].items;
          const isGroupTarget = destinationItemData?.isGroupTarget as boolean | undefined;

          // 4. PREPARE STAMPED ITEMS (if entering stash)
          const now = Date.now();
          const itemsToInsert = movedStructuredItems.map(item => {
            if ('type' in item && item.type === 'group') {
              const stashedItems = item.items.map(sub => {
                 if (destinationColumnId === 'stash') return { ...sub, stashedAt: sub.stashedAt || now };
                 const { stashedAt, ...rest } = sub;
                 return rest as FeedingItem;
              });
              const groupStashedAt = destinationColumnId === 'stash' ? (item.stashedAt || now) : undefined;
              if (destinationColumnId === 'stash') {
                return { ...item, items: stashedItems, stashedAt: groupStashedAt } as KanbanGroup;
              } else {
                const { stashedAt, ...restGroup } = item;
                return { ...restGroup, items: stashedItems } as KanbanGroup;
              }
            } else {
               if (destinationColumnId === 'stash') return { ...item, stashedAt: item.stashedAt || now } as FeedingItem;
               const { stashedAt, ...rest } = item as FeedingItem;
               return rest as FeedingItem;
            }
          });
          const flatItemsToInsert = flattenItems(itemsToInsert);

          // 5. GROUPING LOGIC
          if (isGroupTarget && destinationItemData) {
            const destId = destinationItemData.id as string;
            if (!draggedItemIds.includes(destId)) {
              const targetIdx = destItems.findIndex((i: KanbanItem) => i.id === destId);
              if (targetIdx !== -1) {
                const targetItem = destItems[targetIdx];
                if ('type' in targetItem && targetItem.type === 'group') {
                  destItems[targetIdx] = {
                    ...targetItem,
                    items: [...targetItem.items, ...flatItemsToInsert],
                    stashedAt: destinationColumnId === 'stash' ? (targetItem.stashedAt || now) : undefined
                  };
                } else {
                  destItems[targetIdx] = {
                    id: crypto.randomUUID(),
                    type: 'group',
                    name: 'Batch',
                    items: [targetItem as FeedingItem, ...flatItemsToInsert],
                    stashedAt: destinationColumnId === 'stash' ? now : undefined
                  };
                }
                return nextData;
              }
            }
          }

          // 6. REORDERING / MOVING LOGIC
          const edge = destinationItemData ? extractClosestEdge(destinationItemData) : null;
          let insertIndex = destItems.length;
          
          if (destinationItemData) {
            const destId = destinationItemData.id as string;
            const relativeDestIndex = destItems.findIndex((item: KanbanItem) => item.id === destId);
            if (relativeDestIndex !== -1) {
              insertIndex = edge === 'bottom' ? relativeDestIndex + 1 : relativeDestIndex;
            }
          }

          destItems.splice(insertIndex, 0, ...itemsToInsert);

          return nextData as Record<ColumnId, any>;
        });

        setSelectedColumnId(destinationColumnId);
        setInteraction({ items: [], columnId: null, type: null });
      },
    });
  }, [setData, setSelectedColumnId, setInteraction, activeMountId, matrixData, setMountStats]);
}
