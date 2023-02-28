/* eslint-disable @typescript-eslint/no-misused-promises */
import { fn$ } from 'thaler';

export default function Example(props: { message: string }) {
  const logger = fn$((message: string) => {
    const processed = `Message: ${message}`;
    console.log(processed);
    return processed;
  });
  return (
    <button onClick={async () => {
      console.log('Received', await logger(props.message));
    }}>
      Click me!
    </button>
  );
}
