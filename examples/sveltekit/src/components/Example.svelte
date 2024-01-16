<script>
  import { fn$ } from "thaler";
  import { debounce } from "thaler/utils";

  const prefix = "Server Count";

  const serverCount = debounce(
    fn$((value) => {
      console.log("Received", value);
      return {
        data: `${prefix}: ${value}`,
        delayed: new Promise((res) => {
          setTimeout(res, 1000, `Delayed ${prefix}: ${value}`);
        }),
      };
    }),
    {
      key: () => "sleep",
    },
  );

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
    <h1>{value.data}</h1>
    {#await value.delayed}
      <h1>Loading</h1>
    {:then delayed}
      <h1>Delayed: {delayed}</h1>
    {/await}
  {/await}
</div>
