import { subcounties as data } from './generated/subcounties.js'
import { normalize } from './internal/text.js'
import type {
  ConstituencyCode,
  County,
  CountyCode,
  SubCounty,
  WardCode,
} from './types.js'

/**
 * The national government sub-counties: the decentralised units headed by
 * Deputy County Commissioners.
 *
 * **The count here is 301, and the true current number is higher.** Sources
 * disagree and the register keeps moving:
 *
 * | Count | As of | Source |
 * | --- | --- | --- |
 * | 301 | shipped | The KNBS sub-county listing this data is built from. Independently matches the AfroCave table, which also totals 301. |
 * | 314 | 2023 | Wikipedia, published without a list. |
 * | 341 | Nov 2024 | 314 plus 27 sub-counties gazetted alongside 59 divisions, 170 locations and 322 sub-locations. |
 *
 * No authoritative machine-readable register of the current set is published,
 * and press lists of the 27 new units are unreliable, several printing 31 names
 * under a headline count of 27. Rather than guess, this ships the enumeration
 * it can fully source and records the rest in
 * `data/sources/subcounty-counts.json`.
 *
 * These form a second hierarchy of county → sub-county → ward, running
 * alongside the electoral one, and the two do not coincide. 248 of the 301
 * share a name with a constituency; 53 do not.
 *
 * ```ts
 * import { subCounties, getSubCountiesByCounty } from 'kenya-regions'
 *
 * subCounties.length                       // 301
 * getSubCountiesByCounty(35).map(s => s.name)
 * // Kericho: Ainamoi, Belgut, Bureti, Kipkelion East, Kipkelion West, Sigowet/Soin
 * ```
 *
 * Building a Kenyan address form? You almost certainly want `constituencies`
 * instead. That is what "sub-county" means on nearly every such form, because
 * the County Governments Act makes a county's decentralised units equivalent
 * to its constituencies.
 */
export const subCounties: readonly SubCounty[] = data

/** Finds a sub-county by slug or name. Names are unique across all 301. */
export function getSubCounty(query: string): SubCounty | undefined {
  const wanted = normalize(query)
  return data.find(
    (sub) => normalize(sub.slug) === wanted || normalize(sub.name) === wanted,
  )
}

/** Like {@link getSubCounty} but throws instead of returning `undefined`. */
export function requireSubCounty(query: string): SubCounty {
  const sub = getSubCounty(query)
  if (!sub) throw new Error(`Unknown sub-county: ${JSON.stringify(query)}`)
  return sub
}

/**
 * Sub-counties inside a county, alphabetically.
 *
 * Accepts a county code or a {@link County} object. To look one up by name,
 * resolve it with `getCounty` first, or use the same function from the main
 * entry, which accepts names.
 */
export function getSubCountiesByCounty(county: CountyCode | County): SubCounty[] {
  if (typeof county === 'string' && !/^\d+$/.test((county as string).trim())) {
    throw new TypeError(
      `Cannot resolve county ${JSON.stringify(county)} from ` +
        `'kenya-regions/subcounties', which does not bundle the county dataset. ` +
        `Either pass the numeric code, or import the same function from ` +
        `'kenya-regions', which accepts names.`,
    )
  }
  const code = typeof county === 'object' ? county.code : Number(county)
  return data.filter((sub) => sub.countyCode === code)
}

/** Ward codes belonging to a sub-county, or an empty array if it is unknown. */
export function getWardCodesBySubCounty(query: string): WardCode[] {
  return getSubCounty(query)?.wardCodes ?? []
}

/** Constituencies that share a name with a sub-county in the same county. */
export function getConstituencyCodeOfSubCounty(query: string): ConstituencyCode | null {
  return getSubCounty(query)?.constituencyCode ?? null
}

export type { SubCounty }
