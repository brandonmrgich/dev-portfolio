// ---
// label: content collections config
// role: Schema for the /writing collection.
// invariants:
//   - Schema validation is the point. A post missing a date or description fails the
//     build rather than rendering a half-populated card, because the index page sorts
//     by date and the meta description comes from the summary.
//   - `source` is optional and holds the canonical original when a post is adapted from
//     a write-up that lives in another repo. Attribution should be data, not prose a
//     future edit can quietly drop.
// last-touched: 2026-08-10
// ---
import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    source: z
      .object({
        label: z.string(),
        url: z.string().url(),
      })
      .optional(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { writing }
