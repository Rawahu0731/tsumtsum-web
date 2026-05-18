import { useCallback, useEffect, useRef, useState } from 'react';
import { formatTimeFromMs } from '../utils/format';

export function useStopwatch() {
  const [timeMs, setTimeMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startRef = useRef<number | null>(null);
  const accRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    const now = performance.now();
    const elapsed = accRef.current + (startRef.current ? now - startRef.current : 0);
    setTimeMs(Math.floor(elapsed));
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    startRef.current = performance.now();
    intervalRef.current = window.setInterval(tick, 30);
  }, [isRunning, tick]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    const now = performance.now();
    if (startRef.current != null) {
      accRef.current += now - startRef.current;
    }
    startRef.current = null;
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, [isRunning]);

  const reset = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startRef.current = null;
    accRef.current = 0;
    setTimeMs(0);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    timeMs,
    timeLabel: formatTimeFromMs(timeMs),
    isRunning,
    start,
    pause,
    reset,
  };
}
