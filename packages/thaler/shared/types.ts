import { ServerValue } from 'seroval';

export type MaybePromise<T> = T | Promise<T>;

export type ThalerServerHandler = (request: Request) => MaybePromise<Response>;
export type ThalerActionHandler = (formData: FormData, ctx: Request) => MaybePromise<Response>;
export type ThalerLoaderHandler = (search: URLSearchParams, ctx: Request) => MaybePromise<Response>;
export type ThalerFunctionHandler<T extends ServerValue, R extends ServerValue> =
  (value: T, ctx: Request) => MaybePromise<R>;

export type ThalerGenericHandler<T extends ServerValue, R extends ServerValue> =
  | ThalerServerHandler
  | ThalerActionHandler
  | ThalerLoaderHandler
  | ThalerFunctionHandler<T, R>;

export interface ThalerBaseFunction {
  id: string;
}

export interface ThalerServerFunction extends ThalerBaseFunction {
  type: 'server';
  (request: RequestInit): Promise<Response>;
}

export type ThalerActionInit = Omit<RequestInit, 'method' | 'body'>;

export interface ThalerActionFunction extends ThalerBaseFunction {
  type: 'action';
  (formData: FormData, init?: ThalerActionInit): Promise<Response>;
}

export type ThalerLoaderInit = Omit<RequestInit, 'method' | 'body'>;

export interface ThalerLoaderFunction extends ThalerBaseFunction {
  type: 'loader';
  (search: URLSearchParams, init?: ThalerLoaderInit): Promise<Response>;
}

export type ThalerFunctionInit = Omit<RequestInit, 'method' | 'body'>;

export interface ThalerFunction<
  T extends ServerValue,
  R extends ServerValue,
> extends ThalerBaseFunction {
  type: 'function';
  (value: T, init?: ThalerFunctionInit): Promise<R>;
}

export type ThalerFunctions<T extends ServerValue, R extends ServerValue> =
  | ThalerServerFunction
  | ThalerActionFunction
  | ThalerLoaderFunction
  | ThalerFunction<T, R>;

export type ThalerFunctionTypes = 'server' | 'loader' | 'action' | 'function';
