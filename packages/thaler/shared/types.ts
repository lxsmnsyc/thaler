import type { AsyncServerValue } from 'seroval';

export type ThalerValue = AsyncServerValue;
export type MaybePromise<T> = T | Promise<T>;

export type MaybeArray<T> = T | T[];
export type ThalerPostParam = Record<string, MaybeArray<string | File>>;
export type ThalerGetParam = Record<string, MaybeArray<string>>;

export interface ThalerContext {
  request: Request;
}

export type ThalerServerHandler = (request: Request) => MaybePromise<Response>;
export type ThalerPostHandler<P extends ThalerPostParam> =
  (formData: P, ctx: ThalerContext) => MaybePromise<Response>;
export type ThalerGetHandler<P extends ThalerGetParam> =
  (search: P, ctx: ThalerContext) => MaybePromise<Response>;

export interface ThalerResponseInit {
  headers: Headers;
  status: number;
  statusText: string;
}

export interface ThalerFunctionalContext extends ThalerContext {
  response: ThalerResponseInit;
}

export type ThalerFnHandler<T, R> =
  (value: T, ctx: ThalerFunctionalContext) => MaybePromise<R>;
export type ThalerPureHandler<T, R> =
  (value: T, ctx: ThalerFunctionalContext) => MaybePromise<R>;
export type ThalerLoaderHandler<P extends ThalerGetParam, R> =
  (value: P, ctx: ThalerFunctionalContext) => MaybePromise<R>;
export type ThalerActionHandler<P extends ThalerPostParam, R> =
  (value: P, ctx: ThalerFunctionalContext) => MaybePromise<R>;

export type ThalerGenericHandler =
  | ThalerServerHandler
  | ThalerPostHandler<any>
  | ThalerGetHandler<any>
  | ThalerFnHandler<any, any>
  | ThalerPureHandler<any, any>
  | ThalerLoaderHandler<any, any>
  | ThalerActionHandler<any, any>;

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
  (value: T, init?: ThalerFunctionInit): Promise<R>;
  type: 'fn';
}

export interface ThalerPureFunction<T, R> extends ThalerBaseFunction {
  type: 'pure';
  (value: T, init?: ThalerFunctionInit): Promise<R>;
}

export interface ThalerLoaderFunction<P extends ThalerGetParam, R>
  extends ThalerBaseFunction {
  type: 'loader';
  (value: P, init?: ThalerFunctionInit): Promise<R>;
}

export interface ThalerActionFunction<P extends ThalerPostParam, R>
  extends ThalerBaseFunction {
  type: 'action';
  (value: P, init?: ThalerFunctionInit): Promise<R>;
}

export type ThalerFunctions =
  | ThalerServerFunction
  | ThalerPostFunction<any>
  | ThalerGetFunction<any>
  | ThalerFunction<any, any>
  | ThalerPureFunction<any, any>
  | ThalerLoaderFunction<any, any>
  | ThalerActionFunction<any, any>;

export type ThalerFunctionTypes =
  | 'server'
  | 'get'
  | 'post'
  | 'fn'
  | 'pure'
  | 'loader'
  | 'action';
