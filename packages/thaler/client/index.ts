import { ServerValue } from 'seroval';
import ThalerError from '../shared/error';
import {
  ThalerActionInit,
  ThalerFunctionInit,
  ThalerFunctions,
  ThalerLoaderInit,
} from '../shared/types';
import { patchHeaders, serializeFunctionBody } from '../shared/utils';

type ServerHandlerRegistration = [type: 'server', id: string];
type LoaderHandlerRegistration = [type: 'loader', id: string];
type ActionHandlerRegistration = [type: 'action', id: string];
type FunctionHandlerRegistration = [type: 'function', id: string];

type HandlerRegistration =
  | ServerHandlerRegistration
  | LoaderHandlerRegistration
  | ActionHandlerRegistration
  | FunctionHandlerRegistration;

interface HandlerRegistrationResult {
  type: HandlerRegistration[0];
  id: string;
}

export function $$register(
  ...[type, id]: HandlerRegistration
): HandlerRegistrationResult {
  return { type, id };
}

async function serverHandler(type: HandlerRegistration[0], id: string, init: RequestInit) {
  patchHeaders(init, type);
  const result = await fetch(id, init);
  return result;
}

async function actionHandler(
  id: string,
  form: FormData,
  init: ThalerActionInit = {},
) {
  return serverHandler('action', id, {
    ...init,
    method: 'POST',
    body: form,
  });
}

async function loaderHandler(
  id: string,
  search: URLSearchParams,
  init: ThalerLoaderInit = {},
) {
  return serverHandler('loader', `${id}?${search.toString()}`, {
    ...init,
    method: 'GET',
  });
}

async function functionHandler<T extends ServerValue, R extends ServerValue>(
  id: string,
  scope: ServerValue[],
  value: T,
  init: ThalerFunctionInit = {},
): Promise<R> {
  const response = await serverHandler('function', id, {
    ...init,
    method: 'POST',
    body: serializeFunctionBody({ scope, value }),
  });
  if (response.ok) {
    const serialized = await response.text();
    // eslint-disable-next-line no-eval
    return (0, eval)(serialized) as R;
  }
  throw new ThalerError(id);
}

export function $$clone<T extends ServerValue, R extends ServerValue>(
  { type, id }: HandlerRegistrationResult,
  scope: ServerValue[],
): ThalerFunctions<T, R> {
  switch (type) {
    case 'server':
      return Object.assign(serverHandler.bind(null, 'server', id), {
        type,
        id,
      });
    case 'action':
      return Object.assign(actionHandler.bind(null, id), {
        type,
        id,
      });
    case 'loader':
      return Object.assign(loaderHandler.bind(null, id), {
        type,
        id,
      });
    case 'function':
      return Object.assign((functionHandler<T, R>).bind(null, id, scope), {
        type,
        id,
      });
    default:
      throw new Error('unknown registration type');
  }
}
