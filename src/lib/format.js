// ---
// label: format helpers
// role: Date and label formatting shared by the resume-driven sections.
// invariants: Pure functions, build-time only. resume.json stores "YYYY-MM"; a null
//   endDate means "present" and must render as such, never as an empty range.
// gotchas: new Date("2024-10") parses as UTC midnight — always format with timeZone
//   'UTC' or the month slips backwards in western timezones.
// last-touched: 2026-08-10
// ---

/** "2024-10" -> "Oct 2024" */
export function month(ym) {
  if (!ym) return null
  const d = new Date(`${ym}-01T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ym
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** ("2024-10", null) -> "Oct 2024 — Present" */
export function range(startDate, endDate) {
  const start = month(startDate)
  const end = endDate ? month(endDate) : 'Present'
  return start ? `${start} — ${end}` : end
}

/** Machine-readable duration for <time datetime>. */
export function dateAttr(ym) {
  return ym || undefined
}
