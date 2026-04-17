import { useEffect, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { db } from '../db';
import { activeMountIdAtom } from '../store/mountStore';
import { kanbanDataAtom, isKanbanReadyAtom, INITIAL_KANBAN_DATA } from '../store/feedingStore';

export function useKanbanSync() {
  const activeMountId = useAtomValue(activeMountIdAtom);
  const [data, setData] = useAtom(kanbanDataAtom);
  const [isReady, setIsReady] = useAtom(isKanbanReadyAtom);
  const lastMountIdRef = useRef<number | null>(null);

  // 1. Load data when activeMountId changes
  useEffect(() => {
    if (!activeMountId) return;
    
    // Prevent reload if mountId hasn't changed (e.g. initial mount)
    if (lastMountIdRef.current === activeMountId) return;

    const loadData = async () => {
      setIsReady(false);
      const state = await db.kanbans.get(activeMountId);
      
      if (state) {
        setData(state.data);
      } else {
        // Initialize new kanban state for this mount
        const newState = { mountId: activeMountId, data: INITIAL_KANBAN_DATA };
        await db.kanbans.add(newState);
        setData(INITIAL_KANBAN_DATA);
      }
      
      lastMountIdRef.current = activeMountId;
      setIsReady(true);
    };

    loadData();
  }, [activeMountId, setData, setIsReady]);

  // 2. Persist data when it changes
  useEffect(() => {
    if (!isReady || !activeMountId) return;

    const timer = setTimeout(async () => {
      await db.kanbans.put({ mountId: activeMountId, data });
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [data, activeMountId, isReady]);

  return { isReady };
}
