import { useCallback, useEffect, useState } from 'react';

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((e) => !cancelled && setState({ data: null, error: e.message, loading: false }));
    return () => {
      cancelled = true;
    };
  }, deps);

  useEffect(() => run(), [run]);

  return {
    ...state,
    reload: run,
    setData: (data: T) => setState((s) => ({ ...s, data })),
  };
}

/** "2026-10-14" -> "Wednesday, October 14" (or short month). */
export function formatDay(day: string, month: 'long' | 'short' = 'long') {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month,
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Returns `value` only after it has stopped changing for `ms` (use for search-as-you-type). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
