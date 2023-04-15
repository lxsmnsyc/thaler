import compile from 'thaler/compiler';

const serverOptions = {
  prefix: 'api/__thaler',
  mode: 'server',
};

const FILE = 'src/index.ts';

const code = `
import { createResource, createSignal, Suspense } from 'solid-js';
import { fn$ } from 'thaler';
import { debounce } from 'thaler/utils';

const sleep = (ms: number) => new Promise((res) => {
  setTimeout(res, ms, true);
});

export default function Example() {
  const [state, setState] = createSignal(0);

  const prefix = 'Server Count';

  const serverCount = debounce(fn$(async (value: number) => {
    await sleep(1000);
    console.log('Received', value);
    return \`\${prefix}: \${value}\`;
  }), {
    key: () => 'sleep',
  });
  const [data] = createResource(state, (value) => serverCount(value));

  function increment() {
    setState((c) => c + 1);
  }

  return (
    <>
      <button onClick={increment}>
        {\`Client Count: \${state()}\`}
      </button>
      <div>
        <Suspense fallback={<h1>Loading</h1>}>
          <h1>{data()}</h1>
        </Suspense>
      </div>
    </>
  );
}


`;

console.log((await compile(FILE, code, serverOptions)).code);