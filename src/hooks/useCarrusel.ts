import { useCallback, useEffect, useRef, useState } from "react";

export function useCarrusel(totalItems: number, delay = 7000) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  // sincroniza ref con state para usarlo dentro del interval
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (totalItems <= 1) return;
    const timer = window.setInterval(() => {
      if (!pausedRef.current) {
        setIndex((c) => (c + 1) % totalItems);
      }
    }, delay);
    return () => window.clearInterval(timer);
  }, [delay, totalItems]);

  const next     = useCallback(() => setIndex((c) => (c + 1) % totalItems), [totalItems]);
  const previous = useCallback(() => setIndex((c) => (c - 1 + totalItems) % totalItems), [totalItems]);
  const pause    = useCallback(() => setPaused(true), []);
  const resume   = useCallback(() => setPaused(false), []);

  return { index, setIndex, next, previous, pause, resume };
}