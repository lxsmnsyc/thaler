import { defineConfig } from '@solidjs/start/config';
import thalerPlugin from 'unplugin-thaler';

console.log(thalerPlugin);

export default defineConfig({
  plugins: [
    thalerPlugin.vite({
      prefix: 'api/__thaler',
      mode: 'server',
    }),
  ],
});
