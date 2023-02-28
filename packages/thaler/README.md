# thaler

> Isomorphic server-side functions

[![NPM](https://img.shields.io/npm/v/thaler.svg)](https://www.npmjs.com/package/thaler) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm i thaler
```

```bash
yarn add thaler
```

```bash
pnpm add thaler
```

## What?

`thaler` allows you to produce isomorphic functions that only runs on the server-side. This is usually ideal if you want to do server-side operations (e.g. database, files, etc.) on the client-side but without adding more abstractions such as defining extra REST endpoints, creating client-side utilities to communicate with the exact endpoint etc.

Another biggest benefit of this is that, not only it is great for isomorphic fullstack apps (i.e. metaframeworks like NextJS, SolidStart, etc.), if you're using TypeScript, type inference is also consistent too, so no need for extra work to manually wire-in types for both server and client.

## Functions

### `server$`

`server$` is the simplest of the `thaler` functions, it receives a callback for processing server [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) and returns a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response).

The returned function can then accept request options (which is the second parameter for the `Request` object), you can also check out [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/fetch)

```js
import { server$ } from 'thaler';

const getMessage = server$(async (request) => {
  const { greeting, receiver } = await request.json();

  return new Response(`${greeting}, ${receiver}!`, {
    status: 200,
  });
});

// Usage
const response = await getMessage({
  method: 'POST',
  body: JSON.stringify({
    greeting: 'Hello',
    receiver: 'World',
  }),
});

console.log(await response.text()); // Hello, World!
```

### `get$`

Similar to `server$` except that it can receive an object that can be converted into query params. The object can have a string or an array of strings as its values.

Only `get$` can accept search parameters and uses the `GET` method, which makes it great for creating server-side logic that utilizes caching.

```js
import { get$ } from 'thaler';

const getMessage = get$(async ({ greeting, receiver }) => {
  return new Response(`${greeting}, ${receiver}!`, {
    status: 200,
  });
});

// Usage
const response = await getMessage({
  greeting: 'Hello',
  receiver: 'World',
});

console.log(await response.text()); // Hello, World!
```

You can also pass some request configuration (same as `server$`) as the second parameter for the function, however `get$` cannot have `method` or `body`. The callback in `get$` can also receive the `Request` instance as the second parameter.

```js
import { get$ } from 'thaler';

const getUser = get$((search, request) => {
  // do stuff
});

const user = await getUser(search, {
  headers: {
    // do some header stuff
  },
});
```

### `post$`

If `get$` is for `GET`, `post$` is for `POST`. Instead of query parameters, the object it receives is converted into form data, so the object can accept not only a string or an array of strings, but also a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob), a [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File), or an array of either of those types.

Only `post$` can accept form data and uses the `POST` method, which makes it great for creating server-side logic when building forms.

```js
import { post$ } from 'thaler';

const addMessage = post$(async ({ greeting, receiver }) => {
  await db.messages.insert({ greeting, receiver });
  return new Response(null, {
    status: 200,
  });
});

// Usage
await addMessage({
  greeting: 'Hello',
  receiver: 'World',
});
```

You can also pass some request configuration (same as `server$`) as the second parameter for the function, however `post$` cannot have `method` or `body`. The callback in `post$` can also receive the `Request` instance as the second parameter.

```js
import { post$ } from 'thaler';

const addMessage = post$((formData, request) => {
  // do stuff
});

await addMessage(formData, {
  headers: {
    // do some header stuff
  },
});
```

### `fn$`

Unlike `get$` and `post$`, `fn$` uses a superior form of serialization, so that not only it supports valid JSON values, it supports [an extended range of JS values](https://github.com/lxsmnsyc/seroval#supports).

```js
import { fn$ } from 'thaler';

const addUsers = fn$(async (users) => {
  const db = await import('./db');
  return Promise.all(users.map((user) => db.users.insert(user)));
});

await addUsers([
  { name: 'John Doe', email: 'john.doe@johndoe.com' },
  { name: 'Jane Doe', email: 'jane.doe@janedoe.com' },
]);
```

You can also pass some request configuration (same as `server$`) as the second parameter for the function, however `fn$` cannot have `method` or `body`. The callback in `fn$` can also receive the `Request` instance as the second parameter.

```js
import { fn$ } from 'thaler';

const addMessage = fn$((data, request) => {
  // do stuff
});

await addMessage(data, {
  headers: {
    // do some header stuff
  },
});
```

#### Scoping

Other functions can capture server-side scope but unlike the other functions, `fn$` has a special behavior: it can capture the client-side scope of where the function is declared on the client.

```js
import { fn$ } from 'thaler';

const prefix = 'Message:';

const getMessage = fn$(({ greeting, receiver }) => {
  // `prefix` is captured and sent to the server
  return `${prefix} "${greeting}, ${receiver}!"`;
});

console.log(await getMessage({ greeting: 'Hello', receiver: 'World' })); // Message: "Hello, World!"
```

> **Note**
> `fn$` can only capture local scope, and not global scope.

If you're using an imported value inside the callback, it's better to import it inside the callback in the form of dynamic `import`.

```js
// Don't do this
import { example } from './example';

fn$(() => {
  example();
});

// Do this
fn$(async () => {
  const { example } = await import('./example');
  example();
});
```

> **Warning**
> Be careful on capturing scopes, as the captured variables must only be the values that can be serialized by `fn$`. If you're using a value that can't be serialized inside the callback that is declared outside, it cannot be captured by `fn$` and will lead to runtime errors.

## Integrations

- [Vite](https://github.com/lxsmnsyc/thaler/tree/main/packages/vite)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
