import seroval, { ServerValue } from 'seroval';
import {
  ThalerActionHandler,
  ThalerFunctionHandler,
  ThalerFunctions,
  ThalerLoaderHandler,
  ThalerServerHandler,
} from '../shared/types';
import { FunctionBody, patchHeaders, serializeFunctionBody } from '../shared/utils';

type ServerHandlerRegistration = [type: 'server', id: string, callback: ThalerServerHandler];
type LoaderHandlerRegistration = [type: 'loader', id: string, callback: ThalerLoaderHandler];
type ActionHandlerRegistration = [type: 'action', id: string, callback: ThalerActionHandler];
type FunctionHandlerRegistration<T extends ServerValue, R extends ServerValue> =
  [type: 'function', id: string, callback: ThalerFunctionHandler<T, R>];

type HandlerRegistration<T extends ServerValue, R extends ServerValue> =
  | ServerHandlerRegistration
  | LoaderHandlerRegistration
  | ActionHandlerRegistration
  | FunctionHandlerRegistration<T, R>;

const REGISTRATIONS = new Map<string, HandlerRegistration<ServerValue, ServerValue>>();

export function $$register<T extends ServerValue, R extends ServerValue>(
  ...registration: HandlerRegistration<T, R>
): HandlerRegistration<T, R> {
  const url = new URL(registration[1]);
  REGISTRATIONS.set(url.pathname, registration as HandlerRegistration<ServerValue, ServerValue>);
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

async function actionHandler(
  id: string,
  callback: ThalerActionHandler,
  formData: FormData,
  init: RequestInit = {},
) {
  patchHeaders(init, 'action');
  const request = new Request(id, {
    ...init,
    method: 'POST',
    body: formData,
  });
  return callback(formData, request);
}

async function loaderHandler(
  id: string,
  callback: ThalerLoaderHandler,
  search: URLSearchParams,
  init: RequestInit = {},
) {
  patchHeaders(init, 'loader');
  const request = new Request(`${id}?${search.toString()}`, {
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

export function $$clone<T extends ServerValue, R extends ServerValue>(
  [type, id, callback]: HandlerRegistration<T, R>,
  scope: ServerValue[],
): ThalerFunctions<T, R> {
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
      return Object.assign((functionHandler<T, R>).bind(null, id, callback, scope), {
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
            await request.formData(),
            request,
          );
        case 'loader':
          return await callback(
            url.searchParams,
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
