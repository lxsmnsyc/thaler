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

export interface RetryOptions {
  count?: number;
  interval?: number;
}

const DEFAULT_RETRY_INTERVAL = 5000;
const INITIAL_RETRY_INTERVAL = 10;

export function retry<T extends ((...args: any[]) => Promise<any>)>(
  callback: T,
  options: RetryOptions,
): T {
  const opts = {
    count: options.count == null ? Infinity : options.count,
    interval: options.interval || DEFAULT_RETRY_INTERVAL,
  };
  function resolveData(
    deferred: Deferred<ReturnType<T>>,
    args: Parameters<T>,
  ) {
    function backoff(time: number, count: number) {
      function handleError(reason: unknown) {
        if (opts.count <= count) {
          deferred.reject(reason);
        } else {
          setTimeout(() => {
            backoff(
              Math.max(
                INITIAL_RETRY_INTERVAL,
                Math.min(
                  opts.interval,
                  time * 2,
                ),
              ),
              count + 1,
            );
          }, time);
        }
      }
      try {
        callback.apply(callback, args).then(
          (value) => {
            deferred.resolve(value as ReturnType<T>);
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
    const deferred = createDeferred<ReturnType<T>>();
    resolveData(deferred, args);
    return deferred.promise as ReturnType<T>;
  }) as unknown as T;
}

export function timeout<T extends ((...args: any[]) => Promise<any>)>(
  callback: T,
  ms: number,
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const deferred = createDeferred<ReturnType<T>>();
    const timer = setTimeout(() => {
      deferred.reject(new Error('request timeout'));
    }, ms);

    try {
      callback.apply(callback, args).then(
        (value) => {
          deferred.resolve(value as ReturnType<T>);
          clearTimeout(timer);
        },
        (value) => {
          deferred.reject(value);
          clearTimeout(timer);
        },
      );
    } catch (error) {
      deferred.reject(error);
      clearTimeout(timer);
    }
    return deferred.promise as ReturnType<T>;
  }) as unknown as T;
}
