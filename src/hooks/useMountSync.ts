import { useEffect } from 'react';
import { useAtom } from 'jotai';
import {
  isAppReadyAtom,
  mountsListAtom,
  activeMountIdAtom,
  currentLevelAtom,
  mountStatsAtom
} from '../store/mountStore';
import { getAllMounts, createNewMount, updateMount, deleteMount, replaceAllMounts } from '../db';
import { SavedMount, StatName, MountStat } from '../types';
import { STAT_NAMES } from '../lib/constants';

const createDefaultStats = (): Record<StatName, MountStat> => {
  return STAT_NAMES.reduce((acc, stat) => {
    acc[stat] = { name: stat, limitLevel: 1, maxLevel: 1 };
    return acc;
  }, {} as Record<StatName, MountStat>);
};

export function useMountSync() {
  const [isAppReady, setIsAppReady] = useAtom(isAppReadyAtom);
  const [mountsList, setMountsList] = useAtom(mountsListAtom);
  const [activeMountId, setActiveMountId] = useAtom(activeMountIdAtom);
  const [currentLevel, setCurrentLevel] = useAtom(currentLevelAtom);
  const [mountStats, setMountStats] = useAtom(mountStatsAtom);

  const setUrlAndStorage = (id: number) => {
    localStorage.setItem('lastActiveMountId', id.toString());
    const url = new URL(window.location.href);
    url.searchParams.set('mountId', id.toString());
    window.history.pushState({}, '', url.toString());
  };

  // 1. Initialize DB data on mount
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const mounts = await getAllMounts();
      if (!mounted) return;

      let active: SavedMount | undefined = undefined;

      if (mounts.length === 0) {
        active = await createNewMount('Default Mount');
        setMountsList([active]);
      } else {
        setMountsList(mounts);
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlMountId = urlParams.get('mountId');
        
        if (urlMountId) {
          active = mounts.find(m => m.id === parseInt(urlMountId, 10));
        }
        
        if (!active) {
          const lastActiveId = localStorage.getItem('lastActiveMountId');
          if (lastActiveId) {
            active = mounts.find(m => m.id === parseInt(lastActiveId, 10));
          }
        }
        
        if (!active) {
          active = mounts[0];
        }
      }

      setActiveMountId(active.id!);
      setCurrentLevel(active.currentLevel || 1);
      setMountStats(active.stats || createDefaultStats());
      setUrlAndStorage(active.id!);
      setIsAppReady(true);
    };

    init();
    return () => { mounted = false; };
  }, [setIsAppReady, setMountsList, setActiveMountId, setCurrentLevel, setMountStats]);

  // 2. OPTIMISTIC UI SYNC: Keep the list in sync with atoms INSTANTLY
  useEffect(() => {
    if (!isAppReady || !activeMountId) return;

    setMountsList((prev) => 
      prev.map(m => m.id === activeMountId ? { ...m, currentLevel, stats: mountStats } : m)
    );
  }, [currentLevel, mountStats, activeMountId, isAppReady, setMountsList]);

  // 3. PERSISTENCE SYNC: Debounced DB write
  useEffect(() => {
    if (!isAppReady || !activeMountId) return;

    const timer = setTimeout(() => {
      updateMount(activeMountId, {
        currentLevel,
        stats: mountStats,
      });
    }, 1000); // Debounce DB writes slightly more for performance

    return () => clearTimeout(timer);
  }, [currentLevel, mountStats, activeMountId, isAppReady]);

  const switchMount = (id: number) => {
    const target = mountsList.find(m => m.id === id);
    if (!target) return;

    setActiveMountId(target.id!);
    setCurrentLevel(target.currentLevel || 1);
    setMountStats(target.stats || createDefaultStats());
    setUrlAndStorage(target.id!);
  };

  const addMount = async () => {
    const newName = `Mount ${mountsList.length + 1}`;
    const newMount = await createNewMount(newName);
    setMountsList((prev) => [...prev, newMount]);
    switchMount(newMount.id!);
  };

  const removeMount = async (id: number) => {
    await deleteMount(id);
    const updated = mountsList.filter(m => m.id !== id);
    setMountsList(updated);
    
    if (activeMountId === id) {
      if (updated.length > 0) {
        switchMount(updated[0].id!);
      } else {
        const newMount = await createNewMount('Default Mount');
        setMountsList([newMount]);
        switchMount(newMount.id!);
      }
    }
  };

  const renameMount = async (id: number, newName: string) => {
    await updateMount(id, { name: newName });
    setMountsList((prev) => 
      prev.map(m => m.id === id ? { ...m, name: newName } : m)
    );
  };

  const updateAnyMount = async (id: number, changes: Partial<SavedMount>) => {
    await updateMount(id, changes);
    setMountsList((prev) => 
      prev.map(m => m.id === id ? { ...m, ...changes } : m)
    );

    if (id === activeMountId) {
      if (changes.currentLevel !== undefined) setCurrentLevel(changes.currentLevel);
      if (changes.stats !== undefined) setMountStats(changes.stats);
    }
  };

  const importAllMounts = async (mounts: Omit<SavedMount, 'id'>[]) => {
    const newMounts = await replaceAllMounts(mounts);
    setMountsList(newMounts);
    if (newMounts.length > 0) {
      switchMount(newMounts[0].id!);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMountId = urlParams.get('mountId');
      if (urlMountId) {
        const id = parseInt(urlMountId, 10);
        if (id !== activeMountId) {
           const target = mountsList.find(m => m.id === id);
           if (target) {
              setActiveMountId(target.id!);
              setCurrentLevel(target.currentLevel || 1);
              setMountStats(target.stats || createDefaultStats());
              localStorage.setItem('lastActiveMountId', target.id!.toString());
           }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mountsList, activeMountId, setActiveMountId, setCurrentLevel, setMountStats]);

  return {
    isAppReady,
    mountsList,
    activeMountId,
    switchMount,
    addMount,
    removeMount,
    renameMount,
    updateAnyMount,
    importAllMounts,
  };
}
