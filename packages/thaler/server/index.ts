import { deserialize, serializeAsync } from 'seroval';
import {
  ThalerValue,
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
type FunctionHandlerRegistration<T extends ThalerValue, R extends ThalerValue> =
  [type: 'fn', id: string, callback: ThalerFnHandler<T, R>];
type PureHandlerRegistration<T extends ThalerValue, R extends ThalerValue> =
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

async function serverHandler(
  id: string,
  callback: ThalerServerHandler,
  init: RequestInit,
) {
  patchHeaders(init, 'server');
  const request = new Request(id, init);
  return callback(request);
}

async function actionHandler<P extends ThalerPostParam>(
  id: string,
  callback: ThalerPostHandler<P>,
  formData: P,
  init: RequestInit = {},
) {
  patchHeaders(init, 'post');
  const request = new Request(id, {
    ...init,
    method: 'POST',
    body: toFormData(formData),
  });
  return callback(formData, request);
}

async function getHandler<P extends ThalerGetParam>(
  id: string,
  callback: ThalerGetHandler<P>,
  search: P,
  init: RequestInit = {},
) {
  patchHeaders(init, 'get');
  const request = new Request(`${id}?${toURLSearchParams(search).toString()}`, {
    ...init,
    method: 'GET',
  });
  return callback(search, request);
}

let SCOPE: ThalerValue[] | undefined;

function runWithScope<T>(scope: () => ThalerValue[], callback: () => T): T {
  const parent = SCOPE;
  SCOPE = scope();
  try {
    return callback();
  } finally {
    SCOPE = parent;
  }
}

async function fnHandler<T extends ThalerValue, R extends ThalerValue>(
  id: string,
  callback: ThalerFnHandler<T, R>,
  scope: () => ThalerValue[],
  value: T,
  init: RequestInit = {},
) {
  patchHeaders(init, 'fn');
  return runWithScope(scope, async () => {
    const request = new Request(id, {
      ...init,
      method: 'POST',
      body: await serializeFunctionBody({ scope, value }),
    });
    return callback(value, request);
  });
}

async function pureHandler<T extends ThalerValue, R extends ThalerValue>(
  id: string,
  callback: ThalerPureHandler<T, R>,
  value: T,
  init: RequestInit = {},
) {
  patchHeaders(init, 'fn');
  const request = new Request(id, {
    ...init,
    method: 'POST',
    body: await serializeAsync(value),
  });
  return callback(value, request);
}

export function $$scope(): ThalerValue[] {
  return SCOPE!;
}

export function $$clone(
  [type, id, callback]: HandlerRegistration,
  scope: () => ThalerValue[],
): ThalerFunctions {
  switch (type) {
    case 'server':
      return Object.assign(serverHandler.bind(null, id, callback), {
        type,
        id,
      });
    case 'post':
      return Object.assign(actionHandler.bind(null, id, callback), {
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
            request,
          );
        case 'get':
          return await callback(
            fromURLSearchParams(url.searchParams),
            request,
          );
        case 'fn': {
          const { scope, value } = deserialize<DeserializedFunctionBody>(await request.text());
          const result = await runWithScope(() => scope, () => callback(value, request));
          const serialized = await serializeAsync(result);
          return new Response(serialized, {
            headers: {
              'Content-Type': 'text/plain',
            },
            status: 200,
          });
        }
        case 'pure': {
          const value = deserialize(await request.text());
          const result = await callback(value, request);
          const serialized = await serializeAsync(result);
          return new Response(serialized, {
            headers: {
              'Content-Type': 'text/plain',
            },
            status: 200,
          });
        }
        default:
          throw new Error('unexpected type');
      }
    } catch (error) {
      return new Response(`function "${id}" threw an unhandled server-side error.`, {
        status: 500,
      });
    }
  }
  return undefined;
}
