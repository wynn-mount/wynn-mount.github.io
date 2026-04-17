import { atom } from 'jotai';
import { ColumnData, ColumnId, FeedingItem, KanbanItem } from '../types';

export const INITIAL_KANBAN_DATA: Record<ColumnId, ColumnData> = {
  inventory: {
    id: 'inventory',
    title: 'Inventory',
    items: [],
  },
  feeder: {
    id: 'feeder',
    title: 'Feeder',
    items: [],
  },
  consumed: {
    id: 'consumed',
    title: 'Consumed',
    items: [],
  },
};

export interface InteractionState {
  items: FeedingItem[];
  columnId: ColumnId | null;
  type: 'hover' | 'select' | null;
}

export const kanbanDataAtom = atom<Record<ColumnId, ColumnData>>(INITIAL_KANBAN_DATA);
export const selectedItemIdsAtom = atom<string[]>([]);
export const lastSelectedIdAtom = atom<string | null>(null);
export const selectedColumnIdAtom = atom<ColumnId | null>(null);
export const isKanbanReadyAtom = atom<boolean>(false);

export const interactionStateAtom = atom<InteractionState>({
  items: [],
  columnId: null,
  type: null,
});

// Helper to flatten KanbanItems into FeedingItems
export const flattenItems = (items: KanbanItem[]): FeedingItem[] => {
  return items.flatMap(item => {
    if ('type' in item && item.type === 'group') {
      return item.items;
    }
    return item as FeedingItem;
  });
};

// Derived atom for staged materials (items in the 'feeder' column)
export const stagedMaterialsAtom = atom<FeedingItem[]>((get) => {
  const data = get(kanbanDataAtom);
  return flattenItems(data.feeder.items);
});
