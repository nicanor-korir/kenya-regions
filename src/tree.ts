import { getCounty } from './counties.js'
import { constituencies } from './generated/constituencies.js'
import { counties } from './generated/counties.js'
import { wards } from './generated/wards.js'
import type { Query } from './internal/lookup.js'
import type {
  Constituency,
  ConstituencyNode,
  County,
  CountyNode,
  Ward,
} from './types.js'

// Grouped once on first use rather than filtered per call: building the whole
// tree is O(n) this way instead of O(counties x constituencies x wards).
let wardsByConstituency: Map<number, Ward[]> | undefined
let constituenciesByCounty: Map<number, Constituency[]> | undefined

function groupBy<T>(items: readonly T[], key: (item: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>()
  for (const item of items) {
    const group = map.get(key(item))
    if (group) group.push(item)
    else map.set(key(item), [item])
  }
  return map
}

function ensureGroups() {
  wardsByConstituency ??= groupBy(wards, (ward) => ward.constituencyCode)
  constituenciesByCounty ??= groupBy(constituencies, (c) => c.countyCode)
}

function nest(county: County): CountyNode {
  ensureGroups()
  // The empty fallbacks below cannot fire: the data build refuses to emit a
  // county with no constituencies or a constituency with no wards, and
  // test/data.test.ts asserts both. They stay as a guard rather than a
  // non-null assertion, so a future data change degrades instead of throwing.
  /* v8 ignore next */
  const children = constituenciesByCounty!.get(county.code) ?? []
  return {
    ...county,
    constituencies: children.map((constituency): ConstituencyNode => ({
      ...constituency,
      /* v8 ignore next */
      wards: wardsByConstituency!.get(constituency.code) ?? [],
    })),
  }
}

/**
 * One county with its constituencies and their wards nested underneath.
 *
 * ```ts
 * const nairobi = getCountyTree('nairobi')
 * nairobi.constituencies[0].wards.length
 * ```
 */
export function getCountyTree(query: Query): CountyNode | undefined {
  const county = getCounty(query)
  return county ? nest(county) : undefined
}

/**
 * The whole devolved hierarchy: 47 counties, 290 constituencies, 1450 wards.
 *
 * Materialises roughly 1800 objects, so hold onto the result rather than
 * calling it inside a render.
 */
export function getTree(): CountyNode[] {
  return counties.map(nest)
}
