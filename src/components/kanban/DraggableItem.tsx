import React, { useState } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { X, ChevronRight, Archive } from 'lucide-react';
import { ColumnId, FeedingItem, KanbanItem, KanbanGroup } from '../../types';
import { getMaterialName } from '../../lib/constants';
import { Icon } from '../util/Icon';
import { EditableText } from '../util/EditableText';
import { DraggableSubItem } from './DraggableSubItem';

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

export function DraggableItem({ item, columnId, isSelected, selectedItemIds, onItemClick, onRemove, onRenameGroup, onStartDrag, onMoveToStash }: ItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [isGroupTarget, setIsGroupTarget] = useState(false);
  const [isContentDraggedOver, setIsContentDraggedOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const isGroup = 'type' in item && item.type === 'group';
  const groupItems = isGroup ? (item as KanbanGroup).items : [];
  
  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (isGroup) {
    const group = item as KanbanGroup;
    return (
      <div className="flex flex-col gap-1 relative">
        <div
          ref={(node) => {
            if (node) {
              const items = [
                draggable({
                  element: node,
                  getInitialData: () => {
                    const groupItemIds = (item as KanbanGroup).items.map(i => i.id);
                    const draggedItemIds = isSelected ? selectedItemIds : groupItemIds;
                    return { type: 'item', id: item.id, columnId, draggedItemIds };
                  },
                  onDragStart: () => {
                    setIsDragging(true);
                    onStartDrag(item);
                  },
                  onDrop: () => setIsDragging(false),
                }),
                dropTargetForElements({
                  element: node,
                  getData: ({ input, element }) => {
                    const rect = element.getBoundingClientRect();
                    const relativeY = input.clientY - rect.top;
                    const height = rect.height;
                    const isGroupTarget = relativeY > height * 0.375 && relativeY < height * 0.625;
                    const data = { type: 'item', id: item.id, columnId, isGroupTarget };
                    if (isGroupTarget) return data;
                    
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
            }
          }}
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
            ref={(node) => {
              if (node && isGroup && isExpanded) {
                return dropTargetForElements({
                  element: node,
                  getData: () => ({ type: 'item', id: item.id, columnId, isGroupTarget: true }),
                  onDragEnter: () => setIsContentDraggedOver(true),
                  onDragLeave: () => setIsContentDraggedOver(false),
                  onDrop: () => setIsContentDraggedOver(false),
                });
              }
            }}
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
        ref={(node) => {
          if (node) {
            const items = [
              draggable({
                element: node,
                getInitialData: () => {
                  const draggedItemIds = isSelected ? selectedItemIds : [item.id];
                  return { type: 'item', id: item.id, columnId, draggedItemIds };
                },
                onDragStart: () => {
                  setIsDragging(true);
                  onStartDrag(item);
                },
                onDrop: () => setIsDragging(false),
              }),
              dropTargetForElements({
                element: node,
                getData: ({ input, element }) => {
                  const rect = element.getBoundingClientRect();
                  const relativeY = input.clientY - rect.top;
                  const height = rect.height;
                  const isGroupTarget = relativeY > height * 0.375 && relativeY < height * 0.625;
                  const data = { type: 'item', id: item.id, columnId, isGroupTarget };
                  if (isGroupTarget) return data;
                  
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
          }
        }}
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
}
