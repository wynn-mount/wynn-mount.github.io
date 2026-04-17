export type StatName = 
  | 'speed' | 'acceleration' | 'altitude' | 'energy' 
  | 'handling' | 'toughness' | 'boost' | 'training';

export type MaterialType = 
  | 'ingot' | 'gem' | 'wood' | 'paper' 
  | 'string' | 'grains' | 'oil' | 'meat';

export type MaterialYields = Record<StatName, number>;

export interface MaterialData {
  // Key is the level as a string (e.g., "1", "100")
  [level: string]: {
    [type in MaterialType]: MaterialYields;
  };
}

export interface MountStat {
  name: StatName;
  limitLevel: number;
  maxLevel: number;
}

export interface MaterialPreset {
  id?: number;
  name: string;
  data: MaterialData;
}

export interface SavedMount {
  id?: number;
  name: string;
  stats: Record<StatName, MountStat>;
  currentLevel: number;
  activePresetId?: number;
}

export interface SolverMaterialItem {
  level: number;
  type: MaterialType;
  quantity: number;
}

export interface SolverResult {
  feasible: boolean;
  totalMaterials?: number;
  materials?: SolverMaterialItem[];
}

export type ColumnId = 'inventory' | 'feeder' | 'consumed' | 'stash';

export interface FeedingItem {
  id: string;
  type: MaterialType;
  level: number;
  stashedAt?: number;
}

export interface KanbanGroup {
  id: string;
  items: FeedingItem[];
  type: 'group';
  name?: string;
  stashedAt?: number;
}

export type KanbanItem = FeedingItem | KanbanGroup;

export interface ColumnData {
  id: ColumnId;
  title: string;
  items: KanbanItem[];
}
