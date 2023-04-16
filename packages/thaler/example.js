import compile from 'thaler/compiler';

const serverOptions = {
  prefix: 'example',
  mode: 'server',
};

const FILE = 'src/index.ts';

const code = `
import { createResource, createSignal, Suspense } from 'solid-js';
import { fn$, ref$ } from 'thaler';

const sleep = (ms: number) => new Promise((res) => {
  setTimeout(res, ms, true);
});

const sleepingValue = ref$(async (value: number) => {
  await sleep(1000);
  console.log('Received', value);
  return value;
});

export default function Example() {
  const [state, setState] = createSignal(0);

  const prefix = 'Server Count';

  const serverCount = fn$(async ([cb, value]: [typeof sleepingValue, number]) => (
    \`\${prefix}: \${await cb(value)}\`
  ));

  const [data] = createResource(state, (value) => serverCount([sleepingValue, value]));

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