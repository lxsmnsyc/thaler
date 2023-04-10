import { APIEvent, json } from 'solid-start';
import { handleRequest } from 'thaler/server';

export async function GET({ request }: APIEvent) {
  const result = await handleRequest(request);
  if (result) {
    return result;
  }
  return json({}, 404);
}

export async function POST({ request }: APIEvent) {
  const result = await handleRequest(request);
  if (result) {
    return result;
  }
  return json({}, 404);
}
