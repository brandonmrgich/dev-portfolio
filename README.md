# dev-portfolio

Developer portfolio for **[dev.brandonmrgich.com](https://dev.brandonmrgich.com)** — a
static Astro site rendered from two data files, deployed to GitHub Pages.

Music work lives separately at [brandonmrgich.com](https://brandonmrgich.com); this site
is the engineering side.

## The idea

The site is **data-driven, not template-driven**. Two JSON files hold everything:

| File                     | Owns                                                    |
| ------------------------ | ------------------------------------------------------- |
| `src/data/resume.json`   | Skills, experience, education, awards, bio               |
| `src/data/projects.json` | Featured work, curated public repos, outside contributions |
| `src/data/site.json`     | "How I Work" principles, support/donation links          |

Posts live in `src/content/writing/*.md` and are schema-validated by
`src/content.config.ts` — a post missing a date or summary fails the build rather than
rendering a broken card.

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

## Social preview image

`public/og.png` is the card shown when the link is shared in Slack, LinkedIn, iMessage,
or Discord. Regenerate after changing your name or title:

```sh
pnpm og    # -> public/og.png (committed)
```

**Run this locally and commit the result — it is deliberately not part of `pnpm build`.**
SVG text rasterization depends on fonts installed on the host, so generating it on a CI
runner would render differently, or blank. A committed PNG is identical everywhere.

## Donation CTAs

`site.json` has `support.enabled: false`. **Nothing renders while it is false**, at any
placement — flip it once the accounts in `support.links` actually exist. A dead donate
button reads as abandoned, which is worse than not asking at all.

Links are defined once; only the wording changes per placement. Adding a payment
provider is a one-line edit to `support.links` and every CTA on the site picks it up.

```astro
<SupportCTA />                              <!-- page section, default copy -->
<SupportCTA cta="post" />                   <!-- end of a write-up -->
<SupportCTA cta="tool" variant="inline" />  <!-- boxed, mid-page -->
<SupportCTA variant="buttons" />            <!-- buttons only, no heading -->
```

`cta` selects a named copy preset from `support.ctas`; `variant` selects the layout. Add
a preset to `site.json` rather than passing wording at the call site — otherwise the copy
scatters across components and drifts.

## GitHub profile README

The same two data files also render the profile README at
[github.com/brandonmrgich](https://github.com/brandonmrgich) — the one GitHub shows at
the top of the profile page, which lives in the self-titled repo
[`brandonmrgich/brandonmrgich`](https://github.com/brandonmrgich/brandonmrgich).

```sh
pnpm profile          # render -> dist/PROFILE.md (review it)
pnpm profile:publish  # render, then push to the profile repo as README.md
```

Do not edit that repo's README by hand — the next publish reverts it. Edit
`src/data/*.json` here, and the site and the profile move together.

Publishing is a deliberate local step, not part of the deploy workflow. Pushing to a
*different* repository requires a personal access token, and a portfolio site is not a
good reason to keep one in CI. Re-running with no data change is a no-op, so it will not
spam the profile repo with empty commits.

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
