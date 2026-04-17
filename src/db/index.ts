import Dexie, { type Table } from 'dexie';
import { MaterialPreset, SavedMount, MountStat, StatName, ColumnData, ColumnId } from '../types';
import { STAT_NAMES } from '../lib/constants';

export interface KanbanState {
  mountId: number;
  data: Record<ColumnId, ColumnData>;
}

export class MountDatabase extends Dexie {
  presets!: Table<MaterialPreset, number>;
  mounts!: Table<SavedMount, number>;
  kanbans!: Table<KanbanState, number>;

  constructor() {
    super('MountDatabase');
    this.version(1).stores({
      presets: '++id, name',
      mounts: '++id, name',
      kanbans: 'mountId',
    });
  }
}

export const db = new MountDatabase();

export const createDefaultStats = (): Record<StatName, MountStat> => {
  return STAT_NAMES.reduce((acc, stat) => {
    acc[stat] = { name: stat, limitLevel: 1, maxLevel: 1 };
    return acc;
  }, {} as Record<StatName, MountStat>);
};

export const createNewMount = async (name: string): Promise<SavedMount> => {
  const newMount: Omit<SavedMount, 'id'> = {
    name,
    currentLevel: 1,
    stats: createDefaultStats(),
  };
  const id = await db.mounts.add(newMount as SavedMount);
  return { ...newMount, id };
};

export const getAllMounts = async (): Promise<SavedMount[]> => {
  return await db.mounts.toArray();
};

export const updateMount = async (id: number, changes: Partial<SavedMount>) => {
  await db.mounts.update(id, changes);
};

export const deleteMount = async (id: number) => {
  await db.mounts.delete(id);
};

export const replaceAllMounts = async (mounts: Omit<SavedMount, 'id'>[]): Promise<SavedMount[]> => {
  await db.mounts.clear();
  const ids = await db.mounts.bulkAdd(mounts as SavedMount[], { allKeys: true });
  return mounts.map((m, i) => ({ ...m, id: ids[i] }));
};

export const getAllPresets = async (): Promise<MaterialPreset[]> => {
  return await db.presets.toArray();
};

export const createNewPreset = async (name: string, data: MaterialPreset['data']): Promise<MaterialPreset> => {
  const newPreset: Omit<MaterialPreset, 'id'> = { name, data };
  const id = await db.presets.add(newPreset as MaterialPreset);
  return { ...newPreset, id };
};

export const updatePreset = async (id: number, changes: Partial<MaterialPreset>) => {
  await db.presets.update(id, changes);
};

