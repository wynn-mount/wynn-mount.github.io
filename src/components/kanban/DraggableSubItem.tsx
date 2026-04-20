import React from 'react';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { ColumnId, FeedingItem } from '../../types';
import { getMaterialName } from '../../lib/constants';
import { Icon } from '../util/Icon';

interface SubItemProps {
  item: FeedingItem;
  columnId: ColumnId;
  isSelected: boolean;
  onItemClick: (e: React.MouseEvent) => void;
}

export function DraggableSubItem({ item, columnId, isSelected, onItemClick }: SubItemProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      ref={(node) => {
        if (node) {
          return draggable({
            element: node,
            getInitialData: () => ({ type: 'item', id: item.id, columnId, draggedItemIds: [item.id] }),
            onDragStart: () => setIsDragging(true),
            onDrop: () => setIsDragging(false),
          });
        }
      }}
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
}
