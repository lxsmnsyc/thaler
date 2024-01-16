import { createResource, createSignal, Suspense } from 'solid-js';
import { fn$ } from 'thaler';
import { debounce } from 'thaler/utils';

async function sleep<T>(value: T, ms: number): Promise<T> {
  return new Promise<T>(res => {
    setTimeout(res, ms, value);
  });
}

export default function Example() {
  const [state, setState] = createSignal(0);

  const prefix = 'Server Count';

  const serverCount = debounce(
    fn$((value: number) => {
      console.log('Received', value);
      return {
        data: `${prefix}: ${value}`,
        delayed: sleep(`Delayed ${prefix}: ${value}`, 1000),
      };
    }),
    {
      key: () => 'sleep',
    },
  );

  const [data] = createResource(state, value => serverCount(value));

  function increment() {
    setState(c => c + 1);
  }

  return (
    <>
      <button onClick={increment}>{`Client Count: ${state()}`}</button>
      <div>
        <Suspense fallback={<h1>Loading</h1>}>
          <h1>{data()?.data}</h1>
        </Suspense>
      </div>
    </>
  );
}
