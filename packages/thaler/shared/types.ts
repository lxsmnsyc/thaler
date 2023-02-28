import { ServerValue } from 'seroval';

export type MaybePromise<T> = T | Promise<T>;

export type MaybeArray<T> = T | T[];
export type ThalerActionParam = Record<string, MaybeArray<string | File>>;
export type ThalerLoaderParam = Record<string, MaybeArray<string>>;

export type ThalerServerHandler = (request: Request) => MaybePromise<Response>;
export type ThalerActionHandler<P extends ThalerActionParam> =
  (formData: P, ctx: Request) => MaybePromise<Response>;
export type ThalerLoaderHandler<P extends ThalerLoaderParam> =
  (search: P, ctx: Request) => MaybePromise<Response>;
export type ThalerFunctionHandler<T extends ServerValue, R extends ServerValue> =
  (value: T, ctx: Request) => MaybePromise<R>;
export type ThalerPureHandler<T extends ServerValue, R extends ServerValue> =
  (value: T, ctx: Request) => MaybePromise<R>;

export type ThalerGenericHandler =
  | ThalerServerHandler
  | ThalerActionHandler<any>
  | ThalerLoaderHandler<any>
  | ThalerFunctionHandler<any, any>
  | ThalerPureHandler<any, any>;

export interface ThalerBaseFunction {
  id: string;
}

export interface ThalerServerFunction extends ThalerBaseFunction {
  type: 'server';
  (init: RequestInit): Promise<Response>;
}

export type ThalerActionInit = Omit<RequestInit, 'method' | 'body'>;

export interface ThalerActionFunction<P extends ThalerActionParam> extends ThalerBaseFunction {
  type: 'action';
  (formData: P, init?: ThalerActionInit): Promise<Response>;
}

export type ThalerLoaderInit = Omit<RequestInit, 'method' | 'body'>;

export interface ThalerLoaderFunction<P extends ThalerLoaderParam> extends ThalerBaseFunction {
  type: 'loader';
  (search: P, init?: ThalerLoaderInit): Promise<Response>;
}

export type ThalerFunctionInit = Omit<RequestInit, 'method' | 'body'>;

export interface ThalerFunction<
  T extends ServerValue,
  R extends ServerValue,
> extends ThalerBaseFunction {
  type: 'function';
  (value: T, init?: ThalerFunctionInit): Promise<R>;
}

export interface ThalerPureFunction<
  T extends ServerValue,
  R extends ServerValue,
> extends ThalerBaseFunction {
  type: 'pure';
  (value: T, init?: ThalerFunctionInit): Promise<R>;
}

export type ThalerFunctions =
  | ThalerServerFunction
  | ThalerActionFunction<any>
  | ThalerLoaderFunction<any>
  | ThalerFunction<any, any>
  | ThalerPureFunction<any, any>;

export type ThalerFunctionTypes =
  | 'server'
  | 'loader'
  | 'action'
  | 'function'
  | 'pure';
