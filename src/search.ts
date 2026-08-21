import { counties } from './generated/counties.js'
import { constituencies } from './generated/constituencies.js'
import { wards } from './generated/wards.js'
import { normalize, similarity, tokenize } from './internal/text.js'
import type { Constituency, County, Level, SearchResult, Ward } from './types.js'

export interface SearchInit {
  /** Restrict to certain levels. Defaults to all three. */
  levels?: Level[]
  /** Maximum results. Defaults to 10. */
  limit?: number
  /** Minimum score in 0–1 for a result to be included. Defaults to 0.4. */
  threshold?: number
}

const LEVELS: { level: Level; items: readonly (County | Constituency | Ward)[] }[] = [
  { level: 'county', items: counties },
  { level: 'constituency', items: constituencies },
  { level: 'ward', items: wards },
]

// Counties are the answer people usually want when a name is ambiguous —
// "Kisumu" is a county, a constituency and a ward — so ties break upward.
const LEVEL_WEIGHT: Record<Level, number> = {
  county: 0.03,
  constituency: 0.015,
  ward: 0,
}

/**
 * Scores one candidate string against the query.
 *
 * Exact match wins outright, then prefix, then whole-token containment, and
 * only then fuzzy similarity. The tiers matter more than the numbers: typing
 * "kis" should surface Kisii and Kisumu ahead of anything that merely looks
 * similar to "kis".
 */
function score(query: string, candidate: string): number {
  const q = normalize(query)
  const c = normalize(candidate)
  if (!q || !c) return 0
  if (q === c) return 1
  if (c.startsWith(q)) return 0.9
  if (c.includes(q)) return 0.75

  const tokens = tokenize(candidate)
  if (tokens.some((token) => token.startsWith(q))) return 0.7

  const fuzzy = similarity(q, c)
  return fuzzy >= 0.7 ? fuzzy * 0.65 : 0
}

/**
 * Searches counties, constituencies and wards by name, slug or former name.
 *
 * Built for type-ahead inputs: partial queries are expected, and results come
 * back ranked with the level that matched so the caller can label them.
 *
 * ```ts
 * search('kis', { limit: 5 })
 * search('mbita')                       // finds Suba North by its former name
 * search('nairobi', { levels: ['ward'] })
 * ```
 */
export function search(query: string, init: SearchInit = {}): SearchResult[] {
  const { levels = ['county', 'constituency', 'ward'], limit = 10, threshold = 0.4 } = init
  const trimmed = query.trim()
  if (!trimmed) return []

  const wanted = new Set(levels)
  const results: SearchResult[] = []

  for (const { level, items } of LEVELS) {
    if (!wanted.has(level)) continue
    for (const region of items) {
      let best = 0
      let matched = region.name

      for (const candidate of [region.name, region.slug, ...region.aliases]) {
        const value = score(trimmed, candidate)
        if (value > best) {
          best = value
          matched = candidate
        }
      }
      if (best >= threshold) {
        results.push({ level, region, score: best + LEVEL_WEIGHT[level], matched })
      }
    }
  }

  results.sort((a, b) => b.score - a.score || a.region.name.localeCompare(b.region.name))
  return results.slice(0, limit).map((result) => ({
    ...result,
    score: Math.min(1, Number(result.score.toFixed(4))),
  }))
}
