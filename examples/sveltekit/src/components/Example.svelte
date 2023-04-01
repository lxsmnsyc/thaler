<script>
  import { serverCount } from "./server-count";

  let state = 0;

  $: data = serverCount(state);

  function increment() {
    state += 1;
  }
</script>
<button on:click={increment}>
  {`Client Count: ${state}`}
</button>
<div>
  {#await data}
    <h1>Loading</h1>
  {:then value}
    <h1>{value}</h1>
  {/await}
</div>