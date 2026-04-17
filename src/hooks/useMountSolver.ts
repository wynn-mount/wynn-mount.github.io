import { useRef, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { isCalculatingAtom, solverResultAtom } from '../store/mountStore';
import { SavedMount, SolverResult } from '../types';

export function useMountSolver() {
  const [isCalculating, setIsCalculating] = useAtom(isCalculatingAtom);
  const [, setSolverResult] = useAtom(solverResultAtom);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const runSolver = useCallback((mount: SavedMount, matrixData: any) => {
    setIsCalculating(true);

    workerRef.current?.terminate();
    workerRef.current = new Worker(new URL('../solver.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent<SolverResult>) => {
      setSolverResult(e.data);
      setIsCalculating(false);
      workerRef.current?.terminate();
    };

    workerRef.current.postMessage({
      currentLevel: mount.currentLevel,
      stats: mount.stats,
      matrixData
    });
  }, [setIsCalculating, setSolverResult]);

  return { isCalculating, runSolver };
}