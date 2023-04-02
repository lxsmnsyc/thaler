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

export function debounce<T extends any[], R>(
  callback: (...args: T) => Promise<R>,
  options: DebounceOptions<T>,
): (...args: T) => Promise<R> {
  const cache = new Map<string, DebounceData<R>>();

  function resolveData(current: DebounceData<R>, key: string, args: T) {
    try {
      callback.apply(callback, args).then(
        (value) => {
          current.deferred.resolve(value);
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

  return (...args: T) => {
    const key = options.key(...args);
    const current = cache.get(key);
    if (current) {
      clearTimeout(current.timeout);
      current.timeout = setTimeout(
        () => resolveData(current, key, args),
        options.timeout || DEFAULT_DEBOUNCE_TIMEOUT,
      );
      return current.deferred.promise;
    }
    const record: DebounceData<R> = {
      deferred: createDeferred(),
      timeout: setTimeout(
        () => resolveData(record, key, args),
        options.timeout || DEFAULT_DEBOUNCE_TIMEOUT,
      ),
    };
    cache.set(key, record);
    return record.deferred.promise;
  };
}

export interface ThrottleOptions<T extends any[]> {
  key: (...args: T) => string;
}

interface ThrottleData<R> {
  deferred: Deferred<R>;
}

export function throttle<T extends any[], R>(
  callback: (...args: T) => Promise<R>,
  options: ThrottleOptions<T>,
): (...args: T) => Promise<R> {
  const cache = new Map<string, ThrottleData<R>>();

  function resolveData(current: ThrottleData<R>, key: string, args: T) {
    try {
      callback.apply(callback, args).then(
        (value) => {
          current.deferred.resolve(value);
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

  return (...args: T) => {
    const key = options.key(...args);
    const current = cache.get(key);
    if (current) {
      return current.deferred.promise;
    }
    const record: ThrottleData<R> = {
      deferred: createDeferred(),
    };
    cache.set(key, record);
    resolveData(record, key, args);
    return record.deferred.promise;
  };
}
