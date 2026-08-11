// ---
// label: OG image generator
// role: Render public/og.png — the 1200x630 card shown when the site is shared in
//   Slack, LinkedIn, iMessage, Discord.
// invariants:
//   - Run LOCALLY and commit the PNG. This is deliberately not part of `pnpm build`.
//     SVG text rasterization depends on fonts installed on the host, so generating it in
//     CI would render differently — or blank — on a runner with no matching font. A
//     committed PNG is byte-identical everywhere.
//   - Text comes from resume.json so a title change is one edit plus `pnpm og`.
// gotchas:
//   - Any & < > in the data must be XML-escaped before landing in the SVG, or sharp
//     fails to parse it. Names and titles are user data; do not interpolate them raw.
//   - Long headlines must be wrapped manually. SVG <text> does not wrap.
// last-touched: 2026-08-10
// ---
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const resume = JSON.parse(readFileSync(join(root, 'src/data/resume.json'), 'utf8'))
const { basics } = resume

const W = 1200
const H = 630

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const current = resume.work
  .filter((w) => !w.endDate)
  .sort((a, b) => b.startDate.localeCompare(a.startDate))[0]

// SVG <text> does not wrap. Greedy-fill lines at an approximate character budget for
// the rendered size — exact metrics are unavailable without a font-measuring pass, and
// the copy here is short enough that an approximation is stable.
function wrap(text, max) {
  const lines = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max) {
      lines.push(line.trim())
      line = word
    } else {
      line += ' ' + word
    }
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

const role = current
  ? `${current.position} · ${current.client ?? current.name}`
  : basics.label

const summary = wrap(
  'Java GUI platforms, deployment automation, and safety-critical testing. Plus a production music platform.',
  58,
)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#12181f"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="10" height="${H}" fill="#4fd1c5"/>

  <text x="86" y="176" font-family="Helvetica, Arial, sans-serif" font-size="26"
        letter-spacing="4" fill="#6b7887">${esc(
          `${basics.location.city.toUpperCase()}, ${basics.location.region.toUpperCase()}`,
        )}</text>

  <text x="86" y="284" font-family="Helvetica, Arial, sans-serif" font-size="86"
        font-weight="bold" fill="#e4e9f0">${esc(basics.name)}</text>

  <!-- 25px, not 30: the full role string reaches x=1185 of 1200 at 30px, i.e. flush to
       the edge with no margin. Sized to keep a right gutter instead of truncating. -->
  <text x="86" y="342" font-family="Helvetica, Arial, sans-serif" font-size="25"
        fill="#4fd1c5">${esc(role)}</text>

  ${summary
    .map(
      (line, i) =>
        `<text x="86" y="${424 + i * 42}" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#9aa7b8">${esc(
          line,
        )}</text>`,
    )
    .join('\n  ')}

  <text x="86" y="${H - 62}" font-family="Menlo, monospace" font-size="26"
        fill="#7cc4ff">dev.brandonmrgich.com</text>
</svg>`

const dest = join(root, 'public/og.png')
const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(dest, buf)
console.log(`[og] wrote public/og.png (${(buf.length / 1024).toFixed(1)} kB, ${W}x${H})`)
