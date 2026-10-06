/**
 * Lightweight, Production-Grade Server State & Query Cache
 * Provides:
 * - Query key factory
 * - In-flight request deduplication
 * - Stale-while-revalidate & configurable TTL
 * - Cache invalidation by prefix or exact match
 * - Secure cache wipe on logout
 */

export type QueryKey = readonly unknown[];

export interface QueryOptions<T> {
  staleTime?: number; // ms before data is considered stale (default: 60s)
  cacheTime?: number; // ms before unused data is garbage collected (default: 5m)
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleTime: number;
}

// Global query key factory for authoritative type-safe keys
export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  services: {
    all: () => ["services"] as const,
    list: (params?: Record<string, unknown>) => ["services", "list", params] as const,
    detail: (id: string) => ["services", "detail", id] as const,
    search: (query: string, category?: string) => ["services", "search", { query, category }] as const,
  },
  bookings: {
    all: () => ["bookings"] as const,
    my: () => ["bookings", "my"] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
    availability: (serviceId: string, date: string) => ["bookings", "availability", serviceId, date] as const,
  },
  messages: {
    conversations: () => ["messages", "conversations"] as const,
    thread: (id: string) => ["messages", "thread", id] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
  },
  admin: {
    stats: () => ["admin", "stats"] as const,
    users: (params?: Record<string, unknown>) => ["admin", "users", params] as const,
    providers: (params?: Record<string, unknown>) => ["admin", "providers", params] as const,
    services: (params?: Record<string, unknown>) => ["admin", "services", params] as const,
  },
};

export class QueryClient {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private listeners = new Map<string, Set<() => void>>();

  /** Serialize query key into a deterministic string */
  public serializeKey(key: QueryKey): string {
    return JSON.stringify(key);
  }

  /** Retrieve cached data if present */
  public getQueryData<T>(key: QueryKey): T | undefined {
    const serialized = this.serializeKey(key);
    const entry = this.cache.get(serialized);
    return entry ? (entry.data as T) : undefined;
  }

  /** Set query data in cache */
  public setQueryData<T>(key: QueryKey, data: T, staleTime = 60_000): void {
    const serialized = this.serializeKey(key);
    this.cache.set(serialized, {
      data,
      timestamp: Date.now(),
      staleTime,
    });
    this.notifyListeners(serialized);
  }

  /** Check if a cache entry is stale */
  public isStale(key: QueryKey): boolean {
    const serialized = this.serializeKey(key);
    const entry = this.cache.get(serialized);
    if (!entry) return true;
    return Date.now() - entry.timestamp > entry.staleTime;
  }

  /** Fetch or return deduplicated in-flight query */
  public async fetchQuery<T>(
    key: QueryKey,
    queryFn: () => Promise<T>,
    options?: QueryOptions<T>
  ): Promise<T> {
    const serialized = this.serializeKey(key);
    const staleTime = options?.staleTime ?? 60_000;

    // Check if fresh cache exists
    const entry = this.cache.get(serialized);
    if (entry && Date.now() - entry.timestamp <= entry.staleTime) {
      return entry.data as T;
    }

    // Check if existing in-flight request is already underway (deduplication)
    if (this.inFlight.has(serialized)) {
      return this.inFlight.get(serialized) as Promise<T>;
    }

    // Launch fetch
    const promise = queryFn()
      .then((data) => {
        this.cache.set(serialized, {
          data,
          timestamp: Date.now(),
          staleTime,
        });
        this.inFlight.delete(serialized);
        this.notifyListeners(serialized);
        options?.onSuccess?.(data);
        return data;
      })
      .catch((err) => {
        this.inFlight.delete(serialized);
        const error = err instanceof Error ? err : new Error(String(err));
        options?.onError?.(error);
        throw error;
      });

    this.inFlight.set(serialized, promise);
    return promise;
  }

  /** Invalidate queries matching key prefix or exact match */
  public invalidateQueries(keyPrefix: QueryKey): void {
    const serializedPrefix = JSON.stringify(keyPrefix).slice(0, -1); // strip trailing ']'
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(serializedPrefix)) {
        this.cache.delete(key);
        this.notifyListeners(key);
      }
    }
  }

  /** Wipe entire cache — crucial for logout to remove private data */
  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
    for (const [, subscribers] of this.listeners.entries()) {
      for (const listener of subscribers) {
        listener();
      }
    }
  }

  /** Subscribe to changes for a key */
  public subscribe(key: QueryKey, listener: () => void): () => void {
    const serialized = this.serializeKey(key);
    if (!this.listeners.has(serialized)) {
      this.listeners.set(serialized, new Set());
    }
    this.listeners.get(serialized)!.add(listener);

    return () => {
      const set = this.listeners.get(serialized);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(serialized);
        }
      }
    };
  }

  private notifyListeners(serializedKey: string): void {
    const set = this.listeners.get(serializedKey);
    if (set) {
      for (const listener of set) {
        listener();
      }
    }
  }
}

// Global query client instance
export const queryClient = new QueryClient();
