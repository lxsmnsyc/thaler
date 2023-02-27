import seroval, { ServerValue } from 'seroval';
import { ThalerFunctionTypes } from './types';

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
