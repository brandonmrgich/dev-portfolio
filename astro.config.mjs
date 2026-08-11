// ---
// label: astro.config
// role: Astro build config for the dev.brandonmrgich.com GitHub Pages site.
// invariants:
//   - `site` is the full custom-domain URL; `base` MUST stay '/'. This is a project
//     repo but it serves from a custom domain, so the /<repo> base path does not apply.
//     Setting base to '/dev-portfolio' silently breaks every asset URL.
//   - output stays 'static' — there is no server at runtime, only GitHub Pages.
// gotchas: The custom domain lives in public/CNAME so it survives every rebuild;
//   changing `site` here without changing that file desyncs canonical URLs from reality.
// last-touched: 2026-08-10
// ---
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://dev.brandonmrgich.com',
  base: '/',
  output: 'static',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'always',
  },
})
