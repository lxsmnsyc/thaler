import solid from "solid-start/vite";
import { defineConfig } from "vite";
import thalerPlugin from 'unplugin-thaler';

export default defineConfig({
  plugins: [
    solid(),
		thalerPlugin.vite({
			prefix: 'api/__thaler',
			mode: 'server',
		}),
  ]
});