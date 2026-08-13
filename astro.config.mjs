import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const site = process.env.SITE_URL ?? 'http://localhost:4321';
const excludedSitemapPaths = ['/privacy/', '/consent/', '/thanks/'];
const outDir = process.env.ASTRO_OUT_DIR
  ? fileURLToPath(pathToFileURL(`${resolve(process.env.ASTRO_OUT_DIR)}${sep}`))
  : undefined;

export default defineConfig({
  site,
  ...(outDir ? { outDir } : {}),
  output: 'server',
  build: { inlineStylesheets: 'always' },
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
