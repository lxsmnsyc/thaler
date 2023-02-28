import * as babel from '@babel/core';
import { describe, expect, it } from 'vitest';
import plugin, { Options } from '../babel';

const options: Options = {
  origin: 'http://localhost:3000',
  prefix: 'example',
  source: 'example.tsx',
  mode: 'server',
};

async function compile(mode: 'server' | 'client', code: string) {
  const result = await babel.transformAsync(code, {
    plugins: [
      [plugin, { ...options, mode }],
    ],
    parserOpts: {
      plugins: [
        'jsx',
      ],
    },
  });

  return result?.code ?? '';
}

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
    expect(await compile('server', code)).toMatchSnapshot();
    expect(await compile('client', code)).toMatchSnapshot();
  });
});
describe('loader$', () => {
  it('should transform', async () => {
    const code = `
import { loader$ } from 'thaler';

const example = loader$(({ greeting, receiver}) => {
  const message = greeting + ', ' + receiver + '!';
  return new Response(message, {
    headers: {
      'content-type': 'text/html',
    },
    status: 200,
  });
});
  `;
    expect(await compile('server', code)).toMatchSnapshot();
    expect(await compile('client', code)).toMatchSnapshot();
  });
});
describe('action$', () => {
  it('should transform', async () => {
    const code = `
import { action$ } from 'thaler';

const example = action$(({ greeting, receiver }) => {
  const message = greeting + ', ' + receiver + '!';
  return new Response(message, {
    headers: {
      'content-type': 'text/html',
    },
    status: 200,
  });
});
  `;
    expect(await compile('server', code)).toMatchSnapshot();
    expect(await compile('client', code)).toMatchSnapshot();
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
    expect(await compile('server', code)).toMatchSnapshot();
    expect(await compile('client', code)).toMatchSnapshot();
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
    expect(await compile('server', code)).toMatchSnapshot();
    expect(await compile('client', code)).toMatchSnapshot();
  });
});
