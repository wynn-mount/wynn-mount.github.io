import React, { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
}

export function EditableText({ value, onSave, className = '' }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = tempValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setTempValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className={`flex-1 min-w-0 ${className}`} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full bg-neutral-800 text-white border border-neutral-700 px-1.5 py-0.5 rounded focus:outline-none focus:border-white text-sm"
        />
      </div>
    );
  }

  return (
    <div 
      className={`group flex items-center gap-2 flex-1 min-w-0 ${className}`}
      onDoubleClick={startEditing}
    >
      <span className="truncate pr-1">{value}</span>
      <button
        onClick={startEditing}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-800 rounded transition-all text-neutral-500 hover:text-white shrink-0"
        aria-label="Rename"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}
