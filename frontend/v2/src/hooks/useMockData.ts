import { useCallback, useEffect, useState } from "react";

/**
 * Tiny fetch-state hook for the mock API layer.
 * Exposes { data, loading, error, retry } so pages can render
 * skeleton loaders, error blocks, and empty states instead of blank screens.
 */
export function useMockData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loader()
      .then((res) => alive && setData(res))
      .catch((err) => {
        if (!alive) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Something went wrong while loading.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { data, loading, error, retry, setData };
}

export default useMockData;
