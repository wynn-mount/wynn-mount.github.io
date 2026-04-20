import React from 'react';
import { MaterialType } from '../../types';
import { ICON_SIZE, MATERIAL_ICON_MAP } from '../../lib/constants';
import spriteSheet from '../../assets/ProfessionIcon.webp';

interface IconProps {
  type: MaterialType;
  level: number;
  scale?: number;
  className?: string;
}

export const Icon = ({ type, level, scale = 1, className = '' }: IconProps) => {
  const coords = MATERIAL_ICON_MAP[type]?.[level];

  if (!coords) {
    return <div className={`inline-block bg-neutral-800 ${className}`} style={{ width: ICON_SIZE * scale, height: ICON_SIZE * scale }} />;
  }

  const { row, col } = coords;

  const style: React.CSSProperties = {
    width: `${ICON_SIZE}px`,
    height: `${ICON_SIZE}px`,
    backgroundImage: `url(${spriteSheet})`,
    backgroundPosition: `-${col * ICON_SIZE}px -${row * ICON_SIZE}px`,
    backgroundSize: '512px 512px',
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    flexShrink: 0,
  };

  // We wrap it in a container that matches the scaled size to prevent layout issues
  const containerStyle: React.CSSProperties = {
    width: `${ICON_SIZE * scale}px`,
    height: `${ICON_SIZE * scale}px`,
    display: 'inline-block',
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={style} />
    </div>
  );
};
