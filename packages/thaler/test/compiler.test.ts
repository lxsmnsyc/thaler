import { describe, expect, it } from 'vitest';
import compile, { Options } from '../compiler';

const serverOptions: Options = {
  origin: 'http://localhost:3000',
  prefix: 'example',
  mode: 'server',
};

const clientOptions: Options = {
  origin: 'http://localhost:3000',
  prefix: 'example',
  mode: 'client',
};

const FILE = 'src/index.ts';

describe('server$', () => {
  it('should transform', async () => {
    const code = `
import { server$ } from 'thaler';

const example = server$((request) => {
  return new Response('Hello World', {
    headers: {
      'content-type': 'text/html',
    },
    status: 200,
  });
});
  `;
    expect((await compile(FILE, code, serverOptions)).code).toMatchSnapshot();
    expect((await compile(FILE, code, clientOptions)).code).toMatchSnapshot();
  });
});
describe('get$', () => {
  it('should transform', async () => {
    const code = `
import { get$ } from 'thaler';

const example = get$(({ greeting, receiver}) => {
  const message = greeting + ', ' + receiver + '!';
  return new Response(message, {
    headers: {
      'content-type': 'text/html',
    },
    status: 200,
  });
});
  `;
    expect((await compile(FILE, code, serverOptions)).code).toMatchSnapshot();
    expect((await compile(FILE, code, clientOptions)).code).toMatchSnapshot();
  });
});
describe('post$', () => {
  it('should transform', async () => {
    const code = `
import { post$ } from 'thaler';

const example = post$(({ greeting, receiver }) => {
  const message = greeting + ', ' + receiver + '!';
  return new Response(message, {
    headers: {
      'content-type': 'text/html',
    },
    status: 200,
  });
});
  `;
    expect((await compile(FILE, code, serverOptions)).code).toMatchSnapshot();
    expect((await compile(FILE, code, clientOptions)).code).toMatchSnapshot();
  });
});
describe('fn$', () => {
  it('should transform', async () => {
    const code = `
import { fn$ } from 'thaler';

const PREFIX = 'Message: ';

const example = fn$(({ greeting, receiver }) => {
  const message = PREFIX + greeting + ', ' + receiver + '!';
  return message;
});
  `;
    expect((await compile(FILE, code, serverOptions)).code).toMatchSnapshot();
    expect((await compile(FILE, code, clientOptions)).code).toMatchSnapshot();
  });
  it('should transform with local scope', async () => {
    const code = `
import { fn$ } from 'thaler';

function test() {
  const PREFIX = 'Message: ';
  
  const example = fn$(({ greeting, receiver }) => {
    const message = PREFIX + greeting + ', ' + receiver + '!';
    return message;
  });
}
  `;
    expect((await compile(FILE, code, serverOptions)).code).toMatchSnapshot();
    expect((await compile(FILE, code, clientOptions)).code).toMatchSnapshot();
  });
});

describe('pure$', () => {
  it('should transform', async () => {
    const code = `
import { pure$ } from 'thaler';

const sleep = (ms) => new Promise((res) => {
  setTimeout(res, ms, true);
});

const example = pure$(async ({ greeting, receiver }) => {
  await sleep(1000);
  const message = greeting + ', ' + receiver + '!';
  return message;
});
  `;
    expect((await compile(FILE, code, serverOptions)).code).toMatchSnapshot();
    expect((await compile(FILE, code, clientOptions)).code).toMatchSnapshot();
  });
});

describe('ref$', () => {
  it('should transform', async () => {
    const code = `
import { ref$ } from 'thaler';

const example = ref$(() => 'Hello World');
  `;
    expect((await compile(FILE, code, serverOptions)).code).toMatchSnapshot();
    expect((await compile(FILE, code, clientOptions)).code).toMatchSnapshot();
  });
});

describe('loader$', () => {
  it('should transform', async () => {
    const code = `
import { loader$ } from 'thaler';

const example = loader$(async ({ greeting, receiver }) => {
  const message = greeting + ', ' + receiver + '!';
  return message;
});
  `;
    expect((await compile(FILE, code, serverOptions)).code).toMatchSnapshot();
    expect((await compile(FILE, code, clientOptions)).code).toMatchSnapshot();
  });
});

describe('action$', () => {
  it('should transform', async () => {
    const code = `
import { action$ } from 'thaler';

const example = action$(async ({ greeting, receiver }) => {
  const message = greeting + ', ' + receiver + '!';
  return message;
});
  `;
    expect((await compile(FILE, code, serverOptions)).code).toMatchSnapshot();
    expect((await compile(FILE, code, clientOptions)).code).toMatchSnapshot();
  });
});
