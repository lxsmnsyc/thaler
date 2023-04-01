import { handleRequest } from 'thaler/server';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const thalerResponse = await handleRequest(event.request);
  if (thalerResponse) {
    return thalerResponse;
  }
  const response = await resolve(event);
  return response;
}
