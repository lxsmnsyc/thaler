/* eslint-disable @typescript-eslint/no-misused-promises */
import { createResource, createSignal, Suspense } from 'solid-js';
import { fn$ } from 'thaler';

const prefix = 'Server Count';

export default function Example() {
  const [state, setState] = createSignal(0);

  const serverCount = fn$(async (value: number) => {
    const sleep = (ms: number) => new Promise((res) => {
      setTimeout(res, ms, true);
    });
    await sleep(1000);
    console.log('Received', value);
    return `${prefix}: ${value}`;
  });

  const [data] = createResource(state, (value) => serverCount(value));

  function increment() {
    setState((c) => c + 1);
  }

  return (
    <>
      <button onClick={increment}>
        {`Client Count: ${state()}`}
      </button>
      <div>
        <Suspense fallback={<h1>Loading</h1>}>
          <h1>{data()}</h1>
        </Suspense>
      </div>
    </>
  );
}
