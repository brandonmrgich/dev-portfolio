// ---
// label: avatar fetcher
// role: Download the GitHub profile photo at build time into public/, so the page
//   self-hosts it instead of hotlinking avatars.githubusercontent.com.
// invariants:
//   - NEVER fails the build. A GitHub outage, a rate limit, or a network-less build
//     must degrade to "no photo", not to a broken deploy. Exit code is always 0.
//   - The file is generated, not committed (.gitignore). Every build re-derives it, so
//     changing the photo on GitHub propagates on the next build with no repo change.
// gotchas:
//   - Runs BEFORE astro build (see the build script) because Astro copies public/ into
//     dist during the build. Running it after would ship the previous build's avatar.
//   - Hotlinking was the alternative and is rejected on purpose: it sends every
//     visitor's IP to GitHub and puts a third party in the critical render path.
// last-touched: 2026-08-10
// ---
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const USER = 'brandonmrgich'
const SIZE = 400
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'public/avatar.jpg')

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
const headers = {
  'User-Agent': 'dev-portfolio-build',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
}

try {
  const profile = await fetch(`https://api.github.com/users/${USER}`, { headers })
  if (!profile.ok) throw new Error(`profile lookup HTTP ${profile.status}`)

  const { avatar_url } = await profile.json()
  if (!avatar_url) throw new Error('profile has no avatar_url')

  // The `s` parameter asks GitHub's CDN for a pre-scaled image, which keeps this
  // dependency-free — no sharp, no local image processing.
  const image = await fetch(`${avatar_url}&s=${SIZE}`, { headers })
  if (!image.ok) throw new Error(`avatar download HTTP ${image.status}`)

  mkdirSync(join(root, 'public'), { recursive: true })
  const bytes = Buffer.from(await image.arrayBuffer())
  writeFileSync(dest, bytes)
  console.log(`[avatar] wrote public/avatar.jpg (${(bytes.length / 1024).toFixed(1)} kB)`)
} catch (err) {
  console.warn(
    `[avatar] skipped: ${err.message}\n` +
      `[avatar] the page renders without a photo — this is not a build failure`,
  )
}
