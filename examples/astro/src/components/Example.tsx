import type { JSX } from 'solid-js';
import { createResource, createSignal, onMount, Suspense } from 'solid-js';
import { fn$ } from 'thaler';
import { debounce } from 'thaler/utils';

async function sleep<T>(value: T, ms: number): Promise<T> {
  return new Promise<T>(res => {
    setTimeout(res, ms, value);
  });
}

export default function Example(): JSX.Element {
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
      key: () => 'example',
    },
  );

  const [data] = createResource(state, async value => serverCount(value));

  function increment(): void {
    setState(c => c + 1);
  }

  const example = fn$(async function* foo(items: string[]) {
    for (const item of items) {
      yield sleep(item, 1000);
    }
  });

  onMount(() => {
    (async (): Promise<void> => {
      const iterator = await example(['foo', 'bar', 'baz']);
      for await (const value of iterator) {
        console.log('Received: ', value);
      }
    })().catch(() => {
      //
    });
  });

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
