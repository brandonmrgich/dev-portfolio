// ---
// label: github enrichment
// role: Build-time fetch of live repo stats (stars, language, last push) for curated repos.
// invariants:
//   - NEVER throws. A GitHub outage, a rate limit, or a renamed repo must not fail the
//     build — the page still renders from the curated blurb in projects.json.
//   - Only called at build time from .astro frontmatter. Nothing here ships to the client.
//   - Entries marked private in projects.json are never passed here, so no private
//     metadata can leak into the static output even if a token is present.
// gotchas:
//   - Unauthenticated GitHub REST is 60 req/hr *per IP*, and GitHub Actions runners share
//     IPs — in CI that budget is effectively zero. The deploy workflow passes GITHUB_TOKEN
//     for this reason. Locally, no token is fine for a handful of repos.
//   - `pushed_at` reflects any branch push, not just the default branch.
// last-touched: 2026-08-10
// ---

const API = 'https://api.github.com'

/** Repos that failed to enrich, reported once at the end of the build. */
const failures = []

function headers() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'dev-portfolio-build',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Fetch live metadata for one "owner/name" slug.
 * Returns null on any failure — callers must treat enrichment as optional.
 */
async function fetchRepo(slug) {
  try {
    const res = await fetch(`${API}/repos/${slug}`, { headers: headers() })
    if (!res.ok) {
      failures.push(`${slug} (HTTP ${res.status})`)
      return null
    }
    const r = await res.json()
    return {
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      pushedAt: r.pushed_at,
      homepage: r.homepage || null,
      archived: r.archived,
    }
  } catch (err) {
    failures.push(`${slug} (${err.message})`)
    return null
  }
}

/**
 * Enrich a list of curated entries that each carry a `repo` slug.
 * The curated `blurb` always wins over GitHub's own description — the blurb is
 * written for this audience, the description is not.
 */
export async function enrich(entries) {
  const enriched = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      name: entry.repo.split('/')[1],
      owner: entry.repo.split('/')[0],
      url: `https://github.com/${entry.repo}`,
      live: await fetchRepo(entry.repo),
    })),
  )

  if (failures.length) {
    // Loud in the build log, invisible on the page. A stale stat is a far better
    // outcome than a red build, but it should never pass silently.
    console.warn(
      `[github] enrichment unavailable for ${failures.length} repo(s): ${failures.join(', ')}\n` +
        `[github] the page still renders from curated data in src/data/projects.json`,
    )
    failures.length = 0
  }

  return enriched
}

/** "2026-08-07T19:06:20Z" -> "Aug 2026". Returns null for missing input. */
export function monthYear(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}
