// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
	output: 'static',
	// Pages are static; only src/pages/api/* (prerender = false) runs as a Netlify function.
	// The site has no Edge Functions; emulating them locally needs Deno and fails without it.
	adapter: netlify({ devFeatures: { images: true, environmentVariables: false, edgeFunctions: false } }),
	devToolbar: { enabled: false },
});
