import { fn$ } from "thaler";

const sleep = (ms: number) => new Promise((res) => {
  setTimeout(res, ms, true);
});

const prefix = 'Server Count';

export const serverCount = fn$(async (value: number) => {
  await sleep(1000);
  console.log('Received', value);
  return `${prefix}: ${value}`;
});
