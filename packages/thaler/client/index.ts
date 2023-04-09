import { createReference, deserialize, toJSONAsync } from 'seroval';
import ThalerError from '../shared/error';
import {
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

type ServerHandlerRegistration = [type: 'server', id: string];
type GetHandlerRegistration = [type: 'get', id: string];
type PostHandlerRegistration = [type: 'post', id: string];
type FunctionHandlerRegistration = [type: 'fn', id: string];
type PureHandlerRegistration = [type: 'pure', id: string];

type HandlerRegistration =
  | ServerHandlerRegistration
  | GetHandlerRegistration
  | PostHandlerRegistration
  | FunctionHandlerRegistration
  | PureHandlerRegistration;

interface HandlerRegistrationResult {
  type: ThalerFunctionTypes;
  id: string;
}

export function $$register(
  ...[type, id]: HandlerRegistration
): HandlerRegistrationResult {
  return { type, id };
}

export type Interceptor = (request: Request) => MaybePromise<Request>;

const INTERCEPTORS: Interceptor[] = [];

export function interceptRequest(callback: Interceptor) {
  INTERCEPTORS.push(callback);
}

async function serverHandler(type: ThalerFunctionTypes, id: string, init: RequestInit) {
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
) {
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
) {
  return serverHandler('get', `${id}?${toURLSearchParams(search).toString()}`, {
    ...init,
    method: 'GET',
  });
}

async function fnHandler<T, R>(
  id: string,
  scope: () => unknown[],
  value: T,
  init: ThalerFunctionInit = {},
): Promise<R> {
  const response = await serverHandler('fn', id, {
    ...init,
    method: 'POST',
    body: await serializeFunctionBody({ scope, value }),
  });
  if (response.ok) {
    return deserialize<R>(await response.text());
  }
  throw new ThalerError(id);
}

async function pureHandler<T, R>(
  id: string,
  value: T,
  init: ThalerFunctionInit = {},
): Promise<R> {
  const response = await serverHandler('pure', id, {
    ...init,
    method: 'POST',
    body: JSON.stringify(await toJSONAsync(value)),
  });
  if (response.ok) {
    return deserialize<R>(await response.text());
  }
  throw new ThalerError(id);
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
    default:
      throw new Error('unknown registration type');
  }
}

export function $$ref<T>(id: string, value: T): T {
  return createReference(id, value);
}
