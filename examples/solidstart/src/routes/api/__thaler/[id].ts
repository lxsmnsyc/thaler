import type { APIEvent } from '@solidjs/start/server';
import { handleRequest } from 'thaler/server';

export async function GET({ request }: APIEvent) {
  const result = await handleRequest(request);
  if (result) {
    return result;
  }
  return new Response(null, {
    status: 404,
  });
}

export async function POST({ request }: APIEvent) {
  const result = await handleRequest(request);
  if (result) {
    return result;
  }
  return new Response(null, {
    status: 404,
  });
}
