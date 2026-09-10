import { useState, useEffect, useCallback, useRef } from "react";
import { queryClient, QueryKey, QueryOptions } from "../lib/queryClient";

export interface UseQueryOptions<T> extends QueryOptions<T> {
  refetchOnWindowFocus?: boolean;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: () => Promise<T | undefined>;
}

export function useQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: UseQueryOptions<T>
): UseQueryResult<T> {
  const enabled = options?.enabled ?? true;
  const refetchOnFocus = options?.refetchOnWindowFocus ?? true;

  const [data, setData] = useState<T | undefined>(() => queryClient.getQueryData<T>(queryKey));
  const [isLoading, setIsLoading] = useState<boolean>(() => !queryClient.getQueryData<T>(queryKey) && enabled);
  const [error, setError] = useState<Error | null>(null);

  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(
    async (ignoreCache = false): Promise<T | undefined> => {
      if (!enabled) return undefined;
      setIsLoading(true);
      setError(null);

      try {
        if (ignoreCache) {
          queryClient.invalidateQueries(queryKey);
        }
        const result = await queryClient.fetchQuery(queryKey, queryFnRef.current, optionsRef.current);
        setData(result);
        setIsLoading(false);
        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsLoading(false);
        return undefined;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient.serializeKey(queryKey), enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    // Check if initial fetch or stale fetch is needed
    if (!data || queryClient.isStale(queryKey)) {
      execute();
    }

    // Subscribe to external cache invalidation or updates
    const unsubscribe = queryClient.subscribe(queryKey, () => {
      const cached = queryClient.getQueryData<T>(queryKey);
      if (cached !== undefined) {
        setData(cached);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [execute, queryKey, enabled, data]);

  // Window focus refetching
  useEffect(() => {
    if (!refetchOnFocus || !enabled) return;

    const handleFocus = () => {
      if (queryClient.isStale(queryKey)) {
        execute();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, [execute, queryKey, refetchOnFocus, enabled]);

  return {
    data,
    isLoading,
    isError: error !== null,
    error,
    isStale: queryClient.isStale(queryKey),
    refetch: () => execute(true),
  };
}

export interface UseMutationOptions<TData, TVariables> {
  onMutate?: (variables: TVariables) => void | Promise<unknown>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<unknown>;
  onError?: (error: Error, variables: TVariables) => void | Promise<unknown>;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void | Promise<unknown>;
}

export interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data: TData | undefined;
  reset: () => void;
}

export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TVariables>
): UseMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setData(undefined);
    setIsLoading(false);
    setError(null);
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setError(null);

      try {
        await options?.onMutate?.(variables);
        const result = await mutationFn(variables);
        setData(result);
        setIsLoading(false);
        await options?.onSuccess?.(result, variables);
        await options?.onSettled?.(result, null, variables);
        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsLoading(false);
        await options?.onError?.(errorObj, variables);
        await options?.onSettled?.(undefined, errorObj, variables);
        throw errorObj;
      }
    },
    [mutationFn, options]
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => {
        // Handled in mutateAsync onError callback
      });
    },
    [mutateAsync]
  );

  return {
    mutate,
    mutateAsync,
    isLoading,
    isError: error !== null,
    error,
    data,
    reset,
  };
}
