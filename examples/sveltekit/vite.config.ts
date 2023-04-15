import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import thalerPlugin from 'unplugin-thaler';

export default defineConfig({
	plugins: [
		sveltekit(),
		thalerPlugin.vite({
			mode: 'server',
			filter: {
				include: 'src/**/*.{svelte,ts}'
			},
		}),
	]
});
