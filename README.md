# dev-portfolio

Developer portfolio for **[dev.brandonmrgich.com](https://dev.brandonmrgich.com)** — a
static Astro site rendered from two data files, deployed to GitHub Pages.

Music work lives separately at [brandonmrgich.com](https://brandonmrgich.com); this site
is the engineering side.

## The idea

The site is **data-driven, not template-driven**. Two JSON files hold everything:

| File                     | Owns                                                    |
| ------------------------ | ------------------------------------------------------- |
| `src/data/resume.json`   | Skills, experience, education, awards, bio, contact      |
| `src/data/projects.json` | Featured work, curated public repos, outside contributions |

To update the site, edit a JSON file. The `.astro` components make no editorial
decisions — they render what the data says.

`resume.json` follows the [JSON Resume](https://jsonresume.org/schema) schema so the
same file can feed other tooling later. It is transcribed from
`Resume_2026_V3_Two_Page.pdf`; `_meta.lastSynced` records when.

## Live GitHub stats

Repos listed in `projects.json` under `openSource` / `contributions` are enriched at
**build time** with stars, primary language, and last-push date (`src/lib/github.js`).

Two rules that matter:

- **Enrichment never fails the build.** If GitHub is down, rate-limited, or a repo was
  renamed, the card still renders from its curated blurb and the build logs a warning.
- **Private entries are never fetched and never linked.** Anything marked
  `"visibility": "private"` in `projects.json` is described in prose only, with a visible
  "private source" marker.

A weekly scheduled workflow run refreshes the stats without a content change.

## Develop

```sh
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # -> dist/
pnpm preview
```

Set `GITHUB_TOKEN` locally only if you hit the unauthenticated rate limit (60/hr per IP);
a handful of repos will not.

## Deploy

Push to `main`. `.github/workflows/deploy.yml` builds and publishes to GitHub Pages.

**Custom domain wiring — both halves are required:**

1. `public/CNAME` contains `dev.brandonmrgich.com`, so the domain survives every rebuild.
2. Cloudflare DNS holds a `CNAME` record `dev` → `brandonmrgich.github.io` set to
   **DNS only (grey cloud)**.

> The grey cloud is not optional. With Cloudflare's proxy on, the DNS answer is a
> Cloudflare IP, GitHub cannot complete certificate validation, and HTTPS never
> provisions — or silently fails to renew later.

`astro.config.mjs` keeps `base: '/'`. This is a project repo, but it serves from a custom
domain, so the `/<repo>` base path does not apply — setting it breaks every asset URL.

## Structure

```
src/
  data/         resume.json, projects.json   <- edit these
  lib/          github.js (build-time fetch), format.js (dates)
  components/   Hero, Skills, Featured, Repos, Experience, Credentials
  layouts/      Base.astro (head, JSON-LD, footer)
  pages/        index.astro
  styles/       global.css (design tokens; light + dark)
public/CNAME
```

No CSS framework. The only client-side JavaScript is the scroll-spy in
`SectionRail.astro`, which marks the section currently in view — roughly 20 lines behind
an `IntersectionObserver`. It is pure progressive enhancement: with JavaScript disabled
the rail is still a working list of anchor links, just without the active marker.
Everything else is semantic HTML with an inlined stylesheet.
