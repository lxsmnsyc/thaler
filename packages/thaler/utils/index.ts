export function json<T>(data: T, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    ...init,
    headers: {
      ...init.headers,
      'Content-Type': 'application/json',
    },
  });
}

export function text(data: string, init: ResponseInit = {}): Response {
  return new Response(data, {
    status: 200,
    ...init,
    headers: {
      ...init.headers,
      'Content-Type': 'text/plain',
    },
  });
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(value: unknown): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void;
  let reject: (value: unknown) => void;

  return {
    promise: new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    }),
    resolve(value) {
      resolve(value);
    },
    reject(value) {
      reject(value);
    },
  };
}

const DEFAULT_DEBOUNCE_TIMEOUT = 250;

export interface DebounceOptions<T extends any[]> {
  timeout?: number;
  key: (...args: T) => string;
}

interface DebounceData<R> {
  deferred: Deferred<R>;
  timeout: ReturnType<typeof setTimeout>;
}

export function debounce<T extends ((...args: any[]) => Promise<any>)>(
  callback: T,
  options: DebounceOptions<Parameters<T>>,
): T {
  const cache = new Map<string, DebounceData<ReturnType<T>>>();

  function resolveData(current: DebounceData<ReturnType<T>>, key: string, args: Parameters<T>) {
    try {
      callback.apply(callback, args).then(
        (value) => {
          current.deferred.resolve(value as ReturnType<T>);
          cache.delete(key);
        },
        (value) => {
          current.deferred.reject(value);
          cache.delete(key);
        },
      );
    } catch (err) {
      current.deferred.reject(err);
      cache.delete(key);
    }
  }

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = options.key(...args);
    let current = cache.get(key);
    if (current) {
      clearTimeout(current.timeout);
      current.timeout = setTimeout(
        () => resolveData(current!, key, args),
        options.timeout || DEFAULT_DEBOUNCE_TIMEOUT,
      );
    } else {
      const record: DebounceData<ReturnType<T>> = {
        deferred: createDeferred(),
        timeout: setTimeout(
          () => resolveData(record, key, args),
          options.timeout || DEFAULT_DEBOUNCE_TIMEOUT,
        ),
      };
      current = record;
    }
    cache.set(key, current);
    return current.deferred.promise as ReturnType<T>;
  }) as unknown as T;
}

export interface ThrottleOptions<T extends any[]> {
  key: (...args: T) => string;
}

interface ThrottleData<R> {
  deferred: Deferred<R>;
}

export function throttle<T extends ((...args: any[]) => Promise<any>)>(
  callback: T,
  options: ThrottleOptions<Parameters<T>>,
): T {
  const cache = new Map<string, ThrottleData<ReturnType<T>>>();

  function resolveData(current: ThrottleData<ReturnType<T>>, key: string, args: Parameters<T>) {
    try {
      callback.apply(callback, args).then(
        (value) => {
          current.deferred.resolve(value as ReturnType<T>);
          cache.delete(key);
        },
        (value) => {
          current.deferred.reject(value);
          cache.delete(key);
        },
      );
    } catch (err) {
      current.deferred.reject(err);
      cache.delete(key);
    }
  }

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = options.key(...args);
    const current = cache.get(key);
    if (current) {
      return current.deferred.promise as ReturnType<T>;
    }
    const record: ThrottleData<ReturnType<T>> = {
      deferred: createDeferred(),
    };
    cache.set(key, record);
    resolveData(record, key, args);
    return record.deferred.promise as ReturnType<T>;
  }) as unknown as T;
}

export interface RetryOptions<T extends any[]> {
  key: (...args: T) => string;
  count?: number;
  interval?: number;
}

interface RetryData<R> {
  deferred: Deferred<R>;
  timeout?: ReturnType<typeof setTimeout>;
}

const DEFAULT_RETRY_INTERVAL = 5000;
const INITIAL_RETRY_INTERVAL = 10;

export function retry<T extends ((...args: any[]) => Promise<any>)>(
  callback: T,
  options: RetryOptions<Parameters<T>>,
): T {
  const cache = new Map<string, RetryData<ReturnType<T>>>();

  function resolveData(
    current: RetryData<ReturnType<T>>,
    key: string,
    args: Parameters<T>,
  ) {
    function backoff(timeout: number, count: number) {
      function handleError(reason: unknown) {
        if (options.count != null && options.count <= count) {
          current.deferred.reject(reason);
          cache.delete(key);
        } else {
          current.timeout = setTimeout(() => {
            backoff(
              Math.max(
                INITIAL_RETRY_INTERVAL,
                Math.min(
                  options.interval || DEFAULT_RETRY_INTERVAL,
                  timeout * 2,
                ),
              ),
              count + 1,
            );
          }, timeout);
        }
      }
      try {
        callback.apply(callback, args).then(
          (value) => {
            current.deferred.resolve(value as ReturnType<T>);
            cache.delete(key);
          },
          handleError,
        );
      } catch (err) {
        handleError(err);
      }
    }
    backoff(INITIAL_RETRY_INTERVAL, 0);
  }

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = options.key(...args);
    let current = cache.get(key);
    if (current) {
      clearTimeout(current.timeout);
      current.timeout = undefined;
    } else {
      current = {
        deferred: createDeferred(),
      };
    }
    cache.set(key, current);
    resolveData(current, key, args);
    return current.deferred.promise as ReturnType<T>;
  }) as unknown as T;
}
