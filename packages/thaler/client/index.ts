import { ServerValue } from 'seroval';
import ThalerError from '../shared/error';
import {
  ThalerActionInit,
  ThalerActionParam,
  ThalerFunctionInit,
  ThalerFunctions,
  ThalerFunctionTypes,
  ThalerLoaderInit,
  ThalerLoaderParam,
} from '../shared/types';
import {
  patchHeaders,
  serializeFunctionBody,
  toFormData,
  toURLSearchParams,
} from '../shared/utils';

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
  type: ThalerFunctionTypes;
  id: string;
}

export function $$register(
  ...[type, id]: HandlerRegistration
): HandlerRegistrationResult {
  return { type, id };
}

async function serverHandler(type: ThalerFunctionTypes, id: string, init: RequestInit) {
  patchHeaders(init, type);
  const result = await fetch(id, init);
  return result;
}

async function actionHandler<P extends ThalerActionParam>(
  id: string,
  form: P,
  init: ThalerActionInit = {},
) {
  return serverHandler('action', id, {
    ...init,
    method: 'POST',
    body: toFormData(form),
  });
}

async function loaderHandler<P extends ThalerLoaderParam>(
  id: string,
  search: P,
  init: ThalerLoaderInit = {},
) {
  return serverHandler('loader', `${id}?${toURLSearchParams(search).toString()}`, {
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

export function $$clone(
  { type, id }: HandlerRegistrationResult,
  scope: ServerValue[],
): ThalerFunctions {
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
      return Object.assign(functionHandler.bind(null, id, scope), {
        type,
        id,
      });
    default:
      throw new Error('unknown registration type');
  }
}
