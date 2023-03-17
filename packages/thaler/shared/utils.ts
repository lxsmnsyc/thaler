import { toJSONAsync } from 'seroval';
import {
  ThalerValue,
  ThalerPostParam,
  ThalerFunctionTypes,
  ThalerGetParam,
} from './types';

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
  scope: () => ThalerValue[];
  value: ThalerValue;
}

export interface DeserializedFunctionBody extends Record<string, ThalerValue> {
  scope: ThalerValue[];
  value: ThalerValue;
}

export async function serializeFunctionBody({ scope, value }: FunctionBody) {
  return JSON.stringify(await toJSONAsync({ scope: scope(), value }));
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
