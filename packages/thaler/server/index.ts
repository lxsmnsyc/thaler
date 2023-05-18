import {
  createReference,
  fromJSON,
  serializeAsync,
  toJSONAsync,
} from 'seroval';
import type {
  ThalerPostHandler,
  ThalerPostParam,
  ThalerFnHandler,
  ThalerFunctions,
  ThalerGetHandler,
  ThalerGetParam,
  ThalerPureHandler,
  ThalerServerHandler,
  ThalerActionHandler,
  ThalerLoaderHandler,
  ThalerResponseInit,
} from '../shared/types';
import type { FunctionBody } from '../shared/utils';
import {
  fromFormData,
  fromURLSearchParams,
  patchHeaders,
  serializeFunctionBody,
  toFormData,
  toURLSearchParams,
} from '../shared/utils';

type ServerHandlerRegistration = [type: 'server', id: string, callback: ThalerServerHandler];
type GetHandlerRegistration<P extends ThalerGetParam> =
  [type: 'get', id: string, callback: ThalerGetHandler<P>];
type PostHandlerRegistration<P extends ThalerPostParam> =
  [type: 'post', id: string, callback: ThalerPostHandler<P>];
type FunctionHandlerRegistration<T, R> =
  [type: 'fn', id: string, callback: ThalerFnHandler<T, R>];
type PureHandlerRegistration<T, R> =
  [type: 'pure', id: string, callback: ThalerPureHandler<T, R>];
type LoaderHandlerRegistration<P extends ThalerGetParam, R> =
  [type: 'loader', id: string, callback: ThalerLoaderHandler<P, R>];
type ActionHandlerRegistration<P extends ThalerPostParam, R> =
  [type: 'action', id: string, callback: ThalerActionHandler<P, R>];

type HandlerRegistration =
  | ServerHandlerRegistration
  | GetHandlerRegistration<any>
  | PostHandlerRegistration<any>
  | FunctionHandlerRegistration<any, any>
  | PureHandlerRegistration<any, any>
  | LoaderHandlerRegistration<any, any>
  | ActionHandlerRegistration<any, any>;

const REGISTRATIONS = new Map<string, HandlerRegistration>();

export function $$register(
  ...registration: HandlerRegistration
): HandlerRegistration {
  REGISTRATIONS.set(registration[1], registration);
  return registration;
}

function createResponseInit(): ThalerResponseInit {
  return {
    headers: new Headers({
      'Content-Type': 'text/plain',
    }),
    status: 200,
    statusText: 'OK',
  };
}

function normalizeURL(id: string): URL {
  return new URL(id, 'http://localhost');
}

async function serverHandler(
  id: string,
  callback: ThalerServerHandler,
  init: RequestInit,
): Promise<Response> {
  patchHeaders(init, 'server');
  return callback(new Request(normalizeURL(id), init));
}

async function postHandler<P extends ThalerPostParam>(
  id: string,
  callback: ThalerPostHandler<P>,
  formData: P,
  init: RequestInit = {},
): Promise<Response> {
  patchHeaders(init, 'post');
  return callback(formData, {
    request: new Request(normalizeURL(id), {
      ...init,
      method: 'POST',
      body: toFormData(formData),
    }),
  });
}

async function getHandler<P extends ThalerGetParam>(
  id: string,
  callback: ThalerGetHandler<P>,
  search: P,
  init: RequestInit = {},
): Promise<Response> {
  patchHeaders(init, 'get');
  return callback(search, {
    request: new Request(`${id}?${toURLSearchParams(search).toString()}`, {
      ...init,
      method: 'GET',
    }),
  });
}

let SCOPE: unknown[] | undefined;

function runWithScope<T>(scope: unknown[], callback: () => T): T {
  const parent = SCOPE;
  SCOPE = scope;
  try {
    return callback();
  } finally {
    SCOPE = parent;
  }
}

async function fnHandler<T, R>(
  id: string,
  callback: ThalerFnHandler<T, R>,
  scope: () => unknown[],
  value: T,
  init: RequestInit = {},
): Promise<R> {
  patchHeaders(init, 'fn');
  const currentScope = scope();
  const body = await serializeFunctionBody({
    scope: currentScope,
    value,
  });
  return runWithScope(currentScope, async () => callback(value, {
    request: new Request(normalizeURL(id), {
      ...init,
      method: 'POST',
      body,
    }),
    response: createResponseInit(),
  }));
}

async function pureHandler<T, R>(
  id: string,
  callback: ThalerPureHandler<T, R>,
  value: T,
  init: RequestInit = {},
): Promise<R> {
  patchHeaders(init, 'pure');
  return callback(value, {
    request: new Request(normalizeURL(id), {
      ...init,
      method: 'POST',
      body: JSON.stringify(await toJSONAsync(value)),
    }),
    response: createResponseInit(),
  });
}

async function loaderHandler<P extends ThalerGetParam, R>(
  id: string,
  callback: ThalerLoaderHandler<P, R>,
  search: P,
  init: RequestInit = {},
): Promise<R> {
  patchHeaders(init, 'loader');
  return callback(search, {
    request: new Request(`${id}?${toURLSearchParams(search).toString()}`, {
      ...init,
      method: 'GET',
    }),
    response: createResponseInit(),
  });
}

async function actionHandler<P extends ThalerPostParam, R>(
  id: string,
  callback: ThalerActionHandler<P, R>,
  formData: P,
  init: RequestInit = {},
): Promise<R> {
  patchHeaders(init, 'action');
  return callback(formData, {
    request: new Request(normalizeURL(id), {
      ...init,
      method: 'POST',
      body: toFormData(formData),
    }),
    response: createResponseInit(),
  });
}

export function $$scope(): unknown[] {
  return SCOPE!;
}

export function $$clone(
  [type, id, callback]: HandlerRegistration,
  scope: () => unknown[],
): ThalerFunctions {
  switch (type) {
    case 'server':
      return Object.assign(serverHandler.bind(null, id, callback), {
        type,
        id,
      });
    case 'post':
      return Object.assign(postHandler.bind(null, id, callback), {
        type,
        id,
      });
    case 'get':
      return Object.assign(getHandler.bind(null, id, callback), {
        type,
        id,
      });
    case 'fn':
      return Object.assign(fnHandler.bind(null, id, callback, scope), {
        type,
        id,
      });
    case 'pure':
      return Object.assign(pureHandler.bind(null, id, callback), {
        type,
        id,
      });
    case 'loader':
      return Object.assign(loaderHandler.bind(null, id, callback), {
        type,
        id,
      });
    case 'action':
      return Object.assign(actionHandler.bind(null, id, callback), {
        type,
        id,
      });
    default:
      throw new Error('unknown registration type');
  }
}

export async function handleRequest(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const registration = REGISTRATIONS.get(url.pathname);
  if (registration) {
    const [type, id, callback] = registration;

    try {
      switch (type) {
        case 'server':
          return await callback(request);
        case 'post':
          return await callback(
            fromFormData(await request.formData()),
            { request },
          );
        case 'get':
          return await callback(
            fromURLSearchParams(url.searchParams),
            { request },
          );
        case 'fn': {
          const { scope, value } = fromJSON<FunctionBody>(await request.json());
          const response = createResponseInit();
          const result = await runWithScope(
            scope,
            () => callback(value, {
              request,
              response,
            }),
          );
          const serialized = await serializeAsync(result);
          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'text/plain');
          return new Response(serialized, {
            headers,
            status: response.status,
            statusText: response.statusText,
          });
        }
        case 'pure': {
          const value = fromJSON(await request.json());
          const response = createResponseInit();
          const result = await callback(value, { request, response });
          const serialized = await serializeAsync(result);
          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'text/plain');
          return new Response(serialized, {
            headers,
            status: response.status,
            statusText: response.statusText,
          });
        }
        case 'loader': {
          const value = fromURLSearchParams(url.searchParams);
          const response = createResponseInit();
          const result = await callback(value, { request, response });
          const serialized = await serializeAsync(result);
          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'text/plain');
          return new Response(serialized, {
            headers,
            status: response.status,
            statusText: response.statusText,
          });
        }
        case 'action': {
          const value = fromFormData(await request.formData());
          const response = createResponseInit();
          const result = await callback(value, { request, response });
          const serialized = await serializeAsync(result);
          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'text/plain');
          return new Response(serialized, {
            headers,
            status: response.status,
            statusText: response.statusText,
          });
        }
        default:
          throw new Error('unexpected type');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(error);
        return new Response(await serializeAsync(error), {
          status: 500,
        });
      }
      return new Response(`function "${id}" threw an unhandled server-side error.`, {
        status: 500,
      });
    }
  }
  return undefined;
}

export function $$ref<T>(id: string, value: T): T {
  return createReference(`thaler--${id}`, value);
}
