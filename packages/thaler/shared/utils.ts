import seroval, { ServerValue } from 'seroval';
import { ThalerActionParam, ThalerFunctionTypes, ThalerLoaderParam } from './types';

export const XThalerRequestType = 'X-Thaler-Request-Type';

export function patchHeaders(init: RequestInit, type: ThalerFunctionTypes) {
  if (init.headers) {
    const header = new Headers(init.headers);
    header.set(XThalerRequestType, type);
    init.headers = header;
  } else {
    init.headers = {
      [XThalerRequestType]: type,
    };
  }
}

export interface FunctionBody {
  scope: ServerValue[];
  value: ServerValue;
}

export function serializeFunctionBody({ scope, value }: FunctionBody) {
  return seroval({ scope, value });
}

export function fromFormData<T extends ThalerActionParam>(formData: FormData): T {
  const source: ThalerActionParam = {};
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

export function toFormData<T extends ThalerActionParam>(source: T): FormData {
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

export function fromURLSearchParams<T extends ThalerLoaderParam>(search: URLSearchParams): T {
  const source: ThalerLoaderParam = {};
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

export function toURLSearchParams<T extends ThalerLoaderParam>(source: T): URLSearchParams {
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
