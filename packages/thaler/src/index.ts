/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ThalerPostFunction,
  ThalerPostHandler,
  ThalerPostParam,
  ThalerFunction,
  ThalerFnHandler,
  ThalerGetFunction,
  ThalerGetHandler,
  ThalerGetParam,
  ThalerPureFunction,
  ThalerPureHandler,
  ThalerServerFunction,
  ThalerServerHandler,
  ThalerLoaderHandler,
  ThalerLoaderFunction,
  ThalerActionHandler,
  ThalerActionFunction,
} from '../shared/types';

export * from '../shared/types';

export function server$(handler: ThalerServerHandler): ThalerServerFunction {
  throw new Error('server$ cannot be called during runtime.');
}

export function post$<P extends ThalerPostParam>(
  handler: ThalerPostHandler<P>,
): ThalerPostFunction<P> {
  throw new Error('post$ cannot be called during runtime.');
}

export function get$<P extends ThalerGetParam>(
  handler: ThalerGetHandler<P>,
): ThalerGetFunction<P> {
  throw new Error('get$ cannot be called during runtime.');
}

export function fn$<T, R>(
  handler: ThalerFnHandler<T, R>,
): ThalerFunction<T, R> {
  throw new Error('fn$ cannot be called during runtime.');
}

export function pure$<T, R>(
  handler: ThalerPureHandler<T, R>,
): ThalerPureFunction<T, R> {
  throw new Error('pure$ cannot be called during runtime.');
}

export function loader$<P extends ThalerGetParam, R>(
  handler: ThalerLoaderHandler<P, R>,
): ThalerLoaderFunction<P, R> {
  throw new Error('fn$ cannot be called during runtime.');
}

export function action$<P extends ThalerPostParam, R>(
  handler: ThalerActionHandler<P, R>,
): ThalerActionFunction<P, R> {
  throw new Error('pure$ cannot be called during runtime.');
}

export function ref$<T>(value: T): T {
  throw new Error('ref$ cannot be called during runtime');
}

export {
  fromFormData,
  fromURLSearchParams,
} from '../shared/utils';
