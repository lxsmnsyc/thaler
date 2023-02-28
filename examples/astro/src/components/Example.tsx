import { fn$ } from 'thaler';

export default function Example(props: { message: string }) {
  const logger = fn$((message) => {
    console.log(`Message: ${message}`);
    return null;
  });
  return (
    <button onClick={() => logger(props.message)}>
      Click me!
    </button>
  );
}
