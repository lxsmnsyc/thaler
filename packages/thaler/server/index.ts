import seroval, { ServerValue } from 'seroval';
import {
  ThalerActionHandler,
  ThalerActionParam,
  ThalerFunctionHandler,
  ThalerFunctions,
  ThalerLoaderHandler,
  ThalerLoaderParam,
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
type LoaderHandlerRegistration<P extends ThalerLoaderParam> =
  [type: 'loader', id: string, callback: ThalerLoaderHandler<P>];
type ActionHandlerRegistration<P extends ThalerActionParam> =
  [type: 'action', id: string, callback: ThalerActionHandler<P>];
type FunctionHandlerRegistration<T extends ServerValue, R extends ServerValue> =
  [type: 'function', id: string, callback: ThalerFunctionHandler<T, R>];

type HandlerRegistration =
  | ServerHandlerRegistration
  | LoaderHandlerRegistration<any>
  | ActionHandlerRegistration<any>
  | FunctionHandlerRegistration<any, any>;

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

async function actionHandler<P extends ThalerActionParam>(
  id: string,
  callback: ThalerActionHandler<P>,
  formData: P,
  init: RequestInit = {},
) {
  patchHeaders(init, 'action');
  const request = new Request(id, {
    ...init,
    method: 'POST',
    body: toFormData(formData),
  });
  return callback(formData, request);
}

async function loaderHandler<P extends ThalerLoaderParam>(
  id: string,
  callback: ThalerLoaderHandler<P>,
  search: P,
  init: RequestInit = {},
) {
  patchHeaders(init, 'loader');
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

async function functionHandler<T extends ServerValue, R extends ServerValue>(
  id: string,
  callback: ThalerFunctionHandler<T, R>,
  scope: ServerValue[],
  value: T,
  init: RequestInit = {},
) {
  patchHeaders(init, 'function');
  return runWithScope(scope, () => {
    const request = new Request(id, {
      ...init,
      method: 'POST',
      body: serializeFunctionBody({ scope, value }),
    });
    return callback(value, request);
  });
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
    case 'action':
      return Object.assign(actionHandler.bind(null, id, callback), {
        type,
        id,
      });
    case 'loader':
      return Object.assign(loaderHandler.bind(null, id, callback), {
        type,
        id,
      });
    case 'function':
      return Object.assign(functionHandler.bind(null, id, callback, scope), {
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
        case 'action':
          return await callback(
            fromFormData(await request.formData()),
            request,
          );
        case 'loader':
          return await callback(
            fromURLSearchParams(url.searchParams),
            request,
          );
        case 'function': {
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
