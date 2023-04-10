import { AsyncServerValue } from 'seroval';

export type ThalerValue = AsyncServerValue;
export type MaybePromise<T> = T | Promise<T>;

export type MaybeArray<T> = T | T[];
export type ThalerPostParam = Record<string, MaybeArray<string | File>>;
export type ThalerGetParam = Record<string, MaybeArray<string>>;

export type ThalerServerHandler = (request: Request) => MaybePromise<Response>;
export type ThalerPostHandler<P extends ThalerPostParam> =
  (formData: P, ctx: Request) => MaybePromise<Response>;
export type ThalerGetHandler<P extends ThalerGetParam> =
  (search: P, ctx: Request) => MaybePromise<Response>;
export type ThalerFnHandler<T, R> =
  (value: T, ctx: Request) => MaybePromise<R>;
export type ThalerPureHandler<T, R> =
  (value: T, ctx: Request) => MaybePromise<R>;

export type ThalerGenericHandler =
  | ThalerServerHandler
  | ThalerPostHandler<any>
  | ThalerGetHandler<any>
  | ThalerFnHandler<any, any>
  | ThalerPureHandler<any, any>;

export interface ThalerBaseFunction {
  id: string;
}

export interface ThalerServerFunction extends ThalerBaseFunction {
  type: 'server';
  (init: RequestInit): Promise<Response>;
}

export type ThalerPostInit = Omit<RequestInit, 'method' | 'body'>;

export interface ThalerPostFunction<P extends ThalerPostParam> extends ThalerBaseFunction {
  type: 'post';
  (formData: P, init?: ThalerPostInit): Promise<Response>;
}

export type ThalerGetInit = Omit<RequestInit, 'method' | 'body'>;

export interface ThalerGetFunction<P extends ThalerGetParam> extends ThalerBaseFunction {
  type: 'get';
  (search: P, init?: ThalerGetInit): Promise<Response>;
}

export type ThalerFunctionInit = Omit<RequestInit, 'method' | 'body'>;

export interface ThalerFunction<T, R> extends ThalerBaseFunction {
  type: 'fn';
  (value: T, init?: ThalerFunctionInit): Promise<R>;
}

export interface ThalerPureFunction<T, R> extends ThalerBaseFunction {
  type: 'pure';
  (value: T, init?: ThalerFunctionInit): Promise<R>;
}

export type ThalerFunctions =
  | ThalerServerFunction
  | ThalerPostFunction<any>
  | ThalerGetFunction<any>
  | ThalerFunction<any, any>
  | ThalerPureFunction<any, any>;

export type ThalerFunctionTypes =
  | 'server'
  | 'get'
  | 'post'
  | 'fn'
  | 'pure';
