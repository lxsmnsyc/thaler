import { toJSONAsync } from 'seroval';
import type {
  ThalerPostParam,
  ThalerFunctionTypes,
  ThalerGetParam,
} from './types';

export const XThalerRequestType = 'X-Thaler-Request-Type';
export const XThalerInstance = 'X-Thaler-Instance';

let INSTANCE = 0;

function getInstance(): string {
  return `thaler:${INSTANCE++}`;
}

export function patchHeaders(
  init: RequestInit,
  type: ThalerFunctionTypes,
): string {
  const instance = getInstance();
  if (init.headers) {
    const header = new Headers(init.headers);
    header.set(XThalerRequestType, type);
    header.set(XThalerInstance, instance);
    init.headers = header;
  } else {
    init.headers = {
      [XThalerRequestType]: type,
      [XThalerInstance]: instance,
    };
  }
  return instance;
}

export interface FunctionBody {
  scope: unknown[];
  value: unknown;
}

export async function serializeFunctionBody(body: FunctionBody): Promise<string> {
  return JSON.stringify(await toJSONAsync(body));
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

export function fromURLSearchParams<T extends ThalerGetParam>(search: URLSearchParams): T {
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

export function toURLSearchParams<T extends ThalerGetParam>(source: T): URLSearchParams {
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
