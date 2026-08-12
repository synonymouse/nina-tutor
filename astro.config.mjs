import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? 'http://localhost:4321';
const excludedSitemapPaths = ['/privacy/', '/consent/', '/thanks/'];

export default defineConfig({
  site,
  output: 'server',
  adapter: node({ mode: 'standalone', bodySizeLimit: 16 * 1024 }),
  integrations: [
    sitemap({
      filter: (page) => !excludedSitemapPaths.some((path) => page.endsWith(path)),
    }),
  ],
  // The contact route validates Origin against runtime SITE_URL behind the TLS proxy.
  security: { checkOrigin: false },
  server: { host: true },
});
