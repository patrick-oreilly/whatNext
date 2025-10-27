// Polling hook for periodic API calls

import { useEffect, useRef } from 'react';

export const usePolling = (
  callback: () => void | Promise<void>,
  interval: number,
  enabled: boolean = true
) => {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (!enabled) return;

    // Call immediately
    savedCallback.current();

    // Then set up polling
    const id = setInterval(() => savedCallback.current(), interval);

    return () => clearInterval(id);
  }, [interval, enabled]);
};
