import React, { useState } from 'react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { ColumnId, ColumnData, KanbanItem, FeedingItem } from '../../types';
import { DraggableItem } from './DraggableItem';

interface ColumnProps {
  column: ColumnData;
  selectedItemIds: string[];
  onItemClick: (e: React.MouseEvent, item: KanbanItem, columnId: ColumnId) => void;
  onRemove: (ids: string[]) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onStartDrag: (item: KanbanItem) => void;
  onMoveToStash: (item: KanbanItem) => void;
}

export function KanbanColumn({ column, selectedItemIds, onItemClick, onRemove, onRenameGroup, onStartDrag, onMoveToStash }: ColumnProps) {
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  return (
    <div
      ref={(node) => {
        if (node) {
          return dropTargetForElements({
            element: node,
            getData: () => ({ type: 'column', columnId: column.id }),
            onDragEnter: () => setIsDraggedOver(true),
            onDragLeave: () => setIsDraggedOver(false),
            onDrop: () => setIsDraggedOver(false),
          });
        }
      }}
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
            <div className="size-8 rounded-full border border-dashed border-white mb-2" />
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
