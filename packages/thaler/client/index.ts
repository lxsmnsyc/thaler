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
  patchHeaders(init, type);
  let root = new Request(id, init);
  for (const intercept of INTERCEPTORS) {
    // eslint-disable-next-line no-await-in-loop
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
  return serverHandler('post', id, {
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
  return serverHandler('get', `${id}?${toURLSearchParams(search).toString()}`, {
    ...init,
    method: 'GET',
  });
}

async function deserializeResponse<R>(
  id: string,
  response: Response,
): Promise<R> {
  if (response.ok) {
    return deserialize<R>(await response.text());
  }
  if (import.meta.env.DEV) {
    throw deserialize(await response.text());
  }
  throw new ThalerError(id);
}

async function fnHandler<T, R>(
  id: string,
  scope: () => unknown[],
  value: T,
  init: ThalerFunctionInit = {},
): Promise<R> {
  return deserializeResponse(
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
  return deserializeResponse(
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
  return deserializeResponse<R>(
    id,
    await serverHandler('loader', `${id}?${toURLSearchParams(search).toString()}`, {
      ...init,
      method: 'GET',
    }),
  );
}

async function actionHandler<P extends ThalerPostParam, R>(
  id: string,
  form: P,
  init: ThalerPostInit = {},
): Promise<R> {
  return deserializeResponse<R>(
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
