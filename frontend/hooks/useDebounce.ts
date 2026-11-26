"use client";

import { useEffect } from "react";

/** Runs an effect after the callback has stayed unchanged for the delay. */
export function useDebounce(
  callback: (signal: AbortSignal) => void,
  delay: number,
) {
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => callback(controller.signal), delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [callback, delay]);
}
