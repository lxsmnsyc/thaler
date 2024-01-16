import { createReference, deserialize, toJSONAsync } from 'seroval';
import ThalerError from '../shared/error';
import type {
  ThalerPostInit,
  ThalerPostParam,
  ThalerFunctionInit,
  ThalerFunctions,
  ThalerFunctionTypes,
  ThalerGetInit,
  ThalerGetParam,
  MaybePromise,
} from '../shared/types';
import {
  XThalerID,
  XThalerInstance,
  patchHeaders,
  serializeFunctionBody,
  toFormData,
  toURLSearchParams,
} from '../shared/utils';

interface HandlerRegistrationResult {
  type: ThalerFunctionTypes;
  id: string;
}

export function $$server(id: string): HandlerRegistrationResult {
  return { type: 'server', id };
}
export function $$post(id: string): HandlerRegistrationResult {
  return { type: 'post', id };
}
export function $$get(id: string): HandlerRegistrationResult {
  return { type: 'get', id };
}
export function $$fn(id: string): HandlerRegistrationResult {
  return { type: 'fn', id };
}
export function $$pure(id: string): HandlerRegistrationResult {
  return { type: 'pure', id };
}
export function $$loader(id: string): HandlerRegistrationResult {
  return { type: 'loader', id };
}
export function $$action(id: string): HandlerRegistrationResult {
  return { type: 'action', id };
}

export type Interceptor = (request: Request) => MaybePromise<Request>;

const INTERCEPTORS: Interceptor[] = [];

export function interceptRequest(callback: Interceptor): void {
  INTERCEPTORS.push(callback);
}

async function serverHandler(
  type: ThalerFunctionTypes,
  id: string,
  init: RequestInit,
): Promise<Response> {
  patchHeaders(type, id, init);
  let root = new Request(id, init);
  for (const intercept of INTERCEPTORS) {
    root = await intercept(root);
  }
  const result = await fetch(root);
  return result;
}

async function postHandler<P extends ThalerPostParam>(
  id: string,
  form: P,
  init: ThalerPostInit = {},
): Promise<Response> {
  return await serverHandler('post', id, {
    ...init,
    method: 'POST',
    body: toFormData(form),
  });
}

async function getHandler<P extends ThalerGetParam>(
  id: string,
  search: P,
  init: ThalerGetInit = {},
): Promise<Response> {
  return await serverHandler(
    'get',
    `${id}?${toURLSearchParams(search).toString()}`,
    {
      ...init,
      method: 'GET',
    },
  );
}

declare const $R: Record<string, unknown>;

class SerovalChunkReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private buffer = '';
  private done = false;

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader();
  }

  async readChunk(): Promise<void> {
    // if there's no chunk, read again
    const chunk = await this.reader.read();
    if (chunk.done) {
      this.done = true;
    } else {
      // repopulate the buffer
      this.buffer += new TextDecoder().decode(chunk.value);
    }
  }

  async next(): Promise<IteratorResult<string>> {
    // Check if the buffer is empty
    if (this.buffer === '') {
      // if we are already done...
      if (this.done) {
        return {
          done: true,
          value: undefined,
        };
      }
      // Otherwise, read a new chunk
      await this.readChunk();
      return await this.next();
    }
    // Read the "byte header"
    // The byte header tells us how big the expected data is
    // so we know how much data we should wait before we
    // deserialize the data
    const bytes = Number.parseInt(this.buffer.substring(1, 11), 16); // ;0x00000000;
    // Check if the buffer has enough bytes to be parsed
    while (bytes > this.buffer.length - 12) {
      // If it's not enough, and the reader is done
      // then the chunk is invalid.
      if (this.done) {
        throw new Error('Malformed server function stream.');
      }
      // Otherwise, we read more chunks
      await this.readChunk();
    }
    // Extract the exact chunk as defined by the byte header
    const partial = this.buffer.substring(12, 12 + bytes);
    // The rest goes to the buffer
    this.buffer = this.buffer.substring(12 + bytes);
    // Deserialize the chunk
    return {
      done: false,
      value: deserialize(partial),
    };
  }

  async drain(): Promise<void> {
    while (true) {
      const result = await this.next();
      if (result.done) {
        break;
      }
    }
  }
}

async function deserializeStream<T>(
  id: string,
  response: Response,
): Promise<T> {
  const instance = response.headers.get(XThalerInstance);
  const target = response.headers.get(XThalerID);
  if (!instance || target !== id) {
    throw new Error(`Invalid response for ${id}.`);
  }
  if (!response.body) {
    throw new Error('missing body');
  }
  const reader = new SerovalChunkReader(response.body);

  const result = await reader.next();

  if (!result.done) {
    reader.drain().then(
      () => {
        delete $R[instance];
      },
      () => {
        // no-op
      },
    );
  }

  if (response.ok) {
    return result.value as T;
  }
  if (import.meta.env.DEV) {
    throw result.value;
  }
  throw new ThalerError(id);
}

async function fnHandler<T, R>(
  id: string,
  scope: () => unknown[],
  value: T,
  init: ThalerFunctionInit = {},
): Promise<R> {
  return deserializeStream(
    id,
    await serverHandler('fn', id, {
      ...init,
      method: 'POST',
      body: await serializeFunctionBody({
        scope: scope(),
        value,
      }),
    }),
  );
}

async function pureHandler<T, R>(
  id: string,
  value: T,
  init: ThalerFunctionInit = {},
): Promise<R> {
  return deserializeStream(
    id,
    await serverHandler('pure', id, {
      ...init,
      method: 'POST',
      body: JSON.stringify(await toJSONAsync(value)),
    }),
  );
}

async function loaderHandler<P extends ThalerGetParam, R>(
  id: string,
  search: P,
  init: ThalerGetInit = {},
): Promise<R> {
  return deserializeStream<R>(
    id,
    await serverHandler(
      'loader',
      `${id}?${toURLSearchParams(search).toString()}`,
      {
        ...init,
        method: 'GET',
      },
    ),
  );
}

async function actionHandler<P extends ThalerPostParam, R>(
  id: string,
  form: P,
  init: ThalerPostInit = {},
): Promise<R> {
  return deserializeStream<R>(
    id,
    await serverHandler('action', id, {
      ...init,
      method: 'POST',
      body: toFormData(form),
    }),
  );
}

export function $$clone(
  { type, id }: HandlerRegistrationResult,
  scope: () => unknown[],
): ThalerFunctions {
  switch (type) {
    case 'server':
      return Object.assign(serverHandler.bind(null, 'server', id), {
        type,
        id,
      });
    case 'post':
      return Object.assign(postHandler.bind(null, id), {
        type,
        id,
      });
    case 'get':
      return Object.assign(getHandler.bind(null, id), {
        type,
        id,
      });
    case 'fn':
      return Object.assign(fnHandler.bind(null, id, scope), {
        type,
        id,
      });
    case 'pure':
      return Object.assign(pureHandler.bind(null, id), {
        type,
        id,
      });
    case 'loader':
      return Object.assign(loaderHandler.bind(null, id), {
        type,
        id,
      });
    case 'action':
      return Object.assign(actionHandler.bind(null, id), {
        type,
        id,
      });
    default:
      throw new Error('unknown registration type');
  }
}

export function $$ref<T>(id: string, value: T): T {
  return createReference(`thaler--${id}`, value);
}
