/* eslint-disable @typescript-eslint/no-unused-vars */
import { ServerValue } from 'seroval';
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
} from '../shared/types';

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

export function fn$<T extends ServerValue, R extends ServerValue>(
  handler: ThalerFnHandler<T, R>,
): ThalerFunction<T, R> {
  throw new Error('fn$ cannot be called during runtime.');
}

export function pure$<T extends ServerValue, R extends ServerValue>(
  handler: ThalerPureHandler<T, R>,
): ThalerPureFunction<T, R> {
  throw new Error('pure$ cannot be called during runtime.');
}
