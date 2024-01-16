import { fromJSON, toJSONAsync } from 'seroval';
import {
  CustomEventPlugin,
  DOMExceptionPlugin,
  EventPlugin,
  FormDataPlugin,
  HeadersPlugin,
  ReadableStreamPlugin,
  RequestPlugin,
  ResponsePlugin,
  URLSearchParamsPlugin,
  URLPlugin,
} from 'seroval-plugins/web';
import type {
  ThalerPostParam,
  ThalerFunctionTypes,
  ThalerGetParam,
} from './types';

export const XThalerRequestType = 'X-Thaler-Request-Type';
export const XThalerInstance = 'X-Thaler-Instance';
export const XThalerID = 'X-Thaler-ID';

let INSTANCE = 0;

function getInstance(): string {
  return `thaler:${INSTANCE++}`;
}

export function patchHeaders(
  type: ThalerFunctionTypes,
  id: string,
  init: RequestInit,
): string {
  const instance = getInstance();
  if (init.headers) {
    const header = new Headers(init.headers);
    header.set(XThalerRequestType, type);
    header.set(XThalerInstance, instance);
    header.set(XThalerID, id);
    init.headers = header;
  } else {
    init.headers = {
      [XThalerRequestType]: type,
      [XThalerInstance]: instance,
      [XThalerID]: id,
    };
  }
  return instance;
}

export interface FunctionBody {
  scope: unknown[];
  value: unknown;
}

export async function serializeFunctionBody(
  body: FunctionBody,
): Promise<string> {
  return JSON.stringify(
    await toJSONAsync(body, {
      plugins: [
        CustomEventPlugin,
        DOMExceptionPlugin,
        EventPlugin,
        FormDataPlugin,
        HeadersPlugin,
        ReadableStreamPlugin,
        RequestPlugin,
        ResponsePlugin,
        URLSearchParamsPlugin,
        URLPlugin,
      ],
    }),
  );
}

export function deserializeData<T>(data: any): T {
  return fromJSON(data, {
    plugins: [
      CustomEventPlugin,
      DOMExceptionPlugin,
      EventPlugin,
      FormDataPlugin,
      HeadersPlugin,
      ReadableStreamPlugin,
      RequestPlugin,
      ResponsePlugin,
      URLSearchParamsPlugin,
      URLPlugin,
    ],
  }) as T;
}

export function fromFormData<T extends ThalerPostParam>(formData: FormData): T {
  const source: ThalerPostParam = {};
  formData.forEach((value, key) => {
    if (key in source) {
      const current = source[key];
      if (Array.isArray(current)) {
        current.push(value);
      } else {
        source[key] = [current, value];
      }
    } else {
      source[key] = value;
    }
  });
  return source as T;
}

export function toFormData<T extends ThalerPostParam>(source: T): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          formData.append(key, item);
        } else {
          formData.append(key, item, item.name);
        }
      }
    } else if (typeof value === 'string') {
      formData.append(key, value);
    } else {
      formData.append(key, value, value.name);
    }
  }
  return formData;
}

export function fromURLSearchParams<T extends ThalerGetParam>(
  search: URLSearchParams,
): T {
  const source: ThalerGetParam = {};
  for (const [key, value] of search.entries()) {
    if (key in source) {
      const current = source[key];
      if (Array.isArray(current)) {
        current.push(value);
      } else {
        source[key] = [current, value];
      }
    } else {
      source[key] = value;
    }
  }
  return source as T;
}

export function toURLSearchParams<T extends ThalerGetParam>(
  source: T,
): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, item);
      }
    } else {
      search.append(key, value);
    }
  }
  search.sort();
  return search;
}
