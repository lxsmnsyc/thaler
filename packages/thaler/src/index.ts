/* eslint-disable @typescript-eslint/no-unused-vars */
import { ServerValue } from 'seroval';
import {
  ThalerActionFunction,
  ThalerActionHandler,
  ThalerActionParam,
  ThalerFunction,
  ThalerFunctionHandler,
  ThalerLoaderFunction,
  ThalerLoaderHandler,
  ThalerLoaderParam,
  ThalerPureFunction,
  ThalerPureHandler,
  ThalerServerFunction,
  ThalerServerHandler,
} from '../shared/types';

export function server$(handler: ThalerServerHandler): ThalerServerFunction {
  throw new Error('server$ cannot be called during runtime.');
}

export function action$<P extends ThalerActionParam>(
  handler: ThalerActionHandler<P>,
): ThalerActionFunction<P> {
  throw new Error('action$ cannot be called during runtime.');
}

export function loader$<P extends ThalerLoaderParam>(
  handler: ThalerLoaderHandler<P>,
): ThalerLoaderFunction<P> {
  throw new Error('loader$ cannot be called during runtime.');
}

export function fn$<T extends ServerValue, R extends ServerValue>(
  handler: ThalerFunctionHandler<T, R>,
): ThalerFunction<T, R> {
  throw new Error('fn$ cannot be called during runtime.');
}

export function pure$<T extends ServerValue, R extends ServerValue>(
  handler: ThalerPureHandler<T, R>,
): ThalerPureFunction<T, R> {
  throw new Error('pure$ cannot be called during runtime.');
}
