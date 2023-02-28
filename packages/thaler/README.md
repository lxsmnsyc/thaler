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

### `loader$`

Similar to `server$` except that it can receive an object that can be converted into query params. The object can have a string or an array of strings as its values.

Only `loader$` can accept search parameters and uses the `GET` method, which makes it great for creating server-side logic that utilizes caching.

```js
import { loader$ } from 'thaler';

const getMessage = loader$(async ({ greeting, receiver }) => {
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

You can also pass some request configuration (same as `server$`) as the second parameter for the function, however `loader$` cannot have `method` or `body`. The callback in `loader$` can also receive the `Request` instance as the second parameter.

```js
import { loader$ } from 'thaler';

const getUser = loader$((search, request) => {
  // do stuff
});

const user = await getUser(search, {
  headers: {
    // do some header stuff
  },
});
```

### `action$`

If `loader$` is for `GET`, `action$` is for `POST`. Instead of query parameters, the object it receives is converted into form data, so the object can accept not only a string or an array of strings, but also a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob), a [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File), or an array of either of those types.

Only `action$` can accept form data and uses the `POST` method, which makes it great for creating server-side logic when building forms.

```js
import { action$ } from 'thaler';

const addMessage = action$(async ({ greeting, receiver }) => {
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

You can also pass some request configuration (same as `server$`) as the second parameter for the function, however `action$` cannot have `method` or `body`. The callback in `action$` can also receive the `Request` instance as the second parameter.

```js
import { action$ } from 'thaler';

const addMessage = action$((formData, request) => {
  // do stuff
});

await addMessage(formData, {
  headers: {
    // do some header stuff
  },
});
```

### `function$`

Unlike `loader$` and `action$`, `function$` uses a superior form of serialization, so that not only it supports valid JSON values, it supports [an extended range of JS values](https://github.com/lxsmnsyc/seroval#supports).

```js
import { function$ } from 'thaler';

const addUsers = function$(async (users) => {
  const db = await import('./db');
  return Promise.all(users.map((user) => db.users.insert(user)));
});

await addUsers([
  { name: 'John Doe', email: 'john.doe@johndoe.com },
  { name: 'Jane Doe', email: 'jane.doe@janedoe.com },
]);
```

You can also pass some request configuration (same as `server$`) as the second parameter for the function, however `function$` cannot have `method` or `body`. The callback in `function$` can also receive the `Request` instance as the second parameter.

```js
import { function$ } from 'thaler';

const addMessage = function$((data, request) => {
  // do stuff
});

await addMessage(data, {
  headers: {
    // do some header stuff
  },
});
```

#### Scoping

Unlike the other functions, `function$` has a special behavior: it can capture the client-side scope of where the function is declared on the client.

```js
import { function$ } from 'thaler';

const prefix = 'Message:';

const getMessage = function$(({ greeting, receiver }) => {
  // `prefix` is captured and sent to the server
  return `${prefix} "${greeting}, ${receiver}!"`;
});

console.log(await getMessage({ greeting: 'Hello', receiver: 'World' })); // Message: "Hello, World!"
```

> **Note**
> `function$` can only capture local scope, and not global scope.

> **Warning**
> Be careful on capturing scopes, as the captured variables must only be the values that can be serialized by `function$`. If you're using a function inside the callback that is declared outside, it cannot be captured by `function$` and will lead to runtime errors. It's recommended to use dynamic imports inside the callback instead.

```js
// Don't do this
import { example } from './example';

function$(() => {
  example();
});

// Do this
function$(async () => {
  const { example } = await import('./example');
  example();
});
```

## Integrations

- [Vite](https://github.com/lxsmnsyc/thaler/tree/main/packages/vite)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
