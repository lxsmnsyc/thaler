import seroval, { ServerValue } from 'seroval';
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
  fromFormData,
  fromURLSearchParams,
  FunctionBody,
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
type FunctionHandlerRegistration<T extends ServerValue, R extends ServerValue> =
  [type: 'fn', id: string, callback: ThalerFnHandler<T, R>];
type PureHandlerRegistration<T extends ServerValue, R extends ServerValue> =
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

let SCOPE: ServerValue[] | undefined;

function runWithScope<T>(scope: ServerValue[], callback: () => T): T {
  const parent = SCOPE;
  SCOPE = scope;
  try {
    return callback();
  } finally {
    SCOPE = parent;
  }
}

async function fnHandler<T extends ServerValue, R extends ServerValue>(
  id: string,
  callback: ThalerFnHandler<T, R>,
  scope: ServerValue[],
  value: T,
  init: RequestInit = {},
) {
  patchHeaders(init, 'fn');
  return runWithScope(scope, () => {
    const request = new Request(id, {
      ...init,
      method: 'POST',
      body: serializeFunctionBody({ scope, value }),
    });
    return callback(value, request);
  });
}

async function pureHandler<T extends ServerValue, R extends ServerValue>(
  id: string,
  callback: ThalerPureHandler<T, R>,
  value: T,
  init: RequestInit = {},
) {
  patchHeaders(init, 'fn');
  const request = new Request(id, {
    ...init,
    method: 'POST',
    body: seroval(value),
  });
  return callback(value, request);
}

export function $$scope(): ServerValue[] {
  return SCOPE!;
}

export function $$clone(
  [type, id, callback]: HandlerRegistration,
  scope: ServerValue[],
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
      return Object.assign(pureHandler.bind(null, id, callback, scope), {
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
          // eslint-disable-next-line no-eval
          const { scope, value } = (0, eval)(await request.text()) as FunctionBody;
          const result = await runWithScope(scope, () => callback(value, request));
          const serialized = seroval(result);
          return new Response(serialized, {
            headers: {
              'Content-Type': 'text/plain',
            },
            status: 200,
          });
        }
        case 'pure': {
          // eslint-disable-next-line no-eval
          const value = (0, eval)(await request.text());
          const result = await callback(value, request);
          const serialized = seroval(result);
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
