import solid from "solid-start/vite";
import { defineConfig } from "vite";
import thalerPlugin from 'unplugin-thaler';

export default defineConfig({
  plugins: [
    solid(),
		thalerPlugin.vite({
			origin: 'http://localhost:3000/api',
			mode: 'server',
		}),
  ]
});