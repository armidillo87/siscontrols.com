import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // CHANGE: Set to your production URL
  site: 'https://example.com',
  output: 'static',
  compressHTML: true,

  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/thank-you') && !page.includes('/404'),
    }),
  ],

  image: {
    domains: [],
    remotePatterns: [],
  },

  build: {
    inlineStylesheets: 'auto',
  },
});
