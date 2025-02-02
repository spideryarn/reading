import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	const env = loadEnv(mode, process.cwd(), '');
	
	return {
		plugins: [sveltekit()],
		test: {
			include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
			exclude: ['tests/frontend/**/*', 'tests-examples/**/*']
		},
		// Expose env variables to the client if needed (we don't need this for Claude API key)
		define: {
			// expose .env variables if any need to be exposed to client
		}
	};
});
