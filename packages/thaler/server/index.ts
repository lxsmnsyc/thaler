import {
  createReference,
  fromJSON,
  serializeAsync,
  toJSONAsync,
} from 'seroval';
import {
  ThalerPostHandler,
  ThalerPostParam,
  ThalerFnHandler,
  ThalerFunctions,
  ThalerGetHandler,
  ThalerGetParam,
  ThalerPureHandler,
  ThalerServerHandler,
} from '../shared/types';
import {
  DeserializedFunctionBody,
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

type HandlerRegistration =
  | ServerHandlerRegistration
  | GetHandlerRegistration<any>
  | PostHandlerRegistration<any>
  | FunctionHandlerRegistration<any, any>
  | PureHandlerRegistration<any, any>;

const REGISTRATIONS = new Map<string, HandlerRegistration>();

export function $$register(
  ...registration: HandlerRegistration
): HandlerRegistration {
  const url = new URL(registration[1]);
  REGISTRATIONS.set(url.pathname, registration);
  return registration;
}

function createResponseInit(): Required<ResponseInit> {
  return {
    headers: {
      'Content-Type': 'text/plain',
    },
    status: 200,
    statusText: 'OK',
  };
}

async function serverHandler(
  id: string,
  callback: ThalerServerHandler,
  init: RequestInit,
) {
  patchHeaders(init, 'server');
  return callback(new Request(id, init));
}

async function postHandler<P extends ThalerPostParam>(
  id: string,
  callback: ThalerPostHandler<P>,
  formData: P,
  init: RequestInit = {},
) {
  patchHeaders(init, 'post');
  return callback(formData, {
    request: new Request(id, {
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
) {
  patchHeaders(init, 'get');
  return callback(search, {
    request: new Request(`${id}?${toURLSearchParams(search).toString()}`, {
      ...init,
      method: 'GET',
    }),
  });
}

let SCOPE: unknown[] | undefined;

function runWithScope<T>(scope: () => unknown[], callback: () => T): T {
  const parent = SCOPE;
  SCOPE = scope();
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
) {
  patchHeaders(init, 'fn');
  return runWithScope(scope, async () => callback(value, {
    request: new Request(id, {
      ...init,
      method: 'POST',
      body: await serializeFunctionBody({ scope, value }),
    }),
    response: createResponseInit(),
  }));
}

async function pureHandler<T, R>(
  id: string,
  callback: ThalerPureHandler<T, R>,
  value: T,
  init: RequestInit = {},
) {
  patchHeaders(init, 'pure');
  return callback(value, {
    request: new Request(id, {
      ...init,
      method: 'POST',
      body: JSON.stringify(await toJSONAsync(value)),
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
          const { scope, value } = fromJSON<DeserializedFunctionBody>(await request.json());
          const response = createResponseInit();
          const result = await runWithScope(
            () => scope,
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
