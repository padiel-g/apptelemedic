import { useState, useEffect, useRef, useCallback } from 'react';

interface PollingOptions {
  interval?: number;
  pause?: boolean;
  deps?: any[];
}

export function usePolling<T>(fetcher: () => Promise<T>, options: PollingOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const { interval = 5000, pause = false, deps = [] } = options;
  const fetcherRef = useRef(fetcher);

  // Update ref when fetcher changes, but avoid re-triggering fetchData if only non-deps change
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const fetchData = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(); // Initial fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...deps]);

  useEffect(() => {
    if (pause) return;

    const timer = setInterval(() => {
      fetchData();
    }, interval);

    return () => clearInterval(timer);
  }, [interval, pause, fetchData]);

  return { data, error, isLoading, lastUpdated, refetch: fetchData };
}
