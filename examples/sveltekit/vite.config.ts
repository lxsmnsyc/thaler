import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import thalerPlugin from 'unplugin-thaler';

export default defineConfig({
	plugins: [
		sveltekit(),
		thalerPlugin.vite({
			origin: 'http://localhost:5173',
			mode: 'server',
		}),
	]
});