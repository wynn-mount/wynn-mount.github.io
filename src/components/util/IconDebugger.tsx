import React from 'react';
import { MATERIAL_TYPES, MATERIAL_LEVELS, getMaterialName } from '../../lib/constants';
import { Icon } from './Icon';
import { MaterialType } from '../../types';

export function IconDebugger() {
  return (
    <div className="p-8 bg-neutral-950 border border-neutral-800 rounded-lg space-y-8 my-16">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Icon Sprite Sheet Debugger</h2>
          <p className="text-neutral-500 text-sm italic mt-1">Verifying all 112 material icons from coordinate map...</p>
        </div>
      </div>

      <div className="space-y-12">
        {MATERIAL_TYPES.map((type) => (
          <div key={type} className="space-y-4">
            <h3 className="text-lg font-bold text-white capitalize border-l-4 border-white pl-3 flex items-center gap-2">
              {type}
              <span className="text-xs text-neutral-600 font-mono font-normal">({MATERIAL_LEVELS.length} tiers)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
              {MATERIAL_LEVELS.map((level) => (
                <div 
                  key={`${type}-${level}`} 
                  className="flex flex-col items-center p-3 bg-black border border-neutral-900 rounded hover:border-neutral-700 transition-colors group"
                >
                  <div className="mb-3 bg-neutral-900/50 p-2 rounded group-hover:bg-neutral-800 transition-colors flex items-center justify-center size-12 overflow-hidden">
                    <Icon type={type as MaterialType} level={level} scale={1.25} />
                  </div>
                  <div className="text-center w-full">
                    <div className="text-[10px] text-neutral-500 font-mono mb-1 uppercase tracking-tighter">LVL {level}</div>
                    <div className="text-[11px] font-medium text-neutral-300 truncate w-full px-1">
                      {getMaterialName(level, type as MaterialType)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-6 border-t border-neutral-800 text-center">
        <p className="text-neutral-600 text-xs">
          End of Icon Map. If any icons are misaligned or showing the "placeholder" gray box, check 
          <code className="mx-1 px-1 bg-neutral-900 rounded text-neutral-400 font-mono italic">src/lib/constants.ts</code>
        </p>
      </div>
    </div>
  );
}
